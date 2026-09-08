# 通路附着修正 · 2026-09-08

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
| PL / LU_RB* / UI_UB* | 软组织／功能性通路，保持原路径 |
| RI* | 等效通路不是逐块骨间肌的解剖重建，保持原路径 |

OP 另依据 [Elsevier Complete Anatomy](https://www.elsevier.com/resources/anatomy/muscular-system/muscles-of-upper-limb/opponens-pollicis-muscle/19520)：大多角骨结节及屈肌支持带区域至第一掌骨前外侧骨干。网站只近似表示其中骨性部分；没有屈肌支持带网格，也没有结节或附着足印的人工分割，不能宣称精确解剖附着已验证。

## 几何方法与局限

- 24 条通路、25 个端点进行区域约束拟合；13 条保留并记录原因。
- 先指定目标骨体，再限定基底／骨干区域并保持原路径所在侧；不在全手骨骼中盲选最近骨头。
- 区域由骨骼长轴的几何比例近似，不是受试者测量。OP 起点采用原掌侧路径附近的大多角骨表面，仍需专家确认结节附着足印。
- 只调整末端附近最多 12 mm 的路径。靠近目标骨面的部分使用约 0.85 mm 中心线间隙，端点落在骨面；保留远处肌腹、自由跨越段及原绕行关系。不是全手全姿态防穿透算法。
- 开启真实深度遮挡：骨后的通路不会再覆盖显示在骨头前面。箭头标签仍可用于选择通路。
- 右侧「起止位置」仍是原 SHM 模型所属骨体的名称，而不是修正后可视化的精确附着点坐标。
- 骨面贴合只证明显示几何接触，不证明解剖准确、力学合理或临床有效。若将来用于仿真，须在统一模型中重新验证力臂与运动范围。

复现：`npm run fit:attachments`。逐条原／新端点、目标骨体、位移、间隙及保留原因见 `attachment-audit.json`；原始 `model-data.js` 不变。
