# 主页样式优化 + SEO 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 cesium-example 主页完全对齐知简设计系统，增加 Hero + 卡片网格布局，完成全套 SEO，抽取站点配置文件。

**架构：** 纯静态 HTML 项目，无构建步骤。`site.config.js` 作为唯一数据源驱动主页渲染，index.html 内联 CSS 自定义属性对齐知简 design tokens，JS 动态渲染卡片列表。SEO 通过静态 meta + JSON-LD + sitemap.xml + robots.txt 全覆盖。

**技术栈：** 原生 HTML/CSS/JS、CesiumJS 1.112 (CDN)、Noto Serif SC (Google Fonts)

---

## 文件结构

| 文件 | 操作 | 职责 |
|------|------|------|
| `site.config.js` | 新建 | 站点配置（名称、URL、示例列表、SEO 关键词） |
| `index.html` | 重写 | 主页：知简设计系统 + Hero + 卡片网格 + SEO meta + JSON-LD + 配置驱动渲染 |
| `sitemap.xml` | 新建 | SEO sitemap，列出主页 + 7 个示例页面 |
| `robots.txt` | 新建 | SEO robots，指向 sitemap |

---

### 任务 1：创建站点配置文件 site.config.js

**文件：**
- 创建：`site.config.js`

- [ ] **步骤 1：创建 site.config.js**

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

- [ ] **步骤 2：验证配置文件语法**

运行：`node -e "eval(require('fs').readFileSync('site.config.js','utf8')); console.log('OK:', SITE_CONFIG.examples.length + ' examples')"`

预期：`OK: 7 examples`

- [ ] **步骤 3：Commit**

```bash
git add site.config.js
git commit -m "feat: add site.config.js for site configuration"
```

---

### 任务 2：重写 index.html — CSS 样式部分

**文件：**
- 重写：`index.html`（完整重写，本任务先写好 `<head>` + `<style>` 部分）

- [ ] **步骤 1：重写 index.html 的 `<head>` 和 CSS**

将整个 index.html 替换为以下内容（包含完整的 `<head>` + SEO meta + `<style>`）：

