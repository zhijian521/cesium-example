const SITE_CONFIG = {
  name: 'Cesium 三维地球示例集',
  description: '基于 CesiumJS 的 3D 地球可视化示例集，展示飞行航线、空域可视化、粒子特效和天气模拟',
  url: 'https://yuwb.cn/cesium/',
  baseUrl: '/cesium/',
  lang: 'zh-CN',
  author: '耶温',
  keywords: ['Cesium', 'CesiumJS', '3D地球', '飞行航线', '空域可视化', '粒子特效', '天气模拟'],
  ogImage: 'https://yuwb.cn/cesium/assets/home.png',
  examples: [
    {
      id: '01-flight-basic',
      title: '基础圆形航线',
      category: '飞行航线',
      categoryOrder: 1,
      description: '围绕东方明珠的圆形闭合航线飞行动画，展示基础航线绘制与飞机实体创建',
      tags: ['CircularFlightPath', 'TailEffect', 'FlightTracker'],
      path: './examples/01-flight-basic/'
    },
    {
      id: '01-flight-rounded',
      title: '圆角四边形航线',
      category: '飞行航线',
      categoryOrder: 1,
      description: '圆角矩形航线配合转弯倾斜姿态，ENU 近距相机跟随',
      tags: ['RoundedFlightPath', 'FlightTracker', 'Banking'],
      path: './examples/01-flight-rounded/'
    },
    {
      id: '01-flight-vtol',
      title: 'VTOL 倾转旋翼机',
      category: '飞行航线',
      categoryOrder: 1,
      description: '使用 Beta Alia VTOL 倾转旋翼机模型替换默认飞机',
      tags: ['RoundedFlightPath', 'VTOL', 'GLB'],
      path: './examples/01-flight-vtol/'
    },
    {
      id: '02-airspace',
      title: 'B 类空域可视化',
      category: '空域可视化',
      categoryOrder: 2,
      description: '虹桥与浦东机场 B 类空域分层 3D 可视化，含控制面板',
      tags: ['Airspace', 'SceneManager', '3D Volume'],
      path: './examples/02-airspace/'
    },
    {
      id: '03-particles',
      title: '飞机粒子特效',
      category: '粒子特效',
      categoryOrder: 3,
      description: '火焰、烟雾、气流粒子特效演示，含强度调节控制',
      tags: ['ParticleSystem', 'SceneManager'],
      path: './examples/03-particles/'
    },
    {
      id: '04-weather',
      title: '雷雨云天气',
      category: '天气模拟',
      categoryOrder: 4,
      description: '雷雨云团、细雨、闪电天气效果，含预设切换',
      tags: ['Weather', 'SceneManager', 'Cloud'],
      path: './examples/04-weather/'
    },
    {
      id: '04-weather-cloud',
      title: '云模型加载',
      category: '天气模拟',
      categoryOrder: 4,
      description: 'rain_1.glb 云模型独立加载与展示',
      tags: ['Cloud', 'GLB', 'SceneManager'],
      path: './examples/04-weather-cloud/'
    }
  ]
};
