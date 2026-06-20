# 主页样式优化 + SEO 设计规格

> 日期：2026-06-20
> 状态：已批准
> 部署地址：https://yuwb.cn/cesium/

## 1. 目标

将 cesium-example 主页从当前"中式纸张装订"风格，完全对齐知简 (Zhijian) 项目的"文人书斋 · 水墨宣纸"设计系统，同时完成全套 SEO 优化，并将部署地址等站点信息抽取为独立配置文件。

## 2. 设计系统 Token（对齐知简）

### 2.1 配色

| 变量 | 值 | 用途 |
|------|-----|------|
| `--primary` | `#9f000f` | 朱砂红，品牌色、标题强调、边框、按钮 |
| `--primary-hover` | `#c41e3a` | 按钮按压态 |
| `--primary-foreground` | `#ffffff` | 主色上的白字 |
| `--foreground` | `#1d1b20` | 浓墨，正文标题 |
| `--muted-foreground` | `#6f655c` | 淡墨，副文描述 |
| `--background` | `#fbf9f9` | 温白纸，页面底色 |
| `--highlight` | `#faf7f4` | 卡片 hover 底色 |
| `--muted` | `#f6efe7` | 米黄宣纸，次级背景 |
| `--secondary` | `#f3ece4` | 旧纸色，斑马纹 |
| `--border` | `#e7ddd1` | 驼色，通用边框 |
| `--input` | `#d9cbbc` | 输入框边框 |
| `--accent` | `#e6efe5` | 青苔绿，hover 点缀 |
| `--accent-foreground` | `#31483f` | 青苔绿上的深色文字 |
| `--accent-warm` | `#f5e6e6` | 朱砂洗色，分类卡片底色 |
| `--selection` | `rgba(182, 72, 43, 0.18)` | 文字选中背景 |

### 2.2 字体

| 用途 | 字体栈 |
|------|--------|
| 标题/装饰 (serif) | `'Noto Serif SC', 'Songti SC', 'STSong', Georgia, serif` |
| 正文/UI (sans) | `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif` |
| 代码 (mono) | `'SF Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', monospace` |

### 2.3 排版规格

| 元素 | 规格 |
|------|------|
| Hero 标题 | `font-serif`, `clamp(2.75rem, 6vw, 4.75rem)`, `line-height: 1.2`, `letter-spacing: 0.04em` |
| 分类标题 | `font-serif`, `2rem`, `line-height: 1.3`, `font-weight: 600`, `border-left: 4px solid var(--primary)`, `padding-left: 1.5rem` |
| 卡片标题 | `font-serif`, `1.375rem`, `line-height: 1.5` |
| 正文段落 | `1rem`, `line-height: 1.85` |
| Kicker 标签 | `0.6875rem`, `letter-spacing: 0.3em`, `uppercase`, `color: var(--primary)` |
| 副文/描述 | `0.875rem`, `line-height: 1.85`, `color: var(--muted-foreground)` |

### 2.4 间距与布局

| 场景 | 规格 |
|------|------|
| 内容区 | `max-width: 80rem`, `padding: 4rem 1.5rem 5rem` |
| 导航栏 | `height: 4rem`, `max-width: 80rem` |
| 卡片网格 | `repeat(3, 1fr)`, `gap: 1rem` |
| 分区间距 | `margin-top: 3rem` |

### 2.5 交互规格

| 元素 | 正常态 | Hover | 按压 |
|------|--------|-------|------|
| 主按钮 | `bg: var(--primary)`, `color: #fff` | `bg: var(--primary-hover)` | `scale(0.98)` |
| 卡片 | `border: 1px solid var(--primary)` | `border-color: rgba(159,0,15,0.4)`, `translateY(-2px)` | — |
| 导航链接 | `color: var(--muted-foreground)` | `color: var(--foreground)`, `bg: var(--secondary)` | — |

- 统一过渡：`0.2s ease`
- 零圆角全局：`border-radius: 0`

## 3. 页面结构

### 3.1 整体布局

```
导航栏 → Hero 区域 → 分类卡片区域（4 组） → 页脚
```

### 3.2 导航栏

- 高度 4rem，`max-width: 80rem` 居中
- 左侧：站名「Cesium 示例集」（衬线体，朱砂红色）
- 右侧：GitHub 链接（幽灵按钮风格）
- 底部 `border-bottom: 1px solid var(--border)`

### 3.3 Hero 区域

- `max-width: 80rem`, `padding: 4rem 1.5rem 3rem`
- Kicker 标签：「CesiumJS 1.112」
- 大标题：「Cesium 三维地球示例集」（衬线体，clamp 响应式）
- 描述段落：1-2 句项目介绍
- CTA 按钮：「浏览示例 ↓」（主按钮，锚点到卡片区域）

### 3.4 分类卡片区域

4 个分类，每个分类有标题（左侧朱砂红线）+ 卡片网格：

| 分类 | 示例 | 卡片数 |
|------|------|--------|
| 飞行航线 | 01-flight-basic, 01-flight-rounded, 01-flight-vtol | 3 |
| 空域可视化 | 02-airspace | 1 |
| 粒子特效 | 03-particles | 1 |
| 天气模拟 | 04-weather, 04-weather-cloud | 2 |

### 3.5 卡片设计

- 零圆角矩形，`border: 1px solid var(--primary)`
- 内容：Kicker（分类标签）+ 衬线体标题 + 描述 + 技术标签
- Hover：边框色渐变 + `translateY(-2px)`
- 网格：3 列，768px 降 2 列，480px 降 1 列

### 3.6 页脚

- `border-top: 1px solid var(--border)`
- 居中：© 2026 yuwb.cn · Powered by CesiumJS
- `color: var(--muted-foreground)`, `0.875rem`

## 4. 站点配置文件