```html
<!DOCTYPE html>
<html lang="zh-CN">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Cesium 三维地球示例集 | yuwb.cn</title>
    <meta name="description" content="基于 CesiumJS 的 3D 地球可视化示例集，展示飞行航线、空域可视化、粒子特效和天气模拟">
    <meta name="keywords" content="Cesium, CesiumJS, 3D地球, 飞行航线, 空域可视化, 粒子特效, 天气模拟">
    <meta name="author" content="耶温">
    <link rel="canonical" href="https://yuwb.cn/cesium/">
    <link rel="icon" type="image/png" href="./assets/images/logo.png">

    <!-- Open Graph -->
    <meta property="og:type" content="website">
    <meta property="og:title" content="Cesium 三维地球示例集">
    <meta property="og:description" content="基于 CesiumJS 的 3D 地球可视化示例集，展示飞行航线、空域可视化、粒子特效和天气模拟">
    <meta property="og:url" content="https://yuwb.cn/cesium/">
    <meta property="og:image" content="https://yuwb.cn/cesium/assets/images/og-cover.png">
    <meta property="og:site_name" content="yuwb.cn">

    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="Cesium 三维地球示例集">
    <meta name="twitter:description" content="基于 CesiumJS 的 3D 地球可视化示例集，展示飞行航线、空域可视化、粒子特效和天气模拟">
    <meta name="twitter:image" content="https://yuwb.cn/cesium/assets/images/og-cover.png">

    <!-- JSON-LD Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "Cesium 三维地球示例集",
      "url": "https://yuwb.cn/cesium/",
      "description": "基于 CesiumJS 的 3D 地球可视化示例集，展示飞行航线、空域可视化、粒子特效和天气模拟",
      "author": {
        "@type": "Person",
        "name": "耶温"
      }
    }
    </script>
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Cesium 三维地球示例",
      "numberOfItems": 7,
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "基础圆形航线",
          "url": "https://yuwb.cn/cesium/examples/01-flight-basic/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "圆角四边形航线",
          "url": "https://yuwb.cn/cesium/examples/01-flight-rounded/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "VTOL 倾转旋翼机",
          "url": "https://yuwb.cn/cesium/examples/01-flight-vtol/"
        },
        {
          "@type": "ListItem",
          "position": 4,
          "name": "B 类空域可视化",
          "url": "https://yuwb.cn/cesium/examples/02-airspace/"
        },
        {
          "@type": "ListItem",
          "position": 5,
          "name": "飞机粒子特效",
          "url": "https://yuwb.cn/cesium/examples/03-particles/"
        },
        {
          "@type": "ListItem",
          "position": 6,
          "name": "雷雨云天气",
          "url": "https://yuwb.cn/cesium/examples/04-weather/"
        },
        {
          "@type": "ListItem",
          "position": 7,
          "name": "云模型加载",
          "url": "https://yuwb.cn/cesium/examples/04-weather-cloud/"
        }
      ]
    }
    </script>

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400;600;700&display=swap" rel="stylesheet">

    <style>
        /* === Design Tokens (对齐知简) === */
        :root {
            --primary: #9f000f;
            --primary-hover: #c41e3a;
            --primary-foreground: #ffffff;
            --primary-subtle: rgba(159, 0, 15, 0.08);
            --primary-subtle-soft: rgba(159, 0, 15, 0.04);
            --foreground: #1d1b20;
            --muted-foreground: #6f655c;
            --background: #fbf9f9;
            --highlight: #faf7f4;
            --muted: #f6efe7;
            --secondary: #f3ece4;
            --border: #e7ddd1;
            --input: #d9cbbc;
            --accent: #e6efe5;
            --accent-foreground: #31483f;
            --accent-warm: #f5e6e6;
            --selection: rgba(182, 72, 43, 0.18);
            --radius: 0;
            --font-serif: 'Noto Serif SC', 'Songti SC', 'STSong', Georgia, serif;
            --font-sans: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', sans-serif;
            --font-mono: 'SF Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace;
        }

        /* === Reset === */
        *, *::before, *::after {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            scroll-behavior: smooth;
        }

        ::selection {
            background: var(--selection);
        }

        body {
            font-family: var(--font-sans);
            background-color: var(--background);
            color: var(--foreground);
            line-height: 1.85;
            min-height: 100vh;
        }

        a {
            color: inherit;
            text-decoration: none;
        }

        /* === 导航栏 === */
        .nav {
            height: 4rem;
            border-bottom: 1px solid var(--border);
            background: var(--background);
            position: sticky;
            top: 0;
            z-index: 100;
        }

        .nav-inner {
            max-width: 80rem;
            margin: 0 auto;
            padding: 0 1.5rem;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .nav-brand {
            font-family: var(--font-serif);
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--primary);
            letter-spacing: 0.04em;
        }

        .nav-link {
            font-size: 0.875rem;
            color: var(--muted-foreground);
            padding: 0.375rem 0.75rem;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            transition: all 0.2s ease;
        }

        .nav-link:hover {
            color: var(--primary);
            border-color: var(--primary);
            background: var(--muted);
        }

        /* === Hero 区域 === */
        .hero {
            max-width: 80rem;
            margin: 0 auto;
            padding: 4rem 1.5rem 3rem;
        }

        .hero-kicker {
            font-size: 0.6875rem;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: var(--primary);
            margin-bottom: 1rem;
        }

        .hero-title {
            font-family: var(--font-serif);
            font-size: clamp(2.75rem, 6vw, 4.75rem);
            line-height: 1.2;
            letter-spacing: 0.04em;
            color: var(--foreground);
            margin-bottom: 1.25rem;
        }

        .hero-desc {
            font-size: 1.125rem;
            line-height: 1.85;
            color: var(--muted-foreground);
            max-width: 36rem;
            margin-bottom: 2rem;
        }

        .hero-cta {
            display: inline-block;
            background: var(--primary);
            color: var(--primary-foreground);
            padding: 0.625rem 1.5rem;
            border-radius: var(--radius);
            font-size: 0.875rem;
            font-weight: 500;
            transition: all 0.2s ease;
            border: none;
            cursor: pointer;
        }

        .hero-cta:hover {
            background: var(--primary-hover);
        }

        .hero-cta:active {
            transform: scale(0.98);
        }

        /* === 示例区域 === */
        .examples {
            max-width: 80rem;
            margin: 0 auto;
            padding: 0 1.5rem 5rem;
        }

        .category {
            margin-top: 3rem;
        }

        .category:first-child {
            margin-top: 0;
        }

        .category-title {
            font-family: var(--font-serif);
            font-size: 2rem;
            line-height: 1.3;
            font-weight: 600;
            color: var(--foreground);
            border-left: 4px solid var(--primary);
            padding-left: 1.5rem;
            margin-bottom: 1.25rem;
        }

        /* === 卡片网格 === */
        .card-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1rem;
        }

        /* === 卡片 === */
        .card {
            border: 1px solid var(--primary);
            border-radius: var(--radius);
            padding: 1.5rem;
            background: var(--background);
            transition: all 0.2s ease;
            display: flex;
            flex-direction: column;
        }

        .card:hover {
            border-color: rgba(159, 0, 15, 0.4);
            transform: translateY(-2px);
        }

        .card-kicker {
            font-size: 0.6875rem;
            letter-spacing: 0.3em;
            text-transform: uppercase;
            color: var(--primary);
            margin-bottom: 0.5rem;
        }

        .card-title {
            font-family: var(--font-serif);
            font-size: 1.375rem;
            line-height: 1.5;
            color: var(--foreground);
            margin-bottom: 0.5rem;
        }

        .card-desc {
            font-size: 0.875rem;
            line-height: 1.85;
            color: var(--muted-foreground);
            flex: 1;
            margin-bottom: 1rem;
        }

        .card-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.375rem;
        }

        .card-tag {
            font-size: 0.6875rem;
            padding: 0.125rem 0.5rem;
            border: 1px solid var(--border);
            border-radius: var(--radius);
            color: var(--muted-foreground);
            background: var(--muted);
        }

        /* === 页脚 === */
        .footer {
            border-top: 1px solid var(--border);
            text-align: center;
            color: var(--muted-foreground);
            font-size: 0.875rem;
            padding: 2rem 1.5rem;
        }

        .footer a {
            color: var(--muted-foreground);
            font-weight: 600;
            transition: color 0.2s ease;
        }

        .footer a:hover {
            color: var(--primary);
        }

        /* === 响应式 === */
        @media (max-width: 768px) {
            .card-grid {
                grid-template-columns: repeat(2, 1fr);
            }

            .hero {
                padding: 3rem 1.5rem 2rem;
            }

            .category-title {
                font-size: 1.5rem;
            }
        }

        @media (max-width: 480px) {
            .card-grid {
                grid-template-columns: 1fr;
            }

            .hero-title {
                font-size: 2rem;
            }

            .hero-desc {
                font-size: 1rem;
            }

            .category-title {
                font-size: 1.25rem;
            }

            .nav-brand {
                font-size: 1.125rem;
            }
        }
    </style>
</head>
```

