/**
 * F1 部件知识库
 * id 同时用于：部件清单目录、点击讲解、模型网格名称关键字匹配
 * keywords 用于识别外部 GLB/GLTF 模型中对应名称的网格（小写匹配）
 */
export const PART_INFO = {
  frontWing: {
    label: '前翼',
    tag: '空气动力学',
    keywords: ['front wing', 'frontwing', '前翼', 'fw_', 'wing_front'],
    role: '前翼是赛车最前端的空气动力学组件，负责产生全车约 25%–30% 的下压力，并整理流向车身与底板的气流。',
    design: 'F1 前翼采用多层翼片与端板组合，在严格的规则盒（dimension box）内追求最大下压力与最小阻力的平衡；翼片角度可按每条赛道调校。',
    aero: '翼片采用倒置机翼剖面，气流通过时上慢下快，形成向下的压力差；端板抑制翼尖涡流并把气流向外“推”开，避免前胎激起的乱流（tyre wake）破坏底板吸力。',
  },
  rearWing: {
    label: '尾翼',
    tag: '空气动力学',
    keywords: ['rear wing', 'rearwing', '尾翼', 'rw_', 'wing_rear', 'drs'],
    role: '尾翼位于赛车尾部最高点，提供后部下压力以平衡前翼，并通过 DRS 可调翼片在直道上减小阻力。',
    design: '由主梁翼、襟翼（DRS 可开启）与高大的端板组成；高下压力赛道调大翼片角度，高速赛道则减小角度换取极速。',
    aero: '尾翼同样是倒置翼剖面，把赛车尾部“压”向地面；DRS 打开时襟翼与主梁齐平，阻力骤降，直道尾速可提升 10–15 km/h。',
  },
  suspension: {
    label: '悬挂系统',
    tag: '底盘机械',
    keywords: ['suspension', 'wishbone', 'pushrod', 'pullrod', '悬挂', 'rock', 'upright', 'trackrod', 'tie rod'],
    role: '悬挂连接车轮与底盘，决定轮胎与地面的接触姿态，是机械抓地力与空气动力学稳定性的根基。',
    design: 'F1 普遍采用双叉臂（double wishbone）+ 推杆/拉杆结构，把减震器与弹簧内置在车身内，降低非簧载质量并优化气流。',
    aero: '叉臂被设计为流线型截面，并精确控制外倾角（camber）与束角（toe），让轮胎在极限侧倾下仍保持最大接地面积，同时疏导刹车散热气流。',
  },
  brake: {
    label: '刹车系统',
    tag: '制动 / 热管理',
    keywords: ['brake', 'disc', 'caliper', '刹车', '制动', 'rotor'],
    role: '碳碳刹车盘可在数秒内把 300+ km/h 的赛车减速到弯速，刹车盘工作温度超过 1000°C。',
    design: '碳纤维复合材料刹车盘极轻且耐高温，卡钳通常为六活塞结构；刹车通风导管把冷却气流精确引导到刹车盘表面。',
    aero: '刹车散热气流是车身气流管理的一部分：热交换后的空气从轮毂排出，参与控制轮胎温度与轮周涡流，对整车气动效率影响显著。',
  },
  engine: {
    label: '动力单元（引擎）',
    tag: '动力系统',
    keywords: ['engine', 'motor', 'piston', 'crank', 'ice', '引擎', '发动机', '活塞', 'cylinder'],
    role: '现代 F1 动力单元为 1.6L V6 涡轮增压混动系统，综合输出超过 1000 马力，热效率超过 50%。',
    design: '由内燃机（ICE）、涡轮增压器、MGU-K、MGU-H、储能电池与电控组成；V6 两排气缸夹角 90°，活塞每冲程驱动曲轴输出动力。',
    aero: '引擎本身不产生下压力，但其散热需求决定了侧箱（sidepod）与散热通道的形状——气动设计必须在散热与减阻之间取舍。',
  },
  gearbox: {
    label: '变速箱',
    tag: '传动系统',
    keywords: ['gearbox', 'gear', 'transmission', '变速', '齿轮箱', 'differential'],
    role: '八速半自动无缝变速箱（seamless shift）把引擎动力传递到后轮，换挡时间仅需 2–3 毫秒，车手几乎无感知。',
    design: '变速箱壳体常用钛合金或碳纤维制造，后轮差速器集成在箱体内；它同时是后部碰撞结构与后悬挂的安装基座。',
    aero: '变速箱外壳的轮廓直接塑造车尾“可乐瓶”（coke bottle）收窄造型，引导气流快速汇聚到扩散器与尾翼区域。',
  },
  chassis: {
    label: '底盘 / 单体壳',
    tag: '安全 / 结构',
    keywords: ['chassis', 'monocoque', 'tub', 'floor', 'plank', 'nose', '底盘', '单体壳', '底板', '鼻锥'],
    role: '碳纤维单体壳是赛车的“脊椎”，承载所有部件并保护车手；底板与文丘里通道则是现代地效赛车最主要的下压力来源。',
    design: '单体壳采用多层碳纤维复合材料一体成型，重量仅几十公斤却能承受巨大碰撞载荷；底板下的文丘里通道在规则约束下被精密塑形。',
    aero: '气流在底板下方被加速形成低压区，把赛车“吸”向地面，可贡献全车 50% 以上的下压力；边缘涡封（edge wing / floor fence）阻止外侧高压气流泄漏进低压区。',
  },
  sidepod: {
    label: '散热通道 / 侧箱',
    tag: '热管理 / 气动',
    keywords: ['sidepod', 'radiator', 'cooling', '侧箱', '散热', 'intake', 'louvre'],
    role: '侧箱内部容纳散热器、中冷器与电子设备冷却器，外壳则是引导车身两侧气流的关键气动曲面。',
    design: '近年 F1 出现极端下切（undercut）侧箱设计，尽量把气流向下压向底板，散热口与百叶窗（louvre）按赛道温度调整开度。',
    aero: '侧箱上表面把气流导向尾翼与梁翼，下切通道则把高能气流输送给底板边缘和扩散器，冷却效率与气动性能在此高度耦合。',
  },
  cockpit: {
    label: '座舱 / Halo 保护系统',
    tag: '安全 / 人机工程',
    keywords: ['cockpit', 'halo', 'seat', 'steering', 'helmet', '座舱', '方向盘', '头盔', 'driver'],
    role: '座舱是车手的工作空间；Halo 钛合金保护环可承受约 12 吨载荷，在碰撞与飞散物事故中保护车手头部。',
    design: '座椅按车手身形定制，方向盘集成换挡、离合、差速器与数十项参数调节；Halo 经风洞优化以尽量降低气动干扰。',
    aero: 'Halo 与座舱开口周围的导流片（vanes）负责把气流引导至引擎进气口与侧箱，头盔外形也经过风洞测试以减小阻力与抖振。',
  },
  wheel: {
    label: '轮胎 / 轮毂',
    tag: '唯一接地点',
    keywords: ['wheel', 'tire', 'tyre', 'rim', '轮胎', '轮毂', 'p zero'],
    role: '轮胎是赛车与地面唯一的接触点，全部下压力与动力都要通过四块巴掌大的接地面积传递。',
    design: 'F1 使用 18 英寸低断面干地胎（C1–C5 五种配方）与雨胎；轮毂内有气流通道帮助控制胎温与刹车散热。',
    aero: '轮胎本身是巨大的阻力与乱流源，轮罩（wheel cover）与前翼端板的核心任务之一就是管理轮胎激起的尾流，减少对底板吸力的破坏。',
  },
  generic: {
    label: '赛车部件',
    tag: '结构件',
    keywords: [],
    role: '该部件属于赛车总成的一部分，参与整车的结构、气动或动力传递。',
    design: 'F1 的每一个零件都在重量规则（最低重量 798 kg）与强度要求之间反复优化，大量采用碳纤维、钛合金与金属 3D 打印工艺。',
    aero: '在现代 F1 中，几乎所有外露表面都经过计算流体力学（CFD）和风洞验证，整车气动效率以毫牛级别的阻力差异来衡量。',
  },
};

/** 部件清单目录的展示顺序 */
export const PART_ORDER = [
  'frontWing', 'rearWing', 'chassis', 'sidepod', 'cockpit',
  'engine', 'gearbox', 'suspension', 'brake', 'wheel',
];
