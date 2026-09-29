// Chinese teaching copy; primary-source audit completed 2026-09-30 (Asia/Shanghai).
// The displayed anatomy, educational calculations and native fixtures have separate provenance.
const OS = 'https://opensimconfluence.atlassian.net/wiki/spaces/OpenSim/pages/';
const API = 'https://opensim-org.github.io/opensim-moco-site/docs/1.3.0/html_user/';
const SRC = 'https://github.com/opensim-org/opensim-core/blob/710e13be5/';

export const SOURCES = {
  'opensim-workflows': {title:'OpenSim · 工作流总览',url:OS+'53084226',section:'The Inverse Problem / The Forward Problem',note:'官方概念说明；逆向分析与正向仿真是不同问题。'},
  'opensim-scale': {title:'OpenSim · How Scaling Works',url:OS+'53089158',section:'Step 1–4；Marker Placement',note:'几何、质量/惯量及长度相关属性分步处理；肌力不会由 Scale 自动个性化。'},
  'opensim-marker-placer': {title:'OpenSim 4.4.1 · MarkerPlacer',url:SRC+'OpenSim/Tools/MarkerPlacer.cpp',section:'processModel：InverseKinematicsSolver；moveModelMarkersToPose',note:'静态姿态先作 IK 拟合；启用移动时，只重定位非 fixed 且有有效观测的模型标记点。'},
  'opensim-ik': {title:'OpenSim · How Inverse Kinematics Works',url:OS+'53090047',section:'Marker Errors / Weighted Least Squares Equation / Important Note about Units',note:'标记点和可选坐标的加权拟合。网页中的历史数值设置不作为本演示的求解器设置。'},
  'opensim-id': {title:'OpenSim · How Inverse Dynamics Works',url:OS+'53090079',section:'How Inverse Dynamics Works',note:'由已知运动与模型、外力求净广义力。'},
  'opensim-id-code': {title:'OpenSim 4.4.1 · InverseDynamicsTool',url:SRC+'OpenSim/Tools/InverseDynamicsTool.cpp',section:'run：lowpassIIR / GCVSplineSet / InverseDynamicsSolver',note:'按设置对坐标滤波，再建立可微样条；不是从单张姿态直接得到动态力矩。'},
  'opensim-so': {title:'OpenSim · How Static Optimization Works',url:OS+'53089619',section:'activation-to-force conditions；末段 inextensible tendon 说明',note:'官方 SO 的主动产力近似不同于完整前向肌肉动力学。'},
  'opensim-so-code': {title:'OpenSim 4.4.1 · StaticOptimizationTarget',url:SRC+'OpenSim/Analyses/StaticOptimizationTarget.cpp',section:'prepareToOptimize / computeAcceleration / objectiveFunc',note:'核对 use_muscle_physiology：启用时调用 calcInextensibleTendonActiveFiberForce(s,1)，否则使用最大等长肌力。'},
  'opensim-reserve': {title:'OpenSim · CoordinateActuator',url:API+'classOpenSim_1_1CoordinateActuator.html',section:'optimal_force；computeActuation',note:'辅助广义驱动器；控制与力/力矩通过 optimal_force 缩放。'},
  'opensim-millard': {title:'OpenSim · Millard2012EquilibriumMuscle',url:API+'classOpenSim_1_1Millard2012EquilibriumMuscle.html',section:'Detailed Description：三个配置选项',note:'此 API 页面标记 OpenSim 4.5；本地可用类在 4.4.1 另行核验。'},
  'opensim-thelen': {title:'OpenSim 4.4.1 · Thelen2003Muscle',url:SRC+'OpenSim/Actuators/Thelen2003Muscle.h',section:'类说明；calcInextensibleTendonActiveFiberForce 前的实现警告',note:'4.4.1 头文件仍提示 ignore_tendon_compliance 实现限制，不能凭继承属性承诺可任意切换。'},
  'opensim-degroote': {title:'OpenSim 4.4.1 · DeGrooteFregly2016Muscle',url:SRC+'OpenSim/Actuators/DeGrooteFregly2016Muscle.h',section:'类说明：explicit / implicit；Departures from the Muscle base class',note:'顺应性模式使用归一化肌腱力状态；隐式形式供支持隐式动力学的求解器使用。'},
  'opensim-moco': {title:'Moco · Theory Guide',url:API+'mocotheoryguide.html',section:'Optimal control problem / Prescribed kinematics / Direct collocation',note:'Moco 1.3.0 文档，API 标记 OpenSim 4.5；本页时间节点是概念示意。'},
  'moco-inverse': {title:'Moco · MocoInverse',url:API+'classOpenSim_1_1MocoInverse.html',section:'Detailed Description / Cost / Mesh interval',note:'规定运动学后求执行器行为；默认目标为控制平方和，可配置其他目标。'},
  'moco-track': {title:'Moco · MocoTrack',url:API+'classOpenSim_1_1MocoTrack.html',section:'Detailed Description / State and marker tracking',note:'通过代价项跟踪状态或标记点，同时优化运动学和控制。'},
  'myosuite': {title:'MyoSuite · 官方文档',url:'https://myosuite.readthedocs.io/en/latest/',section:'MyoSuite；具体环境与版本见原生回放清单',note:'MyoSuite 构建肌骨控制任务；策略选择动作不等于仿真器反解激活。'},
  'mujoco-muscle': {title:'MuJoCo 3.3.0 · Muscles',url:'https://mujoco.readthedocs.io/en/3.3.0/modeling.html#muscles',section:'Muscles / Length range',note:'解释肌肉参数和长度归一化；与当前原生回放的 MuJoCo 版本一致。'},
  'mujoco-computation': {title:'MuJoCo 3.3.0 · Computation',url:'https://mujoco.readthedocs.io/en/3.3.0/computation/index.html#actuation-model',section:'Actuation model：Transmission / Stateful actuators / Force generation',note:'传动、激活动力学和产力分别定义；不是网页动画的执行顺序。'},
  'mujoco-dynamics': {title:'MuJoCo 3.3.0 · 动力学与积分',url:'https://mujoco.readthedocs.io/en/3.3.0/computation/index.html',section:'General framework / Numerical integration / Simulation pipeline',note:'关节加速度受惯性、偏置力、被动力、外力和约束共同影响。'},
  'mujoco-fields': {title:'MuJoCo 3.3.0 · API types',url:'https://mujoco.readthedocs.io/en/3.3.0/APIreference/APItypes.html#mjdata',section:'mjData：ctrl / act / actuator_force / qfrc_actuator / qpos / qvel / qacc',note:'数组定义；稀疏传动力臂的读取必须匹配原生版本，不能盲目 reshape。'},
};