- [ ] **步骤 2：验证 HTML 语法**

运行：`node -e "const h=require('fs').readFileSync('index.html','utf8'); console.log(h.includes('--primary: #9f000f') ? 'CSS tokens OK' : 'FAIL'); console.log(h.includes('og:title') ? 'OG OK' : 'FAIL'); console.log(h.includes('ld+json') ? 'JSON-LD OK' : 'FAIL')"`

预期：全部输出 OK

- [ ] **步骤 3：Commit**

```bash
git add index.html
git commit -m "feat: rewrite index.html head + CSS with Zhijian design system"
```

---

### 任务 3：重写 index.html — HTML 结构 + JS 渲染逻辑

**文件：**
- 修改：`index.html`（在 `<head>` 后追加 `<body>` 内容）

- [ ] **步骤 1：在 index.html 的 `</style></head>` 后追加 body 内容**

在 `</head>` 之后、`</html>` 之前追加以下内容：

```html

<body>
    <!-- 导航栏 -->
    <nav class="nav">
        <div class="nav-inner">
            <a href="./" class="nav-brand">Cesium 示例集</a>
            <a href="https://github.com/CesiumGS/cesium" target="_blank" rel="noopener noreferrer" class="nav-link">GitHub</a>
        </div>
    </nav>

    <!-- Hero 区域 -->
    <section class="hero">
        <div class="hero-kicker">CesiumJS 1.112</div>
        <h1 class="hero-title">Cesium 三维地球示例集</h1>
        <p class="hero-desc">
            基于 CesiumJS 的 3D 地球可视化示例集，以上海陆家嘴为主要场景，展示飞行航线、空域可视化、粒子特效和天气模拟等多种三维地图应用。
        </p>
        <a href="#examples" class="hero-cta">浏览示例 ↓</a>
    </section>

    <!-- 示例卡片区域 -->
    <section id="examples" class="examples">
        <!-- 由 JS 动态渲染 -->
    </section>

    <!-- 页脚 -->
    <footer class="footer">
        <p>© 2026 <a href="https://yuwb.cn" target="_blank" rel="noopener noreferrer">yuwb.cn</a> · Powered by <a href="https://cesium.com/" target="_blank" rel="noopener noreferrer">CesiumJS</a></p>
    </footer>

    <script src="./site.config.js"></script>
    <script>
        (function () {
            'use strict';

            // 按 categoryOrder 分组
            var categories = {};
            SITE_CONFIG.examples.forEach(function (ex) {
                if (!categories[ex.category]) {
                    categories[ex.category] = {
                        name: ex.category,
                        order: ex.categoryOrder,
                        items: []
                    };
                }
                categories[ex.category].items.push(ex);
            });

            // 排序
            var sorted = Object.values(categories).sort(function (a, b) {
                return a.order - b.order;
            });

            // 渲染
            var container = document.getElementById('examples');
            sorted.forEach(function (cat) {
                var section = document.createElement('div');
                section.className = 'category';

                var title = document.createElement('h2');
                title.className = 'category-title';
                title.textContent = cat.name;
                section.appendChild(title);

                var grid = document.createElement('div');
                grid.className = 'card-grid';

                cat.items.forEach(function (item) {
                    var card = document.createElement('a');
                    card.href = item.path;
                    card.className = 'card';

                    var kicker = document.createElement('div');
                    kicker.className = 'card-kicker';
                    kicker.textContent = cat.name;

                    var cardTitle = document.createElement('div');
                    cardTitle.className = 'card-title';
                    cardTitle.textContent = item.title;

                    var desc = document.createElement('div');
                    desc.className = 'card-desc';
                    desc.textContent = item.description;

                    var tags = document.createElement('div');
                    tags.className = 'card-tags';
                    item.tags.forEach(function (tag) {
                        var span = document.createElement('span');
                        span.className = 'card-tag';
                        span.textContent = tag;
                        tags.appendChild(span);
                    });

                    card.appendChild(kicker);
                    card.appendChild(cardTitle);
                    card.appendChild(desc);
                    card.appendChild(tags);
                    grid.appendChild(card);
                });

                section.appendChild(grid);
                container.appendChild(section);
            });
        })();
    </script>
</body>
```

