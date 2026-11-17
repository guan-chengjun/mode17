/**
 * 程序化 F1 赛车模型
 * 用 Three.js 基础几何体拼装一辆结构完整的 F1 赛车，
 * 所有部件按 PART_INFO 的 id 注册，支持点击讲解、透视、爆炸与运转动画。
 *
 * 坐标系：X 轴为赛车前进方向（车头 +X），Y 轴向上，Z 轴为车宽方向。
 */
import * as THREE from 'three';
import { PART_INFO } from '../data/parts.js';

/* ---------------- 材质库 ---------------- */
const M = {
  body: new THREE.MeshStandardMaterial({ color: 0xe10600, roughness: 0.32, metalness: 0.25 }),
  carbon: new THREE.MeshStandardMaterial({ color: 0x17191f, roughness: 0.55, metalness: 0.45 }),
  carbonFlat: new THREE.MeshStandardMaterial({ color: 0x23262e, roughness: 0.6, metalness: 0.3 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x0d0e10, roughness: 0.92, metalness: 0.05 }),
  rim: new THREE.MeshStandardMaterial({ color: 0x9aa3b2, roughness: 0.28, metalness: 0.95 }),
  brakeDisc: new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.5, metalness: 0.85 }),
  caliper: new THREE.MeshStandardMaterial({ color: 0xd7261d, roughness: 0.4, metalness: 0.4 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xb8c0cc, roughness: 0.22, metalness: 0.9 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x4a515c, roughness: 0.35, metalness: 0.85 }),
  engine: new THREE.MeshStandardMaterial({ color: 0x8a919c, roughness: 0.35, metalness: 0.85 }),
  piston: new THREE.MeshStandardMaterial({ color: 0xd9dee6, roughness: 0.2, metalness: 0.95 }),
  gear: new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.3, metalness: 0.9 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x88aacc, transparent: true, opacity: 0.35,
    roughness: 0.05, metalness: 0.1, transmission: 0.4,
  }),
  visor: new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.15, metalness: 0.6 }),
  seat: new THREE.MeshStandardMaterial({ color: 0x20242c, roughness: 0.8 }),
  halo: new THREE.MeshStandardMaterial({ color: 0x111318, roughness: 0.4, metalness: 0.7 }),
};

/* 透视模式下会被处理为半透明的“外壳”材质 */
const BODY_MATERIALS = [M.body, M.carbonFlat, M.glass];

/* ---------------- 轻量几何辅助函数 ---------------- */
function box(w, h, d, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cyl(radius, length, material, axis = 'y', segments = 28, r2 = radius) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, r2, length, segments),
    material
  );
  // Cylinder 默认沿 Y 轴，按需要转向
  if (axis === 'z') mesh.rotation.x = Math.PI / 2;
  if (axis === 'x') mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function rodBetween(a, b, radius, material) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mesh = cyl(radius, len, material, 'y', 12);
  mesh.position.copy(a).addScaledVector(dir, 0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return mesh;
}