export const OPENSIM_STEPS = [
  {id:'overview',number:'00',title:'先看全局',question:'看到手在动，怎样推到肌肉？',summary:'先匹配手的尺寸，再还原动作、计算力矩，最后分配肌肉发力。外力是额外输入，不是从姿态猜出来的。',inputs:['手部关键点','通用模型','接触与重力'],outputs:['个体化模型','关节运动','肌肉激活估计'],details:[
    {title:'四个问题，不是一个黑盒',text:'Scale 问尺寸；IK 问关节怎样摆；ID 问需要多少净力；SO 问肌肉如何分担。箭头表达依赖关系，不要求每个工具都先导出一个独立文件。'},
    {title:'肌腱没有独立的「激活」',text:'这里估计的是肌肉激活。肌肉产生拉力，经肌腱通路跨关节传递；路径形状本身不是激活信号。'},
    {title:'页面中的三种证据',text:'原生求解回放来自已记录的引擎运行；简化计算展示明确公式；概念示意只解释关系。现有可视手不是所有原生模型的精确几何注册。'}],sourceIds:['opensim-workflows','opensim-scale','opensim-so']},
  {id:'scale',number:'01',title:'Scale · 调整尺寸',question:'这只手的骨头有多长？',summary:'用对应关键点间的距离调整骨段；观察骨骼、关节位置和肌肉路径如何一起改变。骨长不能直接告诉我们肌肉有多强。',inputs:['标记点距离','模板骨段','缩放规则'],outputs:['骨段几何','路径几何','长度相关参数'],details:[
    {title:'看一段骨头',text:'教学比例 s = 观测距离 / 模板距离。原生 Scale 可按骨段、方向和多组测量指定比例；不是把整只手统一拉大。21 个三维点共有 63 个坐标数值。'},
    {title:'跟着改变什么？',text:'关节框架、质心、附着点及包绕物按所属骨段处理。质量和惯量另受目标质量与质量分配设置影响。显示层的爆炸位移不参与物理计算。'},
    {title:'三种参数分开看',text:'Fmax（N）是主动肌力尺度；lopt（m）是最佳发力的参考纤维长度；lTS（m）是肌腱松弛参考长度。长度参数会按实现的缩放规则更新，Fmax 不由 Scale 自动个性化。'},
    {title:'可选：静态标记点校准',text:'ScaleTool 可用 MarkerPlacer 先拟合静态姿态，再将非 fixed、且有有效观测的模型标记点移到静态平均位置。移动结果保存为相对所属框架的位置；是否启用由配置决定，不是每种流程都移动标记点。'}],sourceIds:['opensim-scale','opensim-millard','opensim-marker-placer']},
  {id:'ik',number:'02',title:'IK · 拟合动作',question:'关节怎样摆，才能对上蓝点？',summary:'调整关节角，让模型上的点尽量贴近观测点。连线越短，拟合误差越小；可信度不同的点，可以使用不同权重。',inputs:['已缩放模型','关键点轨迹','点权重'],outputs:['关节坐标 q','标记点残差'],details:[
    {title:'优化的是什么？',text:'典型目标：Σ wi ‖xi(q) − yi‖²，可附加坐标跟踪项，并满足模型约束。yi 是观测点，xi(q) 是模型点；IK 输出的是关节坐标，不是肌肉激活。'},
    {title:'对应与单位',text:'观测点要先与模型标记点建立解剖对应。OpenSim 内部长度用 m、转角用 rad；网页角度可换算成 ° 显示。坐标权重与标记点权重并非同单位。'},
    {title:'静态校准与动态 IK',text:'完成静态标记点校准后，常规动态 IK 沿用同一套模型标记点局部位置，只随关节运动改变其世界位置；不逐帧重定位标记点来消除误差。'},
    {title:'噪声的代价',text:'某个点权重变大，模型更努力靠近它，但别的点未必同时更好。网页的单指拟合属于教学计算，不是 OpenSim IKTool 在浏览器中运行。'}],sourceIds:['opensim-ik','opensim-marker-placer']},
  {id:'id',number:'03',title:'ID · 计算净力矩',question:'这个动作，需要多大的净力矩？',summary:'运动、质量、重力和接触力一起决定关节需求。同一个姿态，换一个力或作用点，所需力矩也会改变。',inputs:['q、速度、加速度','质量与惯量','外力与作用点'],outputs:['所需净广义力','各关节力矩'],details:[
    {title:'力臂为什么重要？',text:'单轴例子：外力力矩 τext = (r × F) · e；单位 N·m。e 是正向关节轴。保持静止时，肌肉等内部作用需要抵消外力与重力。'},
    {title:'从局部到全身',text:'同一坐标系中的点力映射为 Qext = JᵀF；带自由力偶时还要加入旋转雅可比项，多处接触逐项相加。不能只把力大小乘一个无符号距离。'},
    {title:'动起来还缺什么？',text:'动态 ID 还需要速度、加速度与惯性项；加速度对观测噪声敏感。页面单指杠杆为准静态教学例子。净力矩不能直接等同肌肉力矩，须按配置计入被动与其他作用。'},
    {title:'轨迹怎样变成导数？',text:'4.4.1 的 IDTool 可先低通滤波，再用可微样条描述坐标。时间间隔、滤波与求导会影响速度和加速度；噪声可经求导放大并传到力矩。应检查轨迹及外力的同步，不用任意平滑制造低残差。'}],sourceIds:['opensim-id','opensim-id-code','opensim-workflows']},
  {id:'so',number:'04',title:'SO · 分配发力',question:'这么多肌肉，谁来分担？',summary:'在能解释力矩的方案中，按指定目标选择一组肌肉激活。紫色表示肌肉，琥珀色表示额外的 reserve；它不是另一条肌肉。',inputs:['运动与外力','肌肉容量和力臂','目标与边界'],outputs:['激活 a','肌肉力','辅助力矩'],details:[
    {title:'分配规则',text:'教学式：最小化 Σ aᵖ + reserve 代价，满足 R F + τreserve = τrequired。只有容量固定、约束线性且目标二次时才可称为 QP。目标改变，分配也可能改变。'},
    {title:'官方 SO 实际计算什么？',text:'OpenSim 4.4.1 启用 use_muscle_physiology 时，按当前长度/速度计算不可伸长肌腱下的主动容量；关闭时采用 Fmax。此容量不含并联被动纤维力，不积分激活动力学。'},
    {title:'reserve 与验收',text:'CoordinateActuator 的实际力/力矩 = control × optimal_force。control 无量纲，转动坐标的力矩为 N·m。5% 是项目可选判据，不是 OpenSim 通用规则；近零载荷坐标另报绝对值。'},
    {title:'为什么还要知道时间？',text:'SO 逐帧求分配，不代表动态力矩只需一张姿态。前面的动力学仍用运动导数。得到目标最优解，也不等于直接测出了人体的真实激活。'}],sourceIds:['opensim-so','opensim-so-code','opensim-reserve']},
  {id:'moco',number:'↗',title:'Moco · 联合整段',question:'相邻时刻，能不能一起约束？',summary:'把一段时间拆成节点，同时约束状态、控制和动力学。Moco 是另一条求解路线，不是做完 SO 后必须追加的一步。',inputs:['模型与任务','轨迹或边界','时间网格'],outputs:['状态轨迹','控制轨迹','约束残差'],details:[
    {title:'三种任务',text:'MocoInverse：规定运动学，求执行器行为。MocoTrack：尽量贴近参考状态或标记点，同时求运动与控制。自定义预测：给目标和约束，由优化寻找运动。'},
    {title:'节点不是独立帧',text:'直接配点把连续问题变成有限维优化，相邻节点通过动力学离散约束连接。网格变密不保证自动正确，仍需收敛与网格检验。这里动画是概念示意，不是已求解 Moco 轨迹。'},
    {title:'控制不等于激活',text:'存在激活动力学时，excitation 是输入，activation 是状态。是否包含肌腱顺应性以及使用何种肌肉状态，由肌肉类和求解配置决定。'}],sourceIds:['opensim-moco','moco-inverse','moco-track','opensim-degroote']},
];

