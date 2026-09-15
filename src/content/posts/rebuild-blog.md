---
title: 博客推倒重建：从丢失本地文件到 Firefly 主题上线
published: 2026-09-15
description: 本地博客源码丢了，本想从 GitHub 仓库恢复，结果发现仓库里只有一个骨架。于是干脆推倒重来，顺手把踩的坑都记下来。
tags: [Astro, Firefly, GitHub Pages, 踩坑]
category: 折腾记录
pinned: true
---

起因很简单：本地博客文件夹丢了，想着仓库还在 GitHub 上，clone 回来就完事了。结果打开一看——**仓库里只有一个 Astro 骨架**，三个页面全是"施工中……"，一条真正的文章都没有。

更糟的是，这个仓库本身问题不小。既然如此，干脆推倒重建。

## 一、旧仓库的三个坑

### 坑 1：把 node_modules 提交进了版本库

旧仓库的跟踪文件数是 **6388 个**，其中 6000 多个是 `node_modules/` 里的东西，还外加一个 `dist/`。

后果：

- clone 一次要下载 29 MB、跑几分钟（正常博客仓库应该几十 KB）
- Windows 上 checkout 慢到容易中途被打断
- 最要命的是**平台不一致**：当年是在 Linux 环境装完依赖直接提交的，落到 Windows 上直接报错

### 坑 2：clone 中断会留下"半个仓库"

clone 被打断后的状态很迷惑：

```
git log          # 历史正常，最新提交都在
git status       # 一片 D（已删除），另有几千个 ?? 未跟踪
git ls-files     # 0 —— 索引文件没了
```

原因是被打断的 clone 留下了 `.git/index.lock` 残锁，导致后续的 `git reset` 全部失败，`.git/index` 始终没建起来。

> [!TIP] 自愈办法
> 记住这个，很实用：
>
> ```bash
> rm -f .git/index.lock      # Windows: del /f .git\index.lock
> git reset --hard HEAD      # 重建索引 + 补齐缺失文件
> git status                 # 无输出 = 干净了
> ```
>
> `git reset --hard` 会把索引从 HEAD 重新写出来，索引损坏基本都能靠它救回来。

### 坑 3：依赖是 Linux 版，Windows 跑不起来

旧仓库里的 `node_modules` 长这样：

```
node_modules/@esbuild/linux-x64
node_modules/@rollup/rollup-linux-x64-gnu
node_modules/.bin/astro          ← 是个 shell 脚本，没有 astro.cmd
```

于是 `npm run build` 直接甩你一句：

```
'astro' 不是内部或外部命令，也不是可运行的程序或批处理文件。
```

补装平台原生包才修好（版本必须和 `node_modules/rollup`、`node_modules/esbuild` 里 `package.json` 的版本严格一致）：

```bash
npm install --no-save \
  @rollup/rollup-win32-x64-msvc@4.28.1 \
  @esbuild/win32-x64@0.21.5
```

## 二、先重建：Astro 7 + 内容集合

推倒重来，技术选型直接照官方文档走（注意 Astro 已经到 7.x 了，网上的老教程有不少写法已经过时）：

- **Astro 7**：静态优先，默认零 JS
- **内容集合（Content Collections）**：文章放 `src/content/`，frontmatter 用 Zod 校验，写错字段在构建时就报错
- **@astrojs/rss + @astrojs/sitemap**：订阅和站点地图开箱即用
- **GitHub Actions**：push 到 `main` 自动构建发布

核心就两个文件。`src/content.config.ts` 定义集合和 schema：

```ts
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
	loader: glob({ base: './src/content/blog', pattern: '**/*.{md,mdx}' }),
	schema: z.object({
		title: z.string(),
		description: z.string(),
		pubDate: z.coerce.date(),
		tags: z.array(z.string()).default([]),
	}),
});

export const collections = { blog };
```

`src/pages/blog/[...slug].astro` 负责把每条内容渲染成页面：

```astro
---
import { getCollection, render } from 'astro:content';

export async function getStaticPaths() {
	const posts = await getCollection('blog');
	return posts.map((post) => ({ params: { slug: post.id }, props: post }));
}
const post = Astro.props;
const { Content } = await render(post);
---

<Content />
```

`getCollection()` 查询、`render()` 渲染，比老版本的 `entry.render()` 干净不少。

## 三、第四个坑：push 不上去

新项目建好了，`git push --force` 却过不去：

```
fatal: unable to access 'https://github.com/...':
OpenSSL SSL_connect: SSL_ERROR_SYSCALL in connection to github.com:443
```