function taperedBox(length, rearW, frontW, rearH, frontH, material) {
  /** 沿 X 轴收窄的箱体（鼻锥 / 底板 / 引擎盖用） */
  const x0 = -length / 2, x1 = length / 2;
  const v = [
    x0, -rearH / 2, -rearW / 2,  x0, -rearH / 2, rearW / 2,
    x0, rearH / 2, rearW / 2,    x0, rearH / 2, -rearW / 2,
    x1, -frontH / 2, -frontW / 2, x1, -frontH / 2, frontW / 2,
    x1, frontH / 2, frontW / 2,   x1, frontH / 2, -frontW / 2,
  ];
  const idx = [
    0, 1, 2, 0, 2, 3,       // 后端面
    4, 7, 6, 4, 6, 5,       // 前端面
    0, 4, 5, 0, 5, 1,       // 底面
    3, 2, 6, 3, 6, 7,       // 顶面
    1, 5, 6, 1, 6, 2,       // 右面
    0, 3, 7, 0, 7, 4,       // 左面
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = mesh.receiveShadow = true;
  return mesh;
}

/* ============================================================
   主构建函数
   @returns {{ group, registry, animRefs, bodyMaterials, name }}
   ============================================================ */
export function buildProceduralCar() {
  const group = new THREE.Group();
  group.name = 'ProceduralF1Car';

  /** 部件注册表：id -> { id, label, roots:[Object3D], anchor:Vector3, isBody } */
  const registry = new Map();
  const rootsOf = new Map(); // root 对象 -> 部件 id（反向查找）

  function register(id, root, isBody = false) {
    if (!registry.has(id)) {
      registry.set(id, { id, label: PART_INFO[id].label, roots: [], anchor: new THREE.Vector3(), isBody: false });
    }
    const entry = registry.get(id);
    entry.roots.push(root);
    if (isBody) entry.isBody = true;
    rootsOf.set(root, id);
    root.traverse((o) => { o.userData.partId = id; });
  }

  /** 动画引用：Simulation 按类型驱动 */
  const animRefs = { wheels: [], brakes: [], pistons: [], crankshaft: null, gears: [], driveshafts: [], suspension: [] };

  /* ---------------- 车轮（含轮毂、刹车盘、卡钳） ---------------- */
  const WHEEL_Y = 0.42;
  const wheelPositions = [
    { x: 1.55, z: 1.02, front: true }, { x: 1.55, z: -1.02, front: true },
    { x: -1.45, z: 1.0, front: false }, { x: -1.45, z: -1.0, front: false },
  ];

  for (const wp of wheelPositions) {
    const wheelRoot = new THREE.Group();
    wheelRoot.position.set(wp.x, WHEEL_Y, wp.z);

    // 旋转组：轮胎 / 轮辋 / 辐条随车轮一起转
    const spinGroup = new THREE.Group();

    // 轮胎：绕 Z 轴的圆环
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.1, 20, 44), M.tire);
    tire.castShadow = tire.receiveShadow = true;
    spinGroup.add(tire);

    // 轮辋
    const rim = cyl(0.26, 0.2, M.rim, 'z', 32);
    spinGroup.add(rim);

    // 5 辐条
    for (let i = 0; i < 5; i++) {
      const spoke = box(0.05, 0.24, 0.06, M.rim);
      spoke.position.z = 0.02;
      spoke.rotation.z = (i / 5) * Math.PI * 2;
      spinGroup.add(spoke);
    }

    // 刹车盘（与车轮同速旋转，独立组以便单独驱动）
    const brakeGroup = new THREE.Group();
    const disc = cyl(0.2, 0.05, M.brakeDisc, 'z', 32);
    brakeGroup.add(disc);
    for (let i = 0; i < 8; i++) {
      const hole = box(0.035, 0.06, 0.06, M.darkMetal);
      const a = (i / 8) * Math.PI * 2;
      hole.position.set(Math.cos(a) * 0.13, Math.sin(a) * 0.13, 0);
      brakeGroup.add(hole);
    }
    // 卡钳（固定件，不随车轮旋转）
    const caliper = box(0.1, 0.16, 0.12, M.caliper, 0, 0.2, 0.14);
    wheelRoot.add(spinGroup, brakeGroup, caliper);

    group.add(wheelRoot);
    register('wheel', wheelRoot);
    register('brake', wheelRoot);
    animRefs.wheels.push(spinGroup);
    animRefs.brakes.push(brakeGroup);
    animRefs.suspension.push({ object: wheelRoot, baseY: WHEEL_Y, phase: wp.front ? 0.6 : 2.4 });
  }

  /* ---------------- 悬挂（双叉臂 + 推杆） ---------------- */
  const suspensionRoot = new THREE.Group();
  suspensionRoot.name = 'Suspension';
  for (const wp of wheelPositions) {
    const side = Math.sign(wp.z);
    const hub = new THREE.Vector3(wp.x, WHEEL_Y, wp.z);
    const upper = new THREE.Vector3(wp.x * 0.96, 0.78, side * 0.42);
    const lowerF = new THREE.Vector3(wp.x + 0.22, 0.32, side * 0.38);
    const lowerR = new THREE.Vector3(wp.x - 0.22, 0.32, side * 0.38);
    const pushTop = new THREE.Vector3(wp.x - 0.08, 0.86, side * 0.3);

    suspensionRoot.add(
      rodBetween(hub, upper, 0.022, M.carbon),
      rodBetween(hub, lowerF, 0.022, M.carbon),
      rodBetween(hub, lowerR, 0.022, M.carbon),
      rodBetween(hub, pushTop, 0.018, M.darkMetal)
    );
  }
  group.add(suspensionRoot);
  register('suspension', suspensionRoot);

  /* ---------------- 底盘 / 单体壳 / 底板 / 鼻锥 ---------------- */
  const chassisGroup = new THREE.Group();
  chassisGroup.name = 'Chassis';

  // 底板（平底 + 文丘里通道示意）
  const floor = taperedBox(4.4, 1.75, 1.15, 0.08, 0.06, M.carbon);
  floor.position.set(-0.1, 0.16, 0);
  chassisGroup.add(floor);
  for (const s of [-1, 1]) {
    chassisGroup.add(box(3.4, 0.12, 0.06, M.carbon, -0.25, 0.24, s * 0.82)); // 边缘围栏
    for (let i = 0; i < 4; i++) { // 底板涡流片 floor fences
      chassisGroup.add(box(0.34, 0.16, 0.02, M.carbonFlat, 0.55 + i * 0.18, 0.27, s * (0.3 + i * 0.12)));
    }
  }
  // 中央文丘里通道（深色凹槽示意）
  chassisGroup.add(box(2.6, 0.03, 0.5, M.carbonFlat, -0.3, 0.205, 0));

  // 单体壳
  const tub = taperedBox(2.0, 0.9, 0.5, 0.5, 0.36, M.body);
  tub.position.set(0.15, 0.5, 0);
  chassisGroup.add(tub);

  // 鼻锥
  const nose = taperedBox(1.7, 0.34, 0.12, 0.3, 0.12, M.body);
  nose.position.set(1.95, 0.42, 0);
  chassisGroup.add(nose);

  // 后部扩散器
  const diffuser = taperedBox(0.7, 1.5, 1.7, 0.3, 0.42, M.carbon);
  diffuser.position.set(-2.05, 0.28, 0);
  diffuser.rotation.z = 0.12;
  chassisGroup.add(diffuser);

  // 引擎盖（外壳，透视后可见引擎）
  const engineCover = taperedBox(1.9, 0.78, 0.3, 0.62, 0.4, M.body);
  engineCover.position.set(-0.85, 0.82, 0);
  chassisGroup.add(engineCover);
  // 引擎进气口
  const airbox = box(0.32, 0.26, 0.42, M.body, 0.02, 1.16, 0);
  chassisGroup.add(airbox);
  const intake = box(0.06, 0.16, 0.3, M.darkMetal, 0.2, 1.16, 0);
  chassisGroup.add(intake);

  group.add(chassisGroup);
  register('chassis', chassisGroup, true);

  /* ---------------- 前翼 ---------------- */
  const frontWing = new THREE.Group();
  frontWing.name = 'FrontWing';
  frontWing.add(box(0.55, 0.05, 2.35, M.body, 2.72, 0.2, 0));          // 主翼板
  frontWing.add(box(0.42, 0.04, 2.2, M.carbonFlat, 2.62, 0.28, 0, 0, 0, -0.1)); // 上层襟翼
  frontWing.add(box(0.3, 0.04, 1.6, M.carbon, 2.55, 0.35, 0, 0, 0, -0.18));     // 第三层
  for (const s of [-1, 1]) {
    frontWing.add(box(0.6, 0.34, 0.05, M.body, 2.7, 0.28, s * 1.16));   // 端板
    frontWing.add(box(0.5, 0.18, 0.03, M.carbon, 2.45, 0.4, s * 0.55)); // 内侧导流片
  }
  frontWing.add(box(0.5, 0.12, 0.14, M.carbon, 2.35, 0.3, 0));          // 中央连接
  group.add(frontWing);
  register('frontWing', frontWing, true);

  /* ---------------- 尾翼 ---------------- */
  const rearWing = new THREE.Group();
  rearWing.name = 'RearWing';
  for (const s of [-1, 1]) {
    rearWing.add(box(0.08, 0.55, 0.06, M.body, -2.35, 1.25, s * 0.55));  // 端板
    rearWing.add(box(0.5, 0.09, 0.06, M.carbon, -2.35, 1.05, s * 0.2));  // 支柱
  }
  rearWing.add(box(0.5, 0.06, 1.15, M.body, -2.35, 1.42, 0, 0, 0, 0.06));       // 主梁翼
  rearWing.add(box(0.42, 0.05, 1.08, M.body, -2.3, 1.52, 0, 0, 0, 0.16));       // DRS 襟翼
  rearWing.add(box(0.45, 0.05, 1.0, M.carbon, -2.28, 0.78, 0));                 // 梁翼
  group.add(rearWing);
  register('rearWing', rearWing, true);

  /* ---------------- 侧箱 / 散热通道 ---------------- */
  for (const s of [-1, 1]) {
    const sidepod = new THREE.Group();
    sidepod.name = s > 0 ? 'Sidepod_R' : 'Sidepod_L';
    const pod = taperedBox(1.7, 0.62, 0.4, 0.5, 0.28, M.body);
    pod.position.set(-0.45, 0.52, s * 0.62);
    sidepod.add(pod);
    sidepod.add(box(0.1, 0.34, 0.4, M.darkMetal, 0.45, 0.55, s * 0.62));   // 进气口
    for (let i = 0; i < 4; i++) {                                          // 散热百叶窗
      sidepod.add(box(0.06, 0.03, 0.34, M.carbon, -0.7 - i * 0.12, 0.79, s * 0.62));
    }
    sidepod.add(box(1.1, 0.16, 0.3, M.carbon, -0.3, 0.3, s * 0.66));       // 下切通道
    group.add(sidepod);
    register('sidepod', sidepod, true);
  }

  /* ---------------- 座舱 / Halo / 方向盘 ---------------- */
  const cockpit = new THREE.Group();
  cockpit.name = 'Cockpit';
  cockpit.add(box(0.62, 0.16, 0.5, M.seat, -0.15, 0.62, 0));                 // 座椅
  cockpit.add(box(0.18, 0.18, 0.34, M.carbonFlat, -0.05, 0.74, 0));          // 车手躯干示意
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 24, 18), M.body);
  helmet.position.set(0.12, 0.92, 0);
  helmet.castShadow = true;
  cockpit.add(helmet);
  cockpit.add(box(0.04, 0.07, 0.22, M.visor, 0.22, 0.92, 0));                // 头盔护目镜

  // Halo：中央立柱 + 环形保护圈（用圆环段近似）
  const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 12, 40), M.halo);
  haloRing.rotation.y = Math.PI / 2;
  haloRing.position.set(0.02, 0.95, 0);
  haloRing.scale.set(1, 1, 1.25);
  haloRing.castShadow = true;
  cockpit.add(haloRing);
  cockpit.add(rodBetween(new THREE.Vector3(0.32, 0.78, 0), new THREE.Vector3(0.18, 1.0, 0), 0.035, M.halo)); // 中央立柱

  // 方向盘
  const steering = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 10, 28), M.darkMetal);
  steering.rotation.y = Math.PI / 2;
  steering.position.set(0.42, 0.78, 0);
  cockpit.add(steering);
  cockpit.add(box(0.05, 0.05, 0.16, M.darkMetal, 0.4, 0.76, 0));

  group.add(cockpit);
  register('cockpit', cockpit, false);

  /* ---------------- 引擎：V6 活塞 + 曲轴 ---------------- */
  const engineGroup = new THREE.Group();
  engineGroup.name = 'Engine';

  const crank = cyl(0.06, 1.0, M.darkMetal, 'z', 20);
  crank.position.set(-0.85, 0.62, 0);
  engineGroup.add(crank);
  animRefs.crankshaft = crank;

  // 两排气缸（V 形 90°），每排 3 个活塞
  const pistons = [];
  for (const bank of [-1, 1]) {
    const bankAngle = bank * 0.72; // 绕 Z 轴倾斜
    for (let i = 0; i < 3; i++) {
      const x = -0.55 - i * 0.3;
      // 气缸壁（深色套筒）
      const sleeve = cyl(0.09, 0.42, M.darkMetal, 'y', 18);
      sleeve.position.set(x, 0.82, bank * 0.16);
      sleeve.rotation.z = bankAngle;
      engineGroup.add(sleeve);

      // 活塞（沿气缸倾斜轴向往复运动）
      const piston = cyl(0.07, 0.12, M.piston, 'y', 18);
      piston.position.set(x, 0.82, bank * 0.16);
      piston.rotation.z = bankAngle;
      engineGroup.add(piston);
      // 气缸轴线单位向量（绕 Z 倾斜 bankAngle 后的 Y 轴方向）
      const axis = new THREE.Vector3(-Math.sin(bankAngle), Math.cos(bankAngle), 0);
      pistons.push({ mesh: piston, base: piston.position.clone(), axis, phase: i * 1.1 + (bank > 0 ? Math.PI : 0) });

      // 连杆
      const conrod = rodBetween(
        new THREE.Vector3(x, 0.7, bank * 0.1),
        new THREE.Vector3(x, 0.86, bank * 0.17),
        0.018, M.metal
      );
      engineGroup.add(conrod);
    }
  }
  animRefs.pistons = pistons;

  // 涡轮增压器（发动机后方，绕 X 轴高速旋转）
  const turbo = cyl(0.12, 0.18, M.metal, 'x', 24);
  turbo.position.set(-1.45, 0.85, 0);
  engineGroup.add(turbo);
  animRefs.gears.push({ mesh: turbo, ratio: 0.45, axis: 'x' });

  group.add(engineGroup);
  register('engine', engineGroup, false);

  /* ---------------- 变速箱 + 传动轴 ---------------- */
  const gearboxGroup = new THREE.Group();
  gearboxGroup.name = 'Gearbox';
  const gbCase = taperedBox(0.6, 0.5, 0.42, 0.44, 0.4, M.carbon);
  gbCase.position.set(-1.72, 0.5, 0);
  gearboxGroup.add(gbCase);

  // 齿轮组（不同尺寸、不同齿数比）
  const gearSpecs = [
    { z: 0, r: 0.13, ratio: 1.0 },
    { z: 0.16, r: 0.1, ratio: 1.5 },
    { z: -0.16, r: 0.1, ratio: 1.5 },
    { z: 0.3, r: 0.075, ratio: 2.1 },
  ];
  for (const g of gearSpecs) {
    // 齿轮整体成组，保证齿纹与轮体同步旋转
    const gearGroup = new THREE.Group();
    gearGroup.position.set(-1.72, 0.5, g.z);
    const gear = cyl(g.r, 0.06, M.gear, 'z', 22);
    gearGroup.add(gear);
    // 齿纹
    for (let i = 0; i < 10; i++) {
      const tooth = box(0.03, 0.05, 0.07, M.gear);
      const a = (i / 10) * Math.PI * 2;
      tooth.position.set(Math.cos(a) * g.r, Math.sin(a) * g.r, 0);
      tooth.rotation.z = a;
      gearGroup.add(tooth);
    }
    gearboxGroup.add(gearGroup);
    animRefs.gears.push({ mesh: gearGroup, ratio: g.ratio, axis: 'z' });
  }
  group.add(gearboxGroup);
  register('gearbox', gearboxGroup, false);

  // 主传动轴：引擎 → 变速箱（绕 X 轴）
  const mainShaft = cyl(0.035, 0.75, M.metal, 'x', 16);
  mainShaft.position.set(-1.32, 0.5, 0);
  group.add(mainShaft);
  animRefs.driveshafts.push({ mesh: mainShaft, axis: 'x' });

  // 后半轴：变速箱 → 后轮（绕 Z 轴）
  for (const s of [-1, 1]) {
    const halfshaft = cyl(0.035, 0.75, M.metal, 'z', 16);
    halfshaft.position.set(-1.45, 0.42, s * 0.62);
    group.add(halfshaft);
    animRefs.driveshafts.push({ mesh: halfshaft, axis: 'z' });
    halfshaft.userData.partId = 'gearbox';
    registry.get('gearbox').roots.push(halfshaft);
    rootsOf.set(halfshaft, 'gearbox');
  }

  /* ---------------- 计算讲解锚点（包围盒中心） ---------------- */
  group.updateMatrixWorld(true);
  for (const entry of registry.values()) {
    const box3 = new THREE.Box3();
    for (const r of entry.roots) box3.expandByObject(r);
    box3.getCenter(entry.anchor);
  }

  return {
    name: '内置程序化 F1 赛车',
    group,
    registry,
    rootsOf,
    animRefs,
    bodyMaterials: BODY_MATERIALS,
    isProcedural: true,
  };
}