export const MYOHAND_STEPS = [
  {id:'overview',number:'00',title:'从控制到动作',question:'给肌肉指令后，手为什么会动？',summary:'控制先改变激活；几何决定长度与力臂。它们共同影响肌力，最后经动力学更新动作。这是正向仿真，不是逐帧运行 SO。',inputs:['控制','当前状态','模型'],outputs:['力','下一时刻状态'],details:[{title:'两条支路汇合',text:'激活支路与路径几何支路都进入产力；这张图表示依赖，不是引擎函数的逐行执行次序。具体模型、版本和通道数见回放清单。'}],sourceIds:['myosuite','mujoco-computation']},
  {id:'control',number:'01',title:'控制指令',question:'谁在发出这次指令？',summary:'策略或用户给出动作，经环境约定的变换后写入控制。控制是一条指令，还不是激活，也不是肌力。',inputs:['策略／用户动作'],outputs:['ctrl'],details:[{title:'目标角度不自动变成控制',text:'跟踪目标姿态需要额外的策略或优化。MyoSuite 环境可能对动作归一化或变换；原生回放应记录变换前后，不把二者混称。'}],sourceIds:['myosuite','mujoco-fields']},
  {id:'activation',number:'02',title:'激活变化',question:'指令到了，肌肉会立刻跟上吗？',summary:'激活有自己的变化速度。对齐看控制与激活曲线，就能看到响应滞后；相同姿态不一定代表相同内部状态。',inputs:['ctrl','当前 act','时间常数'],outputs:['新的 act'],details:[{title:'内部记忆',text:'激活是动力学状态。两只处于相同 q、速度的手，若初始激活不同，给同样控制也可能产生不同短期运动。手动设置状态的示例需称为仿真干预，不是真人观测。'}],sourceIds:['mujoco-computation','mujoco-muscle']},
  {id:'geometry',number:'03',title:'路径与长度',question:'弯一个关节，哪些路径会变？',summary:'姿态决定路径，运动决定路径长度变化率。路径长度不是弹性肌腱的伸长量；跨过几个关节，就可能影响几个关节。',inputs:['qpos','qvel','附着与包绕'],outputs:['actuator_length','actuator_velocity'],details:[{title:'参考长度不是当前长度',text:'MuJoCo 根据 actuator_lengthrange 等参数建立肌肉长度归一化。不要直接把 OpenSim 的 lopt、lTS 公式套进来。空间路径可用于展示，但本页可视手与原生模型并非逐点注册。'}],sourceIds:['mujoco-muscle','mujoco-fields']},
  {id:'force',number:'04',title:'肌肉产力',question:'一样的激活，拉力也一样吗？',summary:'不一定。激活、当前长度和收缩速度共同决定主动产力；模型还可能包含被动项。看曲线时，把激活和牛顿分开。',inputs:['激活','长度／速度','肌肉参数'],outputs:['actuator_force'],details:[{title:'带符号的输出',text:'MuJoCo 肌肉拉力在执行器约定下可为负值，这是沿传动长度方向的符号，不是负的激活。图例若显示拉力大小，应明确标注取绝对值。'}],sourceIds:['mujoco-muscle','mujoco-computation']},
  {id:'transmission',number:'05',title:'跨关节传力',question:'一条肌肉怎样同时拉动几个关节？',summary:'肌力通过路径的力臂映射到关节。改变姿态，力臂也可能变化；同一条肌肉对不同关节的作用方向不一定相同。',inputs:['actuator_force','传动力臂'],outputs:['qfrc_actuator'],details:[{title:'映射式与单位',text:'对普通单输入单输出执行器，Qact = Σ ∇lᵢ(q) pᵢ。转动关节广义力单位为 N·m，平移关节为 N。数据阵列布局应按具体 MuJoCo 版本读取。'}],sourceIds:['mujoco-computation','mujoco-fields']},
  {id:'dynamics',number:'06',title:'动力学与接触',question:'拉力足够，就一定能按想法动吗？',summary:'还要一起考虑惯性、重力、被动力、碰撞与约束。肌肉力只是其中一部分；仿真器求出共同作用后的加速度。',inputs:['所有力','质量矩阵','接触／约束'],outputs:['qacc'],details:[{title:'不是只看肌肉',text:'广义形式 M(q)·v̇ + c(q,v) = τ + Jᵀf。τ 汇总执行器、被动及外加作用；接触约束通过求解器处理。演示箭头并不等于浏览器重新求解接触。'}],sourceIds:['mujoco-dynamics']},
  {id:'integration',number:'07',title:'积分更新动作',question:'这一刻怎样连到下一刻？',summary:'积分器用当前状态和导数推进时间，再进入下一轮控制。仿真步长与策略更新间隔是两回事。',inputs:['当前状态','导数','积分设置'],outputs:['新位置／速度／激活'],details:[{title:'两种时钟',text:'一个控制动作可保持若干仿真步。qpos 含自由或球关节四元数时，qvel 不是逐元素 qpos 导数；本页不把它们强行画成相同维度。'}],sourceIds:['mujoco-dynamics','mujoco-fields']},
];

