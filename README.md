# Course Gallery — 朋辈社课 · Coding

一个 **shader.se 风格的三维胶片轮放映体验**页面：滚动驱动胶片轮转动与作品视图切换，配以后期辉光与粒子尘埃，用于展示朋辈社课 Coding 方向的作品。

技术栈：Three.js + Vite（`src/` 为源码，`public/` 为静态资源）。

## 线上地址

- **正式入口**：<https://cg.mokelin.cn>
  - 由 Cloudflare Worker `course-gallery` 托管（`wrangler.jsonc` 中 `assets.directory = ./dist`，SPA 回退）
- 原 GitHub Pages 地址 `https://molelung.github.io/course-gallery/` 已于 2026-10-18 停止服务

## 本地开发

```bash
npm install
npm run dev      # 本地开发
npm run build    # 构建到 dist/
```

## 部署

```bash
npm run build
npx wrangler deploy   # 部署 Worker + 静态资源（需已登录 Cloudflare 账号）
```

## 目录结构

```
├── src/            # 源码：场景、动画、着色器、交互
│   ├── animation/  # 开场、滚动、胶片轮、详情视图动画
│   ├── scene/      # 相机、灯光、渲染器、后期处理
│   ├── objects/    # 胶片轮、粒子
│   └── shaders/    # GLSL 着色器
├── public/         # 静态资源（favicon、纹理、模型、HDR）
├── index.html      # 入口页面
├── vite.config.js
└── wrangler.jsonc  # Cloudflare Worker 部署配置
```

## 迁移记录

- 2026-10-18：原 GitHub Pages（`gh-pages` 分支）停止服务，改由 Cloudflare Worker `course-gallery` 的静态资源托管，域名 `cg.mokelin.cn`。
