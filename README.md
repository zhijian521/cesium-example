# Cesium 学习示例集

基于 [CesiumJS](https://cesium.com/platform/cesiumjs/) 的 3D 地球与地图可视化示例项目。

## 示例列表

| 示例 | 描述 | 在线预览 |
|------|------|----------|
| [Example01](./example01/index.html) | 上海陆家嘴 3D 场景，飞机环线飞行演示 | [查看](./example01/index.html) |
| [Example01-2](./example01-2/index.html) | Example01 的扩展示例 | [查看](./example01-2/index.html) |
| [Example02](./example02/index.html) | 机场空域 3D 可视化（虹桥/浦东） | [查看](./example02/index.html) |
| [Example03](./example03/index.html) | 飞机粒子特效（火焰/烟雾/气流） | [查看](./example03/index.html) |
| [Example04](./example04/index.html) | 雷雨云天气飞行演示（云/雨/闪电 + 预设切换） | [查看](./example04/index.html) |

## 示例说明

### Example01：飞机飞行演示
- 3D 建筑自定义着色器（扫描线效果）
- 飞机飞行动画与航线绘制
- 双击锁定相机跟随
- 滚轮缩放相机距离

### Example02：机场空域展示
- 虹桥（双跑道）与浦东（五跑道）B 类空域 3D 可视化
- 按《国家空域基础分类方法》分层展示
- 多层空域结构与显隐控制

### Example03：飞机粒子特效
- 飞机飞行过程中的粒子效果展示
- 支持多种视觉效果切换

### Example04：雷雨云天气飞行演示
- 在航线周边叠加雷雨天气（云团、细雨、闪电）
- 云层支持不规则灰阶云团与厚度增强
- 鼠标点击可穿透云层，优先选择飞机对象
- 支持天气预设切换：`drizzle`、`rainstorm`、`darkStorm`

## 快速开始

```bash
# 克隆项目
git clone <repository-url>
cd simple-cesium-example

# 启动本地服务
python -m http.server 8080

# 浏览器访问
http://localhost:8080
```

## 目录结构

```text
.
├─ index.html
├─ README.md
├─ example01/
├─ example01-2/
├─ example02/
├─ example03/
├─ example04/
│  ├─ index.html
│  ├─ css/style.css
│  ├─ js/main.js
│  ├─ js/weather-component.js
│  └─ model/
└─ public/
```

## 许可证

MIT License