- [ ] **步骤 2：在浏览器中验证**

运行：`python3 -m http.server 8080 --directory .`

访问 `http://localhost:8080`，检查：
1. 导航栏显示「Cesium 示例集」+ GitHub 链接
2. Hero 区域显示 kicker + 大标题 + 描述 + CTA 按钮
3. 4 个分类标题带左侧朱砂红线
4. 7 个卡片正确显示，3 列网格布局
5. 卡片 hover 有上浮 + 边框色变化
6. 点击卡片可跳转到示例页面
7. 页脚显示 © 2026 yuwb.cn

- [ ] **步骤 3：Commit**

```bash
git add index.html
git commit -m "feat: complete index.html body with hero, card grid, and config-driven rendering"
```

---

### 任务 4：创建 sitemap.xml

**文件：**
- 创建：`sitemap.xml`

- [ ] **步骤 1：创建 sitemap.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yuwb.cn/cesium/</loc>
    <lastmod>2026-06-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://yuwb.cn/cesium/examples/01-flight-basic/</loc>
    <lastmod>2026-06-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://yuwb.cn/cesium/examples/01-flight-rounded/</loc>
    <lastmod>2026-06-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://yuwb.cn/cesium/examples/01-flight-vtol/</loc>
    <lastmod>2026-06-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://yuwb.cn/cesium/examples/02-airspace/</loc>
    <lastmod>2026-06-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://yuwb.cn/cesium/examples/03-particles/</loc>
    <lastmod>2026-06-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://yuwb.cn/cesium/examples/04-weather/</loc>
    <lastmod>2026-06-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://yuwb.cn/cesium/examples/04-weather-cloud/</loc>
    <lastmod>2026-06-20</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