`SSL_ERROR_SYSCALL` 的含义是 **TLS 握手中途被重置**——不是账号密码问题，是连接被掐断。诡异的是同样这台机器，早上 clone 还能跑到 15 MB/s。

这类问题基本都是间歇性的，几个处理方向：

1. **先重试几次**。干扰时好时坏，重试常常就过了。
2. **挂代理并给 git 单独指定代理**（端口换成你自己代理工具的混合端口）：

   ```bash
   git config --global http.https://github.com.proxy http://127.0.0.1:7890
   ```

3. **改走 SSH，必要时用 443 端口**（22 端口也常被干扰）：

   ```bash
   git remote set-url origin git@github.com:xiaobei6900/xiaobei6900.github.io.git
   ssh -T -p 443 git@ssh.github.com
   ```

4. 认证弹窗（"please complete authentication in your browser"）是 Git Credential Manager 在要 OAuth，**必须等浏览器那步走完**，否则也会以 SSL 报错收场。

## 四、最重要的收获：.gitignore

这次所有麻烦的根源，都是"构建产物和依赖进了版本库"。新仓库第一件事就是加 `.gitignore`：

```
node_modules/
dist/
.astro/
```

效果立竿见影：仓库从 6388 个文件变成 **21 个源文件**，clone 从几分钟变成几秒钟。

## 五、后又反悔：换成 Firefly 主题

干净的骨架跑起来了，但页面实在太素——白底黑字，没有任何设计。于是决定换主题。

在 Firefly（流萤）和 Fuwari 之间选了 **Firefly**：它是 Fuwari 的二次开发，中文文档最完整、活跃度最高，功能也最满——四种壁纸模式、双侧栏、主题色色相 360° 可调、代码块增强、Mermaid/PlantUML 图表、看板娘、相册、音乐播放器、评论系统，基本属于"开箱即用还是杂志观感"。

代价是三个：

**1. 要 pnpm，不是 npm。** Firefly 的 `package.json` 里有 `"preinstall": "npx only-allow pnpm"`，用 npm 装依赖会直接被打回。

**2. 依赖要求 node ≥ 22.23.0**，比想象中高。

**3. 配置项非常多**，`src/config/` 下有 30 多个文件。站名、作者、导航栏、侧边栏、评论、音乐、看板娘……想改什么都得先找到对应的那个文件。

配置集中度反而是它的优点——所有个性化都在这一个目录里，不用满仓库找。比如改站名：

```ts
// src/config/siteConfig.ts
export const siteConfig: SiteConfig = {
	title: "晓辈的博客",
	subtitle: "记录学习、折腾与生活",
	site_url: "https://xiaobei6900.github.io",
	// ...
};
```

页面开关也在这里，不需要的页面（相册、番剧、友链、打赏……）直接关掉，对应路由会自动返回 404 并从导航栏隐藏：

```ts
const pages = resolvePageToggles({
	friends: false,
	guestbook: false,
	dynamic: false,
	gallery: false,
	sponsor: false,
	// ...
});
```

## 六、部署流水线只需改一行

Firefly 自带 `.github/workflows/deploy.yml`，适配 GitHub Pages 现成的。唯一要改的是触发分支——它是按主题仓库的 `master` 写的，而 GitHub Pages 用户站点的默认分支是 `main`：

```yaml
on:
  push:
    branches: [ main ]   # 原来是 master
  workflow_dispatch:
```

流水线本身用 `pnpm/action-setup` + `actions/upload-pages-artifact` + `actions/deploy-pages`，还会顺便 `touch dist/.nojekyll`（防止 GitHub Pages 的 Jekyll 处理掉下划线开头的目录）。

## 七、日常写作流程

```bash
# 新建 src/content/posts/xxx.md，写 frontmatter 和正文
git add -A
git commit -m "post: xxx"
git push
```

push 之后 GitHub Actions 自动构建部署，一两分钟线上就能看到。

Firefly 的文章 frontmatter 字段比之前多，常用的几个：

```yaml
---
title: 文章标题
published: 2026-09-15        # 必填，发布日期
description: 文章摘要
tags: [标签1, 标签2]
category: 分类名
pinned: false                # 是否置顶
---
```

---

回头看，这次最值钱的不是"把博客恢复了"，而是搞清楚了**仓库里该放什么、不该放什么**。旧仓库那 6388 个文件，本质上是把"能跑起来的环境"当成了"代码"一起备份——看着保险，实际把跨平台、clone 速度、可维护性全搭进去了。

顺带也验证了一件事：换主题这种"看着最麻烦"的步骤，反而是整个流程里最省心的——前提是内容都老老实实待在 `src/content/` 里，搬过去就是复制个目录的事。
