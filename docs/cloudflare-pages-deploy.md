# Cloudflare Pages 部署说明

这个项目现在是普通 Vite React 静态站点，可以直接用 Cloudflare Pages 的 GitHub 集成部署。

## 推荐方式：GitHub 集成

1. 打开 Cloudflare Dashboard。
2. 进入 `Workers & Pages`。
3. 选择 `Create application`。
4. 选择 `Pages`。
5. 选择 `Connect to Git` 或 `Import from an existing Git repository`。
6. 授权 GitHub 后，选择仓库 `erzhiqianyi/jlpt-master-deck`。
7. 构建设置填写：
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: 留空或 `/`
8. 环境变量建议添加：
   - `NODE_VERSION=22.13.0`
9. 保存并部署。

之后每次 push 到 `main`，Cloudflare Pages 会自动构建并发布生产版本。其他分支或 PR 会生成 preview deployment。

## 当前项目为什么适合 Pages

- 不需要用户系统。
- 不需要服务端 API。
- 学习进度保存在浏览器 `localStorage`。
- 内容种子在 `public/data/review-data.json`。
- `npm run build` 会生成 `dist/index.html` 和静态资源。

## 数据更新方式

后续新增单词时：

1. 在 Codex 或 Claude Code 里整理学习内容。
2. 更新 `public/data/review-data.json`。
3. 提交并 push 到 GitHub。
4. Cloudflare Pages 自动部署。

用户浏览器里的学习进度不会跟随部署清空，因为它存在本地 `localStorage`。

## 官方文档依据

- Cloudflare Pages Git 集成支持从 GitHub/GitLab 仓库自动部署，并在 push 后自动构建。
- Cloudflare Pages 构建设置需要指定 build command 和 build output directory。
- Vite 项目在 Pages 上通常使用 `npm run build` 和 `dist`。
