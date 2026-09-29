# MANO：真实模型，本地使用

教学主入口已恢复。OpenSim / MyoHand 完整原生工作台在“深入了解 → 原生求解与调参”中，旧结果保留。

MANO 页不再绘制程序化示意手。使用用户已授权的 MANO PKL，在本地转换为 JSON 后加载真实表面。公开仓库不包含 MANO 网格、形状基或蒙皮权重。

## 加载

1. 本地服务：设置 `MANO_MODEL_JSON` 为转换结果的绝对路径，启动 `scripts/native-v2/server.mjs`。打开 MANO 页面时自动读取。
2. 公开网页：在 MANO 页选择本地 JSON。浏览器在本机解析、变形、绘制，不上传文件，也不存入网站服务器。

转换工具 `scripts/native-v2/export-mano-local.py` 的 `--loader` 指向已有 EgoPressure `egopressure/mano.py`，`--models` 指向本人授权的 MANO 模型目录，`--output` 必须在公开仓库之外。PKL 可执行代码，只能读取可信的本人模型，不能把访客上传的 PKL 交给服务执行。

## 实际计算

- 778 顶点、1538 三角面、16 关节。
- 十维形状参数开放前两个，其余为零。
- 姿态在平手零轴角与文件内 `hands_mean` 间插值，不将滑块解释为一个关节角。
- 形状混合 → 关节回归 → 轴角旋转与姿态修正 → 线性混合蒙皮。
- 指尖顶点 744 / 320 / 443 / 554 / 671；重排为腕、拇指、食指、中指、无名指、小指共 21 点。该点序是本页约定。
- 米为计算单位。展示相机只改变视角；变形页颜色来自蒙皮权重，不是肌肉激活。

未加载模型时保留原理与加载入口，不用虚构的手冒充输出。MANO 本身不包含肌肉求解器。

[MANO 官方项目](https://mano.is.tue.mpg.de/) · [官方许可](https://mano.is.tue.mpg.de/license.html) · [模型计算实现](https://github.com/vchoutas/smplx/blob/main/smplx/lbs.py)

许可限制模型再分发。取得额外书面授权之前，不向 GitHub 或生产网站上传转换数组或源权重。
