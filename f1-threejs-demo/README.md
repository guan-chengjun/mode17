# F1 赛车 3D 交互演示（Three.js）

基于 **Three.js（ES Module + importmap）** 的一级方程式赛车交互式 3D 演示工程，HTML / JS / CSS 完全拆分，开箱即用：默认内置一辆程序化拼装的 F1 赛车，**无需下载任何模型即可运行**；同时支持加载网上开源的 GLB / GLTF 赛车模型。

## 功能一览

| # | 功能 | 说明 |
|---|------|------|
| 1 | 360° 自由观察 | OrbitControls：左键拖拽旋转、滚轮缩放、右键平移，可环绕任意角度 |
| 2 | 透视 / 剖切爆炸 | 实体 → 半透明透视（外壳透明、内部引擎/活塞可见）→ 爆炸分解视图，平滑过渡 |
| 3 | 运转模拟动画 | 车轮旋转、刹车盘同步、活塞往复、曲轴/传动轴转动、变速箱齿轮联动、悬挂振动；支持启停与调速滑块（1200–15000 RPM） |
| 4 | 部件点击讲解 | 射线拾取前翼/尾翼/悬挂/刹车/引擎/变速箱/底盘/侧箱/座舱/轮胎等，弹出悬浮卡片讲解作用、设计目的与空气动力学原理，卡片锚定 3D 部件并跟随镜头 |
| 5 | UI 控制面板 | 视图模式分段开关、模拟启停、转速滑块、重置视角、部件清单目录（点击自动聚焦镜头并选中零件） |
| ＋ | 外部模型加载 | 顶部下拉框支持在线 URL、本地 GLB/GLTF 文件（含 DRACO 压缩模型），按网格名称自动归类部件、自动归一化尺寸 |

## 目录结构

```
f1-threejs-demo/
├── index.html                  # 页面骨架 + importmap
├── css/
│   └── style.css               # 全部样式（F1 暗红控制台风格、响应式）
├── js/
│   ├── main.js                 # 入口：场景/灯光/控制器/主循环/模型热切换
│   ├── config.js               # 全局配置（模型地址、相机、透视/爆炸参数）
│   ├── data/
│   │   └── parts.js            # 10 大部件知识库 + 网格名称关键字匹配表
│   ├── models/
│   │   ├── ProceduralCar.js    # 内置程序化 F1 赛车（含活塞/齿轮等可动结构）
│   │   └── GltfCar.js          # 外部 GLB/GLTF 加载、部件识别、归一化
│   ├── simulation/
│   │   ├── Simulation.js       # 运转模拟引擎（统一转速驱动全部机构）
│   │   └── ViewManager.js      # 实体/透视/爆炸三态切换与平滑过渡
│   ├── interaction/
│   │   └── InteractionManager.js # 射线点击、高亮、镜头聚焦、卡片锚定
│   └── ui/
│       └── Panel.js            # 全部 DOM 交互与部件目录
├── models/                     # （自行创建）放下载的 GLB 模型
└── README.md
```

## 启动方式

ES Module 不能通过 `file://` 直接打开，需要一个静态服务器（任选一种）：

```bash
# 方式一：Python（多数系统自带）
cd f1-threejs-demo
python -m http.server 8080

# 方式二：Node.js（npx，无需全局安装）
npx serve . -l 8080

# 方式三：VS Code 安装 "Live Server" 插件，右键 index.html → Open with Live Server
```

浏览器打开 <http://localhost:8080> 即可。首次加载需联网获取 jsDelivr 上的 Three.js；之后浏览器有缓存。

## 加载自己的 F1 模型

### 方法 A：本地文件（最简单，推荐）

1. 下载 `.glb` 文件，放入工程的 `models/` 目录（没有就新建）；
2. 页面顶部下拉框选择 **“加载本地 GLB/GLTF 文件”**，在弹窗中选中文件；
   - 或直接修改 `js/config.js`：`localModelPath: './models/f1-car.glb'`。

### 方法 B：在线 URL

下拉框选择 **“加载在线 GLB 模型”**，粘贴直链后回车。要求该 URL 响应允许跨域（CORS），否则浏览器会拦截。把文件放到自己的静态服务器/同源目录最稳妥。

### 部件自动识别规则

加载外部模型后，程序按**网格名称关键字**（见 `js/data/parts.js` 的 `keywords`，支持中英文，如 `front wing / 前翼 / brake / tire / gearbox`）自动归类到 10 大部件；未命中的网格归为通用部件，仍可点击查看讲解。命名越规范，识别与爆炸视图效果越好。车轮、刹车盘、传动轴、齿轮也会按名称自动挂接动画。

## 开源 F1 GLB / GLTF 模型下载渠道

> 下载前请确认每个模型页面的 License（CC0 / CC-BY 等），商用需遵守署名要求。

- **Sketchfab（F1 分类，可下载 + 勾选 GLB/GLTF 格式过滤器）**
  <https://sketchfab.com/search?features=downloadable&q=f1&type=models>
- **poly.pizza（免费低模，glTF 直链，多为 CC-BY/CC0）**
  <https://poly.pizza/search/f1>
- **Quaternius（CC0 免费资产库，含赛车类）**
  <https://quaternius.com/>
- **Open3DModel（F1 3D 模型，部分含 glTF 导出）**
  <https://open3dmodel.com/?keyword=f1>
- **Khronos glTF 示例模型（验证加载链路用）**
  <https://github.com/KhronosGroup/glTF-Sample-Models>

## 操作说明

- **左键拖拽**：环绕旋转 ｜ **滚轮**：缩放 ｜ **右键拖拽**：平移
- **点击零件**：弹出讲解卡片并红色高亮（再次点击空白处或 ✕ 关闭）
- **部件清单**：点击目录项，镜头自动平滑聚焦到对应零件
- **剖切爆炸视图**：各部件沿远离车身中心方向分离，自动进入半透明以便观察内部
- **转速滑块**：实时改变模拟速度，面板同步显示虚拟 RPM

## 技术栈与依赖

- [three.js 0.160.0](https://github.com/mrdoob/three.js)（MIT）：渲染、GLTFLoader、DRACOLoader、OrbitControls、RoomEnvironment
- 原生 ES Module，无打包步骤、无 npm 依赖，纯静态托管即可部署

## 常见问题

1. **页面空白 / 控制台报模块加载错误** —— 确认是通过 `http://` 访问而非双击 `file://` 打开。
2. **在线模型加载失败** —— 多为 CORS 限制，改用本地文件方式。
3. **模型朝向/尺寸异常** —— 加载器会自动归一化到约 5.2 单位长并落地居中；若部件识别不全，可用 Blender 给网格按 `frontWing / rearWing / brake / wheel` 等命名后重新导出 GLB。
4. **DRACO 压缩模型** —— 已内置 DRACOLoader，解码器从 jsDelivr 加载，保持联网即可。
