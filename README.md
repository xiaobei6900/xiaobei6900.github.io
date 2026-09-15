# 晓辈的博客

个人博客，记录学习、折腾与生活。

线上地址：<https://xiaobei6900.github.io>

## 技术栈

- **Astro 7** — 静态优先，默认零 JS
- **[Firefly](https://github.com/CuteLeaf/Firefly)** — 基于 [Fuwari](https://github.com/saicaca/fuwari) 二次开发的博客主题
- **pnpm** — 包管理器（主题通过 `only-allow` 强制要求，npm 会被拦截）
- **GitHub Actions + GitHub Pages** — push 即自动构建部署

## 本地开发

```bash
pnpm install     # 安装依赖
pnpm dev         # 开发服务器，默认 http://localhost:4321
pnpm build       # 构建到 dist/
pnpm preview     # 预览构建产物
```

> 需要 Node.js ≥ 22.23.0 与 pnpm ≥ 11。

## 目录速查

```
src/
├── config/            # 所有个性化配置都在这里
│   ├── siteConfig.ts      # 站名、域名、主题色、页面开关
│   ├── profileConfig.ts   # 头像、昵称、签名、社交链接
│   ├── navBarConfig.ts    # 导航栏菜单
│   └── sidebarConfig.ts   # 侧边栏组件
├── content/
│   ├── posts/         # 文章（.md / .mdx）
│   └── spec/          # 关于页等内容
├── pages/             # 路由
└── layouts/           # 布局
public/                # 静态资源（favicon、图片、字体）
```

## 写一篇新文章

在 `src/content/posts/` 下新建 `.md` 文件：

```markdown
---
title: 文章标题
published: 2026-09-15
description: 文章摘要
tags: [标签1, 标签2]
category: 分类名
pinned: false
---

正文内容……
```

然后提交推送，GitHub Actions 会自动部署：

```bash
git add -A
git commit -m "post: 新文章"
git push
```

## 部署

`.github/workflows/deploy.yml` 已配置好，push 到 `main` 分支即触发，也可在 Actions 页面手动触发。

首次部署需要在仓库 **Settings → Pages** 中把 Source 设为 **GitHub Actions**。

## 致谢与许可

主题版权归原作者所有，本项目遵循 [MIT License](./LICENSE)：

- [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)
- [saicaca/fuwari](https://github.com/saicaca/fuwari)
- [withastro/astro](https://github.com/withastro/astro)
