/**
 * 外部 GLB / GLTF 模型加载
 * - 通过网格名称关键字自动归类到 PART_INFO 中的部件
 * - 未识别的网格归入 generic（仍可点击讲解）
 * - 自动归一化尺寸、居中并落到地面
 * - 尝试自动发现可旋转的车轮组
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { PART_INFO, PART_ORDER } from '../data/parts.js';

const loader = new GLTFLoader();
// DRACO 解码支持（压缩过的 GLB 也能加载）
const draco = new DRACOLoader();
draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/draco/');
loader.setDRACOLoader(draco);

/** 按 PART_INFO 的 keywords 表做名称匹配 */
function matchPart(name) {
  const lower = name.toLowerCase();
  for (const id of PART_ORDER) {
    const kws = PART_INFO[id].keywords || [];
    if (kws.some((k) => lower.includes(k))) return id;
  }
  return 'generic';
}

/**
 * 加载 GLB/GLTF 并转换为与程序化模型一致的描述符
 * @param {string} url
 */
export async function loadGltfCar(url) {
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;

  /* 1. 网格归类与标记 */
  const partMeshes = new Map(); // id -> Mesh[]
  const allMaterials = new Set();

  root.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m && allMaterials.add(m));
      const id = matchPart(obj.name || '');
      obj.userData.partId = id;
      if (!partMeshes.has(id)) partMeshes.set(id, []);
      partMeshes.get(id).push(obj);
    }
  });

  /* 2. 归一化：整体缩放到 ~5.2 长，居中并落到 Y=0 */
  const rawBox = new THREE.Box3().setFromObject(root);
  const size = rawBox.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 5.2 / maxDim;

  const wrapper = new THREE.Group();
  wrapper.name = 'LoadedF1Car';
  wrapper.add(root);
  wrapper.scale.setScalar(scale);
  wrapper.updateMatrixWorld(true);

  const box3 = new THREE.Box3().setFromObject(wrapper);
  const center = box3.getCenter(new THREE.Vector3());
  wrapper.position.x -= center.x;
  wrapper.position.z -= center.z;
  wrapper.position.y -= box3.min.y;
  wrapper.updateMatrixWorld(true);

  /* 3. 构建注册表：每个部件的顶层根节点 + 讲解锚点 */
  const registry = new Map();
  const rootsOf = new Map();
  const partCenter = new THREE.Vector3();
  new THREE.Box3().setFromObject(wrapper).getCenter(partCenter);

  for (const [id, meshes] of partMeshes.entries()) {
    // 向上收集顶层根节点（wrapper 的直接子节点），爆炸视图按根节点分离
    const topRoots = new Set();
    const localBox = new THREE.Box3();
    for (const mesh of meshes) {
      localBox.expandByObject(mesh);
      let cur = mesh;
      while (cur.parent && cur.parent !== wrapper) cur = cur.parent;
      topRoots.add(cur);
    }
    const anchor = localBox.getCenter(new THREE.Vector3());
    const entry = { id, label: PART_INFO[id].label, roots: [...topRoots], anchor, isBody: false };
    registry.set(id, entry);
    for (const r of topRoots) rootsOf.set(r, id);
  }

  /* 4. 判定“外壳”部件：体积最大的若干结构件视为车身，透视时透明 */
  const bodyIds = new Set(['chassis', 'sidepod', 'frontWing', 'rearWing']);
  for (const id of registry.keys()) {
    if (bodyIds.has(id)) registry.get(id).isBody = true;
  }

  /* 5. 爆炸视图偏移：沿远离整车中心的方向分离 */
  const tmpBox = new THREE.Box3();
  for (const entry of registry.values()) {
    for (const r of entry.roots) {
      tmpBox.setFromObject(r);
      const c = tmpBox.getCenter(new THREE.Vector3());
      const dir = c.clone().sub(partCenter);
      dir.y = Math.max(dir.y, 0.35); // 保证至少向上抬一点
      if (dir.lengthSq() < 0.04) dir.set(0, 1, 0);
      r.userData.explodeDir = dir.normalize();
    }
  }

  /* 6. 动画引用：寻找名称含 wheel/tire 的组作为车轮；传动轴/齿轮按名称 */
  const animRefs = { wheels: [], brakes: [], pistons: [], crankshaft: null, gears: [], driveshafts: [], suspension: [] };
  root.traverse((obj) => {
    const n = (obj.name || '').toLowerCase();
    if (obj.isMesh || obj.isGroup) {
      if (/(wheel|tire|tyre|rim)/.test(n) && !animRefs.wheels.includes(obj)) {
        // 只取最外层同名组，避免父子重复
        let p = obj.parent;
        let parentAlsoWheel = false;
        while (p && p !== root) {
          if (/(wheel|tire|tyre|rim)/.test(p.name || '')) parentAlsoWheel = true;
          p = p.parent;
        }
        if (!parentAlsoWheel) animRefs.wheels.push(obj);
      }
      if (/(brake|disc|rotor)/.test(n)) animRefs.brakes.push(obj);
      if (/(shaft|axle|driveshaft|传动轴)/.test(n) && obj.isMesh) {
        animRefs.driveshafts.push({ mesh: obj, axis: 'x' });
      }
      if (/(gear|齿轮)/.test(n) && obj.isMesh) animRefs.gears.push({ mesh: obj, ratio: 1.4, axis: 'z' });
    }
  });

  // 收集可做透视处理的标准材质
  const bodyMaterials = [...allMaterials].filter((m) => m.isMeshStandardMaterial || m.isMeshPhysicalMaterial);

  return {
    name: '外部 GLB 模型',
    group: wrapper,
    registry,
    rootsOf,
    animRefs,
    bodyMaterials,
    isProcedural: false,
  };
}

/** 从 File 对象生成本地可用 URL（Blob，无需上传服务器） */
export function fileToObjectURL(file) {
  return URL.createObjectURL(file);
}