export const MUSCLE_MODELS = [
  {id:'millard',name:'Millard 2012',summary:'可配置的平衡肌肉模型',details:'Millard2012EquilibriumMuscle：可配置激活动力学、刚性／顺应肌腱及纤维阻尼。完整前向模型含主动、被动和可能的阻尼项；官方 SO 调用的是不可伸长肌腱主动容量，不是把整个前向模型逐帧积分。',sourceIds:['opensim-millard','opensim-so-code']},
  {id:'thelen',name:'Thelen 2003',summary:'经典的激活＋纤维长度状态',details:'Thelen2003Muscle：传统平衡模型以激活和纤维长度描述动态状态。4.4.1 头文件对 ignore_tendon_compliance 留有实现警告，因此不承诺它与 Millard 的开关可互换；SO 有单独的不可伸长肌腱主动力计算入口。',sourceIds:['opensim-thelen','opensim-so-code']},
  {id:'degroote',name:'De Groote–Fregly 2016',summary:'面向优化的平滑肌肉模型',details:'DeGrooteFregly2016Muscle：顺应肌腱用归一化肌腱力作状态，可用显式或隐式动力学。隐式模式需要支持它的求解器（如 Moco），不能当作普通 Manager 前向积分模式。此处选择只切换说明，不重新运行肌肉模型。',sourceIds:['opensim-degroote','opensim-moco']},
];

