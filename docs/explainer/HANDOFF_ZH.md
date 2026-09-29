# 肌骨求解实验室交付说明

1. 新增两个入口：**OpenSim 肌腱求解**与**MyoHand 肌腱求解**，保留原来的肌腱控制。
2. OpenSim 展示 Scale、IK、ID、SO，并把 Moco 单独作为另一条路线；可调参数、观察三维结构、展开官方依据。
3. MyoHand 展示控制→激活→产力→传力→运动，接入真实 MuJoCo 脉冲及不同初始激活的对照回放。
4. 已补充 Fmax、最优肌纤维长度、肌腱松弛长度的交互实验；三种相关肌肉模型在详情中比较。
5. 这是教学网站，不是浏览器里的完整 OpenSim 求解器。界面分别标明“简化计算”“原生回放”“概念示意”。

## 打开

- 生产地址：https://tendon-control.vercel.app
- OpenSim：`/#opensim/overview`
- MyoHand：`/#myohand/activation`
- 本地：`npm start` 后打开 `http://localhost:4173`。

## 版本保护

- 原 main：`4adeee33ba52f18db119f263396e3f079aa2c891`
- 已推送备份：`backup/main-before-explainer-20260930-0016`
- 开发分支：`feat/opensim-myohand-explainer-20260930`
- 原工作目录中未提交的个性化功能保持不动，没有混入此次发布。

## 验收与证据

- [验收报告](QA_REPORT.md)：133项自动测试、浏览器实际交互、手机布局和局限。
- [科学审计](SCIENCE_AUDIT.md)与[数据发布审计](RELEASE_DATA_AUDIT.md)。
- [截图目录](screenshots/)；[原生 SO 证据](NATIVE_SO_AUDIT.md)；[MyoHand 审计](MYOHAND_AUDIT.md)。
- 此文件建立时本地验收完成；上线后的准确提交、Vercel状态与生产截图见后续发布记录，不能仅凭本文件判断部署成功。
