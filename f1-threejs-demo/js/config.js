/**
 * 全局配置
 * 注意：在线 GLB 模型所在服务器必须允许跨域（CORS），
 * 最稳妥的方式是把模型下载到 models/ 目录后使用相对路径，
 * 例如 modelUrl: './models/f1-car.glb'
 */
export const CONFIG = {
  // 默认使用内置程序化模型（无需下载任何资源，开箱即用）
  defaultModel: 'procedural',

  // 在线 GLB 模型地址（留空则下拉框选择“在线模型”时需手动粘贴 URL）
  modelUrl: '',

  // 本地模型目录约定：把 GLB 放到工程的 models/ 下即可
  localModelPath: './models/f1-car.glb',

  // Three.js 渲染与相机
  camera: {
    fov: 45,
    position: [4.6, 2.6, 5.4],
    target: [0, 0.55, 0],
  },

  // 场景地面
  ground: { color: 0x11151d, gridColor: 0x2a3344 },

  // 剖切爆炸视图：各部件沿自身方向的分离距离倍数
  explodeDistance: 1.35,

  // 透视模式外壳不透明度
  xrayOpacity: 0.16,
};
