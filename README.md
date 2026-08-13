# 甘特图项目管理系统 (Gantt Chart Project Manager)

一款基于 React 19 + TypeScript + Vite + Tailwind CSS 构建的高性能、响应式甘特图与看板项目管理应用。

## 🚀 部署指南 (Deployment Options)

本系统已配置全套自动部署与构建配置文件，支持以下多种部署方式：

### 1. GitHub Pages (自动化 CI/CD)
项目根目录下已配置 `.github/workflows/deploy.yml`。
1. 将本项目代码推送到 GitHub 仓库（`main` 或 `master` 分支）。
2. 在 GitHub 仓库中进入 **Settings -> Pages**。
3. 在 **Source** 下下拉选择 **GitHub Actions**。
4. 每次提交代码后，GitHub Actions 会自动打包并发布应用到你的 GitHub Pages 域名（例如：`https://<username>.github.io/Gantt/`）。

### 2. Vercel 一键部署
根目录下已配置 `vercel.json` SPA 重定向规则：
1. 登录 [Vercel](https://vercel.com)。
2. 点击 **Import Project**，导入你的 GitHub `Gantt` 仓库。
3. 构建命令填 `npm run build`，输出目录填 `dist`，点击 **Deploy** 即可。

### 3. Netlify 部署
根目录下已配置 `netlify.toml` 构建与重定向规则：
1. 登录 [Netlify](https://netlify.com)，选择 **Add new site -> Import an existing project**。
2. 连接 GitHub `Gantt` 仓库，保持默认配置即可自动部署完成。

### 4. Docker / Container 容器部署
根目录下包含 `Dockerfile` 与 `nginx.conf`：
```bash
# 构建 Docker 镜像
docker build -t gantt-app .

# 运行容器 (映射 80 端口)
docker run -d -p 8080:80 --name gantt gantt-app
```
访问 `http://localhost:8080` 即可预览。

---

## 💻 本地开发与运行 (Local Development)

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 检查类型错误
npm run lint

# 构建生产环境代码
npm run build
```

---

## ✨ 核心特性 (Key Features)

- **可视化甘特图 (Gantt Chart)**：支持拖拽调整开始/结束时间，前置依赖线绘制，视距切换（日/周/月/季），以及自适应列宽缩放。
- **层级子任务管理**：快捷添加子任务，智能自动接续前置子任务的结束时间。
- **看板模式 (Kanban)**：任务状态可视化流转。
- **级联通知与数据导入导出**：灵活维护项目进度与数据备份。
