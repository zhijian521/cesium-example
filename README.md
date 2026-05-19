# Cesium 学习示例集

基于 [CesiumJS](https://cesium.com/platform/cesiumjs/) 的 3D 地球与地图可视化示例项目。

## 示例列表

| 示例 | 描述 | 在线预览 |
|------|------|----------|
| [Example01](./examples/01-flight-basic/index.html) | 上海陆家嘴 3D 场景，飞机圆形环线飞行演示 | [查看](./examples/01-flight-basic/index.html) |
| [Example01-2](./examples/01-flight-rounded/index.html) | 东方明珠圆角四边形航线飞行，支持转弯倾斜姿态与 ENU 近距跟随 | [查看](./examples/01-flight-rounded/index.html) |
| [Example01-3](./examples/01-flight-vtol/index.html) | VTOL 模型替换版，复用共享航线与场景模块 | [查看](./examples/01-flight-vtol/index.html) |
| [Example02](./examples/02-airspace/index.html) | 机场空域 3D 可视化（虹桥/浦东），玻璃拟态控制面板 | [查看](./examples/02-airspace/index.html) |
| [Example03](./examples/03-particles/index.html) | 飞机粒子特效（火焰/烟雾/气流），支持强度调节 | [查看](./examples/03-particles/index.html) |
| [Example04](./examples/04-weather/index.html) | 雷雨云天气飞行演示（云层/细雨/闪电 + 预设切换） | [查看](./examples/04-weather/index.html) |
| [Example04-2](./examples/04-weather-cloud/index.html) | rain-1 云模型独立加载与视角控制 | [查看](./examples/04-weather-cloud/index.html) |

## 示例说明

### 01-flight-basic：飞机飞行演示
- 3D 建筑自定义着色器（扫描线效果）
- 飞机飞行动画与航线绘制
- 双击锁定相机跟随 · 滚轮缩放
- 使用共享模块：SceneManager、CircularFlightPath、FlightTracker、TailEffect

### 01-flight-rounded：圆角四边形航线飞行
- 圆角四边形环线飞行 + 转弯倾斜姿态（banking）
- ENU 局部坐标系精确相机跟随（120m 近距）
- 使用共享模块：SceneManager、RoundedFlightPath、FlightTracker

### 01-flight-vtol：VTOL 模型替换
- 使用 `beta_alia_vtol_aircraft.glb` 模型
- 螺旋桨加速动画
- 复用 SceneManager + RoundedFlightPath 共享模块

### 02-airspace：机场空域展示
- 虹桥（双跑道）与浦东（五跑道）B 类空域 3D 可视化
- 按《国家空域基础分类方法》分层展示
- 多层空域结构与显隐控制
- 玻璃拟态控制面板 + 底部居中总览按钮
- 使用共享模块：SceneManager

### 03-particles：飞机粒子特效
- 双飞机航线上的粒子效果展示
- 支持火焰/烟雾/气流三种效果切换 + 强度调节
- 粒子物理模拟（浮力、湍流、抬升）
- 使用共享模块：SceneManager

### 04-weather：雷雨云天气飞行演示
- 在航线周边叠加雷雨天气（云团、细雨、闪电）
- 云层支持不规则云团与厚度增强
- 鼠标点击可穿透云层，优先选中飞机对象
- 支持天气预设切换：`drizzle`、`rainstorm`、`darkStorm`
- 使用共享模块：SceneManager

### 04-weather-cloud：rain-1 云模型加载
- 基于 Cesium 加载 `rain_1.glb` 云模型
- 底部居中玻璃拟态重置视角按钮
- 使用共享模块：SceneManager

## 架构

项目采用**共享模块 + 编排层**模式，所有示例的 `main.js` 仅保留业务逻辑：

```
shared/
├── styles/
│   └── flight-style.css          ← 玻璃拟态公共样式
├── config/
│   ├── cesium-config.js          ← Cesium 全局配置
│   ├── cesium-bootstrap.js       ← Viewer 启动助手
│   └── constants.js              ← 坐标、着色器、配置常量
├── SceneManager.js               ← 场景初始化 / 建筑 / 日夜切换
├── CircularFlightPath.js         ← 圆形航线 + 飞机实体
├── RoundedFlightPath.js          ← 圆角矩形航线 + banking 姿态
├── FlightTracker.js              ← 飞行面板 / 相机跟随 / 滚轮缩放
└── TailEffect.js                 ← 尾部预警波纹特效
```

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
    ├── styles/
    │   └── flight-style.css
    ├── config/
    │   ├── cesium-config.js
    │   ├── cesium-bootstrap.js
    │   └── constants.js
    ├── SceneManager.js
    ├── CircularFlightPath.js
    ├── RoundedFlightPath.js
    ├── FlightTracker.js
    └── TailEffect.js
```

## 许可证

MIT License
