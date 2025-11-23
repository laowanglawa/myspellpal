# GitHub Pages 部署指南

本文档提供了将本项目部署到 GitHub Pages 的详细步骤，以便通过 `https://laowanglawa.github.io/myspellpal/` 访问您的网站。

## 前提条件

1. **安装 Git**：如果您的系统尚未安装 Git，请按照以下步骤安装：
   - **Windows**：
     - 访问 [Git官网](https://git-scm.com/download/win)
     - 下载并运行安装程序
     - 按照安装向导完成安装（建议使用默认设置）
     - 安装完成后，重启命令提示符或PowerShell
   - **macOS**：
     - 使用 Homebrew: `brew install git`
     - 或通过 [Git官网](https://git-scm.com/download/mac) 下载安装程序
   - **Linux**：
     - Ubuntu/Debian: `sudo apt-get install git`
     - CentOS/Fedora: `sudo yum install git`

2. **GitHub 账号**：确保您拥有 GitHub 账号，并且已经创建了名为 `myspellpal` 的仓库。

## 部署步骤

### 步骤 1：配置 Git（首次使用 Git 时需要）

打开命令提示符或PowerShell，运行以下命令配置您的 Git 用户名和邮箱：

```bash
git config --global user.name "您的GitHub用户名"
git config --global user.email "您的GitHub邮箱"
```

### 步骤 2：初始化 Git 仓库

在项目根目录执行以下命令初始化 Git 仓库：

```bash
git init
git add .
git commit -m "Initial commit"
```

### 步骤 3：连接到 GitHub 仓库

将本地仓库与 GitHub 上的远程仓库关联：

```bash
git remote add origin https://github.com/laowanglawa/myspellpal.git
```

### 步骤 4：推送到 GitHub

将代码推送到 GitHub：

```bash
git push -u origin master
```

（如果您的主分支是 `main` 而不是 `master`，请使用 `git push -u origin main`）

### 步骤 5：配置 GitHub Pages

1. 访问您的 GitHub 仓库页面：`https://github.com/laowanglawa/myspellpal`
2. 点击顶部导航栏中的 **Settings**
3. 在左侧菜单中选择 **Pages**
4. 在 **Build and deployment** 部分：
   - 对于 **Source**，选择 **Deploy from a branch**
   - 对于 **Branch**，选择您的主分支（通常是 `master` 或 `main`），然后选择根目录（`/ (root)`）
   - 点击 **Save** 按钮

### 步骤 6：验证部署

- GitHub Pages 配置保存后，页面会显示一个链接，通常是 `https://laowanglawa.github.io/myspellpal/`
- 部署可能需要几分钟时间完成
- 完成后，您可以通过该链接访问您的网站

## 相对路径问题说明

我们已经检查了项目中的链接，它们都使用了相对路径（如 `zhuye.html` 而不是 `/zhuye.html`），这对于在 GitHub Pages 上正常工作非常重要。

## 后续更新

如果您对代码进行了更改，可以通过以下命令更新 GitHub Pages 上的网站：

```bash
git add .
git commit -m "更新描述"
git push origin master  # 或 main，如果您使用的是 main 分支
```

## 注意事项

1. **静态网站限制**：GitHub Pages 只支持静态网站。如果您的项目包含后端代码，它将无法在 GitHub Pages 上运行，您需要将后端部署到其他平台。

2. **CORS 问题**：如果您的网站需要调用外部 API，请注意可能会遇到跨域资源共享（CORS）限制。

3. **文件大小限制**：GitHub Pages 有文件大小限制，单个文件不应超过 100MB。

4. **带宽限制**：GitHub Pages 有带宽限制，如果您的网站流量很大，可能需要考虑其他托管解决方案。

## 故障排除

如果遇到问题，可以尝试以下解决方案：

1. **链接不工作**：确保所有链接都使用相对路径，而不是绝对路径。

2. **页面加载问题**：检查浏览器控制台是否有错误信息，特别是与资源加载相关的错误。

3. **部署失败**：检查 GitHub 仓库的 Actions 页面，查看构建和部署日志以获取更多信息。