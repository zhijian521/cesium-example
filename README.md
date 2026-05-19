# Cesium 学习示例集

基于 [CesiumJS](https://cesium.com/platform/cesiumjs/) 的 3D 地球与地图可视化示例项目。

## 示例列表

| 示例 | 描述 | 在线预览 |
|------|------|----------|
| [Example01](./examples/01-flight-basic/index.html) | 上海陆家嘴 3D 场景，飞机环线飞行演示 | [查看](./examples/01-flight-basic/index.html) |
| [Example01-2](./examples/01-flight-extended/index.html) | Example01 的扩展示例 | [查看](./examples/01-flight-extended/index.html) |
| [Example01-3](./examples/01-flight-rounded/index.html) | 东方明珠圆角四边形航线飞行，支持转弯倾斜姿态与近距跟随视角 | [查看](./examples/01-flight-rounded/index.html) |
| [Example01-4](./examples/01-flight-vtol/index.html) | VTOL 模型替换版，保留飞行演示与跟随视角 | [查看](./examples/01-flight-vtol/index.html) |
| [Example02](./examples/02-airspace/index.html) | 机场空域 3D 可视化（虹桥/浦东） | [查看](./examples/02-airspace/index.html) |
| [Example03](./examples/03-particles/index.html) | 飞机粒子特效（火焰/烟雾/气流） | [查看](./examples/03-particles/index.html) |
| [Example04](./examples/04-weather/index.html) | 雷雨云天气飞行演示（云层/细雨/闪电 + 预设切换） | [查看](./examples/04-weather/index.html) |
| [Example04-2](./examples/04-weather-cloud/index.html) | Example04 扩展：rain-1 云模型加载 | [查看](./examples/04-weather-cloud/index.html) |

## 示例说明

### 01-flight-basic：飞机飞行演示
- 3D 建筑自定义着色器（扫描线效果）
- 飞机飞行动画与航线绘制
- 双击锁定相机跟随
- 滚轮缩放相机距离

### 01-flight-extended：扩展示例
- 基于基础飞行的扩展功能演示

### 01-flight-rounded：圆角四边形航线飞行
- 东方明珠圆角四边形环线飞行
- 飞机转弯时带倾斜姿态
- 跟随视角更贴近机身

### 01-flight-vtol：VTOL 模型替换
- 在不改动航线和视角逻辑的前提下替换飞机模型
- 使用 `beta_alia_vtol_aircraft.glb` 演示新机型与动画调整

### 02-airspace：机场空域展示
- 虹桥（双跑道）与浦东（五跑道）B 类空域 3D 可视化
- 按《国家空域基础分类方法》分层展示
- 多层空域结构与显隐控制

### 03-particles：飞机粒子特效
- 飞机飞行过程中的粒子效果展示
- 支持火焰/烟雾/气流等多种视觉效果切换

### 04-weather：雷雨云天气飞行演示
- 在航线周边叠加雷雨天气（云团、细雨、闪电）
- 云层支持不规则云团与厚度增强
- 鼠标点击可穿透云层，优先选中飞机对象
- 支持天气预设切换：`drizzle`、`rainstorm`、`darkStorm`

### 04-weather-cloud：rain-1 云模型加载
- 基于 Cesium 加载 `rain_1.glb` 云模型
- 提供一键重置视角，便于查看模型细节

## 快速开始

```bash
# 克隆项目
git clone <repository-url>
cd cesium-example

# 启动本地服务
python -m http.server 8080

# 浏览器访问
http://localhost:8080
```

## 目录结构

```text
.
├── index.html
├── README.md
├── examples/
│   ├── 01-flight-basic/
│   ├── 01-flight-extended/
│   ├── 01-flight-rounded/
│   ├── 01-flight-vtol/
│   ├── 02-airspace/
│   ├── 03-particles/
│   ├── 04-weather/
│   └── 04-weather-cloud/
├── assets/
│   ├── images/
│   └── models/
│       ├── shidi/
│       ├── beta-alia/
│       └── weather/
└── shared/
    ├── cesium-config.js
    ├── cesium-bootstrap.js
    └── constants.js
```

## 许可证

MIT License