- [ ] **步骤 2：验证 XML 格式**

运行：`xmllint --noout sitemap.xml 2>&1 || echo "XML validation failed"`

预期：无输出（格式正确）。如果 xmllint 不可用，运行 `node -e "new (require('xml2js')||{Parser:function(){}})()" 2>/dev/null || echo 'xmllint not available, skip'`

- [ ] **步骤 3：Commit**

```bash
git add sitemap.xml
git commit -m "feat: add sitemap.xml for SEO"
```

---

### 任务 5：创建 robots.txt

**文件：**
- 创建：`robots.txt`

- [ ] **步骤 1：创建 robots.txt**

```
User-agent: *
Allow: /
Sitemap: https://yuwb.cn/cesium/sitemap.xml
```

- [ ] **步骤 2：Commit**

```bash
git add robots.txt
git commit -m "feat: add robots.txt for SEO"
```

---

### 任务 6：最终验证

- [ ] **步骤 1：启动本地服务器**

运行：`python3 -m http.server 8080 --directory .`

- [ ] **步骤 2：验证主页渲染**

访问 `http://localhost:8080`，检查：
1. 页面标题为「Cesium 三维地球示例集 | yuwb.cn」
2. 配色使用朱砂红 #9f000f，背景为温白 #fbf9f9
3. 所有元素零圆角
4. Hero 区域 kicker + 大标题 + 描述 + CTA
5. 4 个分类，7 个卡片，3 列布局
6. 卡片 hover 效果（上浮 + 边框变色）
7. 页脚显示 © 2026 yuwb.cn
8. Noto Serif SC 字体加载正常

- [ ] **步骤 3：验证 SEO**

1. 查看页面源代码，确认 `<title>`、`<meta description>`、`<meta keywords>`、`<link canonical>` 存在
2. 确认 Open Graph 标签存在（og:title, og:description, og:url, og:image）
3. 确认 Twitter Card 标签存在
4. 确认两段 JSON-LD 结构化数据存在（WebSite + ItemList）
5. 访问 `http://localhost:8080/sitemap.xml`，确认格式正确
6. 访问 `http://localhost:8080/robots.txt`，确认内容正确

- [ ] **步骤 4：验证响应式**

在浏览器 DevTools 中：
1. 768px 宽度：卡片 2 列
2. 480px 宽度：卡片 1 列，标题缩小

- [ ] **步骤 5：验证链接**

点击每个卡片，确认跳转到正确的示例页面。点击 GitHub 链接，确认跳转到 Cesium 仓库。

- [ ] **步骤 6：最终 Commit**

```bash
git add -A
git commit -m "feat: homepage redesign with Zhijian design system + full SEO optimization"
```
