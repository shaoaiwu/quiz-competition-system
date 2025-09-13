# GitHub 部署指南

## 网页版上传（推荐新手）

### 步骤1：创建仓库
1. 登录 https://github.com
2. 点击右上角 "+" → "New repository"
3. 填写信息：
   - Repository name: `quiz-competition-system`
   - Description: `在线答题比赛系统`
   - 勾选 "Public"
   - 勾选 "Add a README file"
4. 点击 "Create repository"

### 步骤2：上传文件
1. 在仓库主页，点击 "uploading an existing file"
2. 拖拽这些文件到上传区：
   - index.html
   - styles.css
   - script.js
   - README.md
3. 填写提交信息："Add quiz system files"
4. 点击 "Commit changes"

### 步骤3：启用网站
1. 仓库页面 → Settings
2. 左侧菜单 → Pages
3. Source: "Deploy from a branch"
4. Branch: "main", Folder: "/ (root)"
5. 点击 "Save"

### 访问网站
等待5-10分钟后，访问：
`https://你的用户名.github.io/quiz-competition-system`

---

## 命令行上传（适合有Git经验的用户）

### 前提条件
确保已安装 Git：https://git-scm.com/

### 上传步骤
```bash
# 1. 克隆仓库
git clone https://github.com/你的用户名/quiz-competition-system.git
cd quiz-competition-system

# 2. 复制文件到仓库文件夹
# 将 index.html, styles.css, script.js 复制到此文件夹

# 3. 添加文件到Git
git add .

# 4. 提交更改
git commit -m "Add quiz competition system"

# 5. 推送到GitHub
git push origin main
```

### 后续更新
```bash
# 修改文件后
git add .
git commit -m "Update quiz system"
git push origin main
```

---

## 自定义域名（可选）

如果你有自己的域名：

### 1. 添加CNAME文件
在仓库根目录创建 `CNAME` 文件，内容为你的域名：
```
quiz.yourdomain.com
```

### 2. 配置DNS
在域名DNS设置中添加CNAME记录：
- Name: quiz
- Value: 你的用户名.github.io

---

## 常见问题

### Q: 网站没有显示怎么办？
A: 
- 检查是否启用了GitHub Pages
- 等待5-10分钟部署完成
- 确保仓库是Public

### Q: 如何更新网站？
A: 
- 网页版：直接编辑文件或重新上传
- 命令行：git push 推送更改

### Q: 可以用私有仓库吗？
A: GitHub Pages免费版只支持公开仓库

### Q: 支持HTTPS吗？
A: GitHub Pages默认支持HTTPS

---

## 优势

✅ **完全免费** - GitHub Pages免费托管
✅ **自动部署** - 推送代码自动更新网站  
✅ **全球CDN** - 访问速度快
✅ **HTTPS支持** - 安全访问
✅ **自定义域名** - 可绑定自己的域名
✅ **版本控制** - 完整的代码历史记录