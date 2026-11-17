/**
 * 应用主入口
 * 职责：创建场景/相机/渲染器/灯光/轨道控制器，
 * 连接 Panel、ViewManager、Simulation、InteractionManager，
 * 负责模型热切换与主渲染循环。
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { CONFIG } from './config.js';
import { buildProceduralCar } from './models/ProceduralCar.js';
import { loadGltfCar, fileToObjectURL } from './models/GltfCar.js';
import { ViewManager } from './simulation/ViewManager.js';
import { Simulation } from './simulation/Simulation.js';
import { InteractionManager } from './interaction/InteractionManager.js';
import { Panel } from './ui/Panel.js';

/* ---------------- 渲染器 / 场景 / 相机 ---------------- */
const canvas = document.getElementById('scene-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0d12);
scene.fog = new THREE.Fog(0x0b0d12, 12, 26);

// 环境贴图（提供 PBR 反射，无需外部 HDR 文件）
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(
  CONFIG.camera.fov, window.innerWidth / window.innerHeight, 0.1, 100
);
const DEFAULT_CAM_POS = new THREE.Vector3(...CONFIG.camera.position);
const DEFAULT_TARGET = new THREE.Vector3(...CONFIG.camera.target);
camera.position.copy(DEFAULT_CAM_POS);

/* ---------------- 轨道控制器：360° 自由观察 ---------------- */
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(DEFAULT_TARGET);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 1.6;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.92; // 允许看到底部但不翻到地面下
controls.update();

/* ---------------- 灯光 ---------------- */
scene.add(new THREE.HemisphereLight(0xbfd4ff, 0x1a1d26, 0.7));

const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
keyLight.position.set(5, 8, 4);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 25;
keyLight.shadow.camera.left = -6;
keyLight.shadow.camera.right = 6;
keyLight.shadow.camera.top = 6;
keyLight.shadow.camera.bottom = -6;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x88aaff, 1.1);
rimLight.position.set(-5, 4, -6);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xff4433, 0.8, 12);
fillLight.position.set(0, 2.2, 3.2);
scene.add(fillLight);

/* ---------------- 地面与网格 ---------------- */
const ground = new THREE.Mesh(
  new THREE.CircleGeometry(14, 72),
  new THREE.MeshStandardMaterial({ color: CONFIG.ground.color, roughness: 0.85, metalness: 0.2 })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(24, 48, CONFIG.ground.gridColor, 0x1a202c);
grid.material.transparent = true;
grid.material.opacity = 0.5;
scene.add(grid);

// 展示台圆环
const ring = new THREE.Mesh(
  new THREE.TorusGeometry(3.4, 0.015, 8, 120),
  new THREE.MeshBasicMaterial({ color: 0xe10600, transparent: true, opacity: 0.7 })
);
ring.rotation.x = Math.PI / 2;
ring.position.y = 0.02;
scene.add(ring);

/* ---------------- 核心模块 ---------------- */
const viewManager = new ViewManager();
const simulation = new Simulation();

let currentCar = null;
let interaction = null;
let objectUrlToRevoke = null;

const panel = new Panel({
  onViewMode: (mode) => viewManager.setMode(mode),
  onToggleSim: () => simulation.toggle(),
  onSpeed: (v) => simulation.setSpeed(v),
  onResetView: () => interaction?.resetCamera(DEFAULT_CAM_POS, DEFAULT_TARGET),
  onFocusPart: (id) => interaction?.focusPart(id),
  onSelectPart: (id) => interaction?.selectPart(id),
  onCloseInfo: () => interaction?.clearSelection(),
  onLoadProcedural: () => switchCar(() => buildProceduralCar()),
  onLoadUrl: (url) => switchCar(() => loadGltfCar(url), '正在下载在线 GLB 模型…'),
  onLoadFile: (file) => {
    objectUrlToRevoke = fileToObjectURL(file);
    switchCar(() => loadGltfCar(objectUrlToRevoke), `正在解析本地文件：${file.name}`);
  },
});

/* ---------------- 模型热切换 ---------------- */
async function switchCar(loaderFn, loadingText) {
  panel.showLoading(loadingText || '正在构建赛车模型…');
  try {
    const descriptor = await loaderFn();

    if (currentCar) scene.remove(currentCar.group);
    if (objectUrlToRevoke) {
      URL.revokeObjectURL(objectUrlToRevoke);
      objectUrlToRevoke = null;
    }

    currentCar = descriptor;
    scene.add(descriptor.group);
    // 调试 / 自动化测试钩子（不影响正常使用）
    window.__car = descriptor;

    viewManager.setCar(descriptor);
    simulation.setCar(descriptor);

    if (!interaction) {
      interaction = new InteractionManager(camera, renderer.domElement, descriptor, controls, panel.infoCard);
    } else {
      interaction.setCar(descriptor);
    }

    panel.buildCatalog(new Set(descriptor.registry.keys()));
    panel.hideLoading();
  } catch (err) {
    console.error(err);
    panel.hideLoading();
    alert(`模型加载失败：${err.message}\n\n请检查：\n1) URL 是否可直接访问且允许跨域（CORS）\n2) 文件是否为合法 .glb/.gltf\n3) 网络连接是否正常`);
  }
}

// 启动：默认加载内置程序化模型（离线可用）
switchCar(() => buildProceduralCar(), '正在初始化 3D 场景…');

/* ---------------- 自适应窗口 ---------------- */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ---------------- 主循环 ---------------- */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  simulation.update(dt);
  viewManager.update(dt);
  interaction?.update(dt);
  controls.update();

  panel.setRpm(simulation.rpm);
  renderer.render(scene, camera);
}
animate();