export const GLOSSARY = [
  {key:'landmarks',name:'观测关键点',symbol:'y',unit:'m',category:'观测输入',meaning:'21 个 XYZ 点＝63 个标量；逐帧观测，不等同关节角。',usedBy:['Scale','IK'],sourceIds:['opensim-ik']},
  {key:'scale',name:'骨段缩放比',symbol:'s',unit:'无量纲',category:'共享模型参数',meaning:'按骨段和方向调整尺寸；不是肌力标定。',usedBy:['Scale'],sourceIds:['opensim-scale']},
  {key:'path',name:'路径点与包绕',symbol:'GeometryPath',unit:'m',category:'共享模型参数',meaning:'定义传力路径的几何；当前路径随姿态改变。',usedBy:['Scale','SO'],sourceIds:['opensim-scale']},
  {key:'mass',name:'质量与惯量',symbol:'m, I',unit:'kg；kg·m²',category:'共享模型参数',meaning:'影响加速需求；缩放受质量设置控制。',usedBy:['Scale','ID'],sourceIds:['opensim-scale','opensim-id']},
  {key:'fmax',name:'最大等长肌力',symbol:'Fmax',unit:'N',category:'共享模型参数',meaning:'最优长度、等长、充分激活时的主动肌力尺度。',usedBy:['SO','Moco'],sourceIds:['opensim-millard']},
  {key:'lopt',name:'最优肌纤维长度',symbol:'lopt',unit:'m',category:'共享模型参数',meaning:'最佳主动发力的参考纤维长度，不是当前长度。',usedBy:['Scale','SO','Moco'],sourceIds:['opensim-millard']},
  {key:'lts',name:'肌腱松弛长度',symbol:'lTS',unit:'m',category:'共享模型参数',meaning:'肌腱的松弛参考长度，不是路径总长或拉伸量。',usedBy:['Scale','SO','Moco'],sourceIds:['opensim-millard']},
  {key:'pennation',name:'羽状角',symbol:'α',unit:'rad',category:'模型参数／状态',meaning:'纤维与肌腱方向的夹角；参考值和当前值要分开。',usedBy:['SO','Moco'],sourceIds:['opensim-millard']},
  {key:'q',name:'关节坐标',symbol:'q',unit:'rad 或 m',category:'逐帧状态',meaning:'说明模型在哪里；并不能唯一说明内部如何发力。',usedBy:['IK','ID','SO'],sourceIds:['opensim-ik','opensim-id']},
  {key:'velocity',name:'广义速度',symbol:'v',unit:'rad/s 或 m/s',category:'逐帧状态',meaning:'运动变化速度；四元数位置需用专门的速度映射。',usedBy:['ID','Moco','MyoHand'],sourceIds:['opensim-id','mujoco-dynamics']},
  {key:'acceleration',name:'广义加速度',symbol:'v̇',unit:'rad/s² 或 m/s²',category:'导出量／状态导数',meaning:'动态 ID 所需；对轨迹噪声敏感。',usedBy:['ID','MyoHand'],sourceIds:['opensim-id']},
  {key:'external',name:'外力与作用点',symbol:'Fext, r',unit:'N；m',category:'观测／给定输入',meaning:'包括方向、作用体和坐标系；不能只输入一个力大小。',usedBy:['ID','SO','Moco'],sourceIds:['opensim-id']},
  {key:'gravity',name:'重力加速度',symbol:'g',unit:'m/s²',category:'给定环境参数',meaning:'无接触力不等于无重力。',usedBy:['ID','MyoHand'],sourceIds:['opensim-id','mujoco-dynamics']},
  {key:'torque',name:'净广义力',symbol:'Q / τ',unit:'N 或 N·m',category:'推断输出',meaning:'解释运动所需的净作用，尚未分给各条肌肉。',usedBy:['ID','SO'],sourceIds:['opensim-id']},
  {key:'activation',name:'肌肉激活',symbol:'a / act',unit:'无量纲',category:'状态／推断输出',meaning:'肌肉的激活程度；不是电信号测量值，也不是牛顿。',usedBy:['SO','Moco','MyoHand'],sourceIds:['opensim-so','mujoco-computation']},
  {key:'control',name:'兴奋／控制',symbol:'u / ctrl',unit:'按执行器定义',category:'控制输入',meaning:'发给执行器的指令；有激活动力学时与激活不同。',usedBy:['Moco','MyoHand'],sourceIds:['opensim-moco','mujoco-computation']},
  {key:'force',name:'肌肉／执行器力',symbol:'F / actuator_force',unit:'N（拉力传动）',category:'计算输出',meaning:'由模型产力关系给出；符号遵循对应引擎传动约定。',usedBy:['SO','MyoHand'],sourceIds:['opensim-so','mujoco-muscle']},
  {key:'reserve',name:'辅助驱动器',symbol:'τreserve',unit:'N 或 N·m',category:'推断输出',meaning:'补充未被肌肉承担的广义作用；不是肌肉或接触力。',usedBy:['SO','Moco'],sourceIds:['opensim-reserve']},
  {key:'optimal_force',name:'辅助力尺度',symbol:'optimal_force',unit:'N 或 N·m',category:'模型／求解配置',meaning:'把辅助 control 转为实际力；也会影响控制代价的相对惩罚。',usedBy:['SO','Moco'],sourceIds:['opensim-reserve']},
  {key:'momentarm',name:'力臂／传动梯度',symbol:'R / ∇l',unit:'取决于坐标',category:'逐帧计算量',meaning:'把标量肌力映射为广义力；不是固定不变的常数。',usedBy:['SO','MyoHand'],sourceIds:['opensim-so','mujoco-computation']},
  {key:'timeconstant',name:'激活时间常数',symbol:'τa, τd',unit:'s',category:'共享模型参数',meaning:'控制激活上升和下降的时间尺度；不要与力矩 τ 混淆。',usedBy:['Moco','MyoHand'],sourceIds:['opensim-millard','mujoco-muscle']},
  {key:'objective',name:'优化目标',symbol:'J',unit:'依目标定义',category:'求解选择',meaning:'规定怎样从兼容方案中作选择；不等同生理真值。',usedBy:['SO','Moco'],sourceIds:['opensim-so','opensim-moco']},
  {key:'tolerance',name:'容差与时间网格',symbol:'ε, Δt',unit:'按残差定义；s',category:'求解选择',meaning:'数值精度和离散设置，不是肌肉本身的参数。',usedBy:['SO','Moco'],sourceIds:['opensim-so-code','moco-inverse']},
];