### 4.1 文件：`site.config.js`

```javascript
const SITE_CONFIG = {
  name: 'Cesium 三维地球示例集',
  description: '基于 CesiumJS 的 3D 地球可视化示例集，展示飞行航线、空域可视化、粒子特效和天气模拟',
  url: 'https://yuwb.cn/cesium/',
  baseUrl: '/cesium/',
  lang: 'zh-CN',
  author: '耶温',
  keywords: ['Cesium', 'CesiumJS', '3D地球', '飞行航线', '空域可视化', '粒子特效', '天气模拟'],
  ogImage: '/cesium/assets/images/og-cover.png',
  examples: [
    {
      id: '01-flight-basic',
      title: '基础圆形航线',
      category: '飞行航线',
      categoryOrder: 1,
      description: '围绕东方明珠的圆形闭合航线飞行动画，展示基础航线绘制与飞机实体创建',
      tags: ['CircularFlightPath', 'TailEffect', 'FlightTracker'],
      path: '/cesium/examples/01-flight-basic/'
    },
    {
      id: '01-flight-rounded',
      title: '圆角四边形航线',
      category: '飞行航线',
      categoryOrder: 1,
      description: '圆角矩形航线配合转弯倾斜姿态，ENU 近距相机跟随',
      tags: ['RoundedFlightPath', 'FlightTracker', 'Banking'],
      path: '/cesium/examples/01-flight-rounded/'
    },
    {
      id: '01-flight-vtol',
      title: 'VTOL 倾转旋翼机',
      category: '飞行航线',
      categoryOrder: 1,
      description: '使用 Beta Alia VTOL 倾转旋翼机模型替换默认飞机',
      tags: ['RoundedFlightPath', 'VTOL', 'GLB'],
      path: '/cesium/examples/01-flight-vtol/'
    },
    {
      id: '02-airspace',
      title: 'B 类空域可视化',
      category: '空域可视化',
      categoryOrder: 2,
      description: '虹桥与浦东机场 B 类空域分层 3D 可视化，含控制面板',
      tags: ['Airspace', 'SceneManager', '3D Volume'],
      path: '/cesium/examples/02-airspace/'
    },
    {
      id: '03-particles',
      title: '飞机粒子特效',
      category: '粒子特效',
      categoryOrder: 3,
      description: '火焰、烟雾、气流粒子特效演示，含强度调节控制',
      tags: ['ParticleSystem', 'SceneManager'],
      path: '/cesium/examples/03-particles/'
    },
    {
      id: '04-weather',
      title: '雷雨云天气',
      category: '天气模拟',
      categoryOrder: 4,
      description: '雷雨云团、细雨、闪电天气效果，含预设切换',
      tags: ['Weather', 'SceneManager', 'Cloud'],
      path: '/cesium/examples/04-weather/'
    },
    {
      id: '04-weather-cloud',
      title: '云模型加载',
      category: '天气模拟',
      categoryOrder: 4,
      description: 'rain_1.glb 云模型独立加载与展示',
      tags: ['Cloud', 'GLB', 'SceneManager'],
      path: '/cesium/examples/04-weather-cloud/'
    }
  ]
};
```

## 5. SEO 方案

### 5.1 Meta 标签

```html
<title>Cesium 三维地球示例集 | yuwb.cn</title>
<meta name="description" content="基于 CesiumJS 的 3D 地球可视化示例集...">
<meta name="keywords" content="Cesium, CesiumJS, 3D地球, ...">
<meta name="author" content="耶温">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<link rel="canonical" href="https://yuwb.cn/cesium/">
```

### 5.2 Open Graph

```html
<meta property="og:type" content="website">
<meta property="og:title" content="Cesium 三维地球示例集">
<meta property="og:description" content="...">
<meta property="og:url" content="https://yuwb.cn/cesium/">
<meta property="og:image" content="https://yuwb.cn/cesium/assets/images/og-cover.png">
<meta property="og:site_name" content="yuwb.cn">
```

### 5.3 Twitter Card

```html
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Cesium 三维地球示例集">
<meta name="twitter:description" content="...">
<meta name="twitter:image" content="https://yuwb.cn/cesium/assets/images/og-cover.png">
```

### 5.4 结构化数据 JSON-LD

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Cesium 三维地球示例集",
  "url": "https://yuwb.cn/cesium/",
  "description": "...",
  "author": { "@type": "Person", "name": "耶温" }
}
```

ItemList 结构化数据列出 7 个示例页面。

### 5.5 sitemap.xml

列出主页 + 7 个示例页面，共 8 个 URL，changefreq: monthly，priority 按层级设置。

### 5.6 robots.txt

```
User-agent: *
Allow: /
Sitemap: https://yuwb.cn/cesium/sitemap.xml
```

### 5.7 其他

- `<html lang="zh-CN">`
- favicon 引用
- 所有 URL 从 `site.config.js` 读取

## 6. 文件变更清单

### 新增

| 文件 | 说明 |
|------|------|
| `site.config.js` | 站点配置 |
| `sitemap.xml` | SEO sitemap |
| `robots.txt` | SEO robots |

### 修改

| 文件 | 变更 |
|------|------|
| `index.html` | 完全重写：知简设计系统 + Hero + 卡片网格 + SEO + 配置驱动 |

### 不变

- `shared/` 全部不变
- `examples/` 全部不变
- `assets/models/` 不变

## 7. 技术实现要点

1. 主页样式内联 `<style>`，使用 CSS 自定义属性
2. 通过 `<script src="site.config.js">` 加载配置，JS 动态渲染卡片和设置 meta
3. 无构建步骤，纯静态项目
4. 响应式：768px 降 2 列，480px 降 1 列，导航栏移动端简化
5. Noto Serif SC 通过 Google Fonts CDN 加载
