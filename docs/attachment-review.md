# 通路附着修正 · 第二轮复核 · 2026-09-08

## 后续文字复核

显示文案追加调整：按用户要求，解剖参考类条目的前缀简化为「起止位置」，不再显示括号。下文「解剖参考」仍指数据依据，不代表模型坐标通过精确配准；该依据保留在 `attachment-reference.js` 的 `basis` 和来源字段中。

本次仅重写页面名称和说明，未修改 `model-data.js`、`route-data.js`、拟合策略、控制表或原模型。下面的第二轮几何审计仍为历史事实，8 个模型锚点并未因为换了文案而得到验证。

页面不再显示「等效骨性支」「待核定」，而将有资料支持的对应结构单列为「起止位置（解剖参考）」。这是通路所对应的解剖参考，不是对显示坐标重新配准后的结论。保留的 `attachment-catalog.js` 几何分类与 `attachment-audit.json` 不作为这组新文案的数据源；新文案及来源见 `attachment-reference.js`。

- RI/UI 沿用桡侧／尺侧命名，不直接统一改名为背侧／掌侧骨间肌，依据 [2022 年术语更正](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0267620)。
- 依据 [UAMS 上肢肌肉表](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/) 的起止与手指侧别，推定用于页面的解剖对应：RI2/RI3 参考第一／第二背侧骨间肌；RI4/RI5 参考无名指／小指桡侧的掌侧骨间肌；UI_UB2 参考食指尺侧掌侧骨间肌—腱膜连接；UI_UB3/UI_UB4 参考第三／第四背侧骨间肌—尺侧腱膜连接。这些侧别对应不证明原模型各独立肌头已重建。
- 中指 RI3：第二、三掌骨相邻面至中指近节指骨基底桡侧及指背腱膜。中指 UI_UB3：第三、四掌骨相邻面至中指指背腱膜尺侧束；后一描述是肌肉—腱膜通路，不把其终点改写为直接骨性止点。
- LU_RB 参考 [蚓状肌解剖研究](https://pmc.ncbi.nlm.nih.gov/articles/PMC11571722/)：食指／中指起自各自指深屈肌腱桡侧；无名指／小指起自相邻指深屈肌腱，止于相应指背腱膜桡侧。FDS 各指列出整块指浅屈肌的概括起点和各指止点，不将整肌起点误认为各分腹独立起点；其分头存在变异，见 [50 前臂解剖研究](https://pmc.ncbi.nlm.nih.gov/articles/PMC6025501/)。
- UI_UB5 不作无依据的解剖对应。原 `myohand_body.xml` 去除注释后，`UI_UB5-P1` 属 `thirdmc`，`UI_UB5-P5` 属 `midph5`。页面名为「小指尺侧肌腱通路（模型）」，起止标为「模型坐标系：第三掌骨 → 小指中节指骨」；坐标系承载并不表示真实附着于这两块骨头。没有擅自改为小指展肌，也没有把它归入并不存在的常规小指尺侧掌侧骨间肌。

## 第二轮几何审计（保留）

范围：只修改网站中立位可视化。原始骨骼及路径数据保留；不修改 OpenSim 文件、力臂、活动范围或控制关联。不把修正后的图形当作 SHM 仿真几何。

## 核对与处理

以 [UAMS 上肢肌肉表](https://medicine.uams.edu/neuroscience/education/medical-school-courses/human-structure-module/anatomy-tables/muscle-tables/muscles-of-the-upper-limb/) 核对骨体和附着区域，并与本地 MyoHand 的路径端点所属骨体交叉检查。

| 通路 | 网站处理 |
| --- | --- |
| ECRL / ECRB / ECU | 分别贴合第二、三、五掌骨基底区域 |
| FCR / FCU | 保留模型的第二／第五掌骨分支；FCU 不删除经过腕部的原路径 |
| FDS2–5 | 中节指骨骨干区域 |
| FDP2–5 | 远节指骨基底区域 |
| EDC2–5 / EDM / EIP | 只拟合模型表示的远端腱膜终末分支，不把整块肌肉解释为直接附骨 |
| EPL / FPL / EPB / APL | 拇指远节、近节指骨或第一掌骨的相应基底区域 |
| FDP / EPL / EIP 起点 | 补拟合尺骨上的原始近端区域 |
| FPL / EPB / APL 起点 | 补拟合桡骨上的原始近端区域 |
| RI2 / RI3 | 补拟合掌骨及近节指骨上的等效骨性分支 |
| RI4 / RI5 | 补拟合近节指骨端；起点归属仍不确定，明确保留为等效锚点 |
| PL / LU_RB* / UI_UB* | 软组织／功能性通路，保持原路径并明确标注 |

OP 另依据 [Elsevier Complete Anatomy](https://www.elsevier.com/resources/anatomy/muscular-system/muscles-of-upper-limb/opponens-pollicis-muscle/19520)：大多角骨结节及屈肌支持带区域至第一掌骨前外侧骨干。网站只近似表示其中骨性部分；没有屈肌支持带网格，也没有结节或附着足印的人工分割，不能宣称精确解剖附着已验证。

## 几何方法与局限

- 第一轮只处理 25 个端点，遗漏了可见前臂骨性起点及部分 RI 附着，不能视为完整复核。
- 第二轮逐一核对 37 条通路的 74 个端点：28 条通路涉及 40 个骨面拟合端点；13 个端点的上臂骨骼不在当前画面模型内；13 个属于软组织等效端点；8 个为未解决的模型锚点。后三类不伪装为已贴骨。
- 先指定目标骨体，再限定基底／骨干区域并保持原路径所在侧；不在全手骨骼中盲选最近骨头。
- 区域由骨骼长轴的几何比例近似，不是受试者测量。OP 起点采用原掌侧路径附近的大多角骨表面，仍需专家确认结节附着足印。
- 只调整末端附近最多 12 mm 的路径。靠近目标骨面的部分使用约 0.85 mm 中心线间隙，端点落在骨面；保留远处肌腹、自由跨越段及原绕行关系。不是全手全姿态防穿透算法。
- 开启真实深度遮挡：骨后的通路不会再覆盖显示在骨头前面。箭头标签仍可用于选择通路。
- 增加与中心线端点同位置的圆形端帽，消除平口线段的视觉断头。实际页面的 37 组端点坐标与生成数据逐一比对；不只测试离线数据。
- 修正文字来源不一致：右侧「起止位置」现在描述左侧 MyoHand 可视化及其等效连接类型，不再用 SHM 的 `forearm` / `bone0` 名称冒充左图的精确附着位置。原始 SHM 映射仍存于 `endpoint-data.js`，未删除或改写。
- 骨面贴合只证明显示几何接触，不证明解剖准确、力学合理或临床有效。若将来用于仿真，须在统一模型中重新验证力臂与运动范围。

复现：`npm run fit:attachments`。逐条原／新端点、目标骨体、位移、间隙及保留原因见 `attachment-audit.json`；原始 `model-data.js` 不变。

## 本轮文献与未解决部分

- [Lee 等，2015，Finger Muscle Attachments for an OpenSim Upper-Extremity Model](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0121712)：附着点拟合同时考虑解剖测量、坐标转换、力臂和绕行；边界允许位于骨面与皮肤之间。因此，投影到骨面不等于重现原论文的力学验证。[2022 年更正](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0267620)也提醒不能把 RI/UI 命名直接等同于逐块背侧／掌侧骨间肌。
- [Eladoumikdachi 等，2002，Interossei](https://pubmed.ncbi.nlm.nih.gov/12360058/)：尸体研究描述多头骨间肌及骨、伸肌装置、掌板等不同终止结构；目前单线 RI 路径只代表等效骨性分支。
- [Anatomy of the Lumbrical Muscles: Implications for Mechanical Advantage](https://pmc.ncbi.nlm.nih.gov/articles/PMC11571722/)：尸体测量的蚓状肌起点在 FDP 肌腱，末端在指背腱膜。现有 LU_RB 是复合通路，缺少独立 FDP—蚓状肌接口和完整腱膜网格，本轮不捏造其骨性附着。

尚未解决：RI4/RI5 原始起点用第三掌骨坐标系承载，空间位置却更接近第四掌骨；不能仅凭“最近”改挂骨头。FDS2/FDS3 的前臂起点及 UI_UB 的近端也保留模型锚点身份。解决这些问题需重新确定通路拓扑／软组织连接，并验证力臂，不属于已完成的骨面接触修正。
