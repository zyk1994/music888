# 部署指南

本文档提供云音乐播放器的多种部署方案，包括一键部署和自托管方案。

## 📋 目录

- [环境要求](#环境要求)
- [Vercel 部署（推荐）](#vercel-部署推荐)
- [Netlify 部署](#netlify-部署)
- [GitHub Pages 部署](#github-pages-部署)
- [自托管方案](#自托管方案)
- [常见问题](#常见问题)

## 🔧 环境要求

### 开发环境
- Node.js >= 18.0.0
- npm >= 9.0.0

### 生产环境
- 支持静态文件托管的服务器
- 支持 SPA（单页应用）路由重写

## 🚀 Vercel 部署（推荐）

Vercel 是最简单快速的部署方式，完全免费且支持自动部署。

### 一键部署

点击下方按钮即可一键部署：

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/truelife0958/music888)

### 手动部署步骤

#### 1. 通过 GitHub 导入

1. 访问 [Vercel Dashboard](https://vercel.com/dashboard)
2. 点击 "Add New Project"
3. 选择 "Import Git Repository"
4. 授权并选择 `music888` 仓库
5. 配置项目：
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```
6. 点击 "Deploy" 开始部署

#### 2. 通过 Vercel CLI 部署

```bash
# 安装 Vercel CLI
npm install -g vercel

# 登录 Vercel
vercel login

# 在项目目录中部署
cd music888
vercel

# 生产环境部署
vercel --prod
```

### 自定义域名

1. 进入项目的 Vercel Dashboard
2. 导航到 "Settings" → "Domains"
3. 添加自定义域名（如 `music.yourdomain.com`）
4. 根据提示配置 DNS 记录：
   - **A 记录**：指向 Vercel 的 IP
   - **CNAME 记录**：指向 `cname.vercel-dns.com`
5. 等待 SSL 证书自动配置（通常 1-2 分钟）

### 环境变量（如需要）

在 Vercel Dashboard 的 "Settings" → "Environment Variables" 中配置：

```
# 示例：如果需要配置 API 地址
VITE_API_BASE_URL=https://your-api.com
```

## 🌐 Netlify 部署

### 通过 Git 自动部署

1. 访问 [Netlify](https://app.netlify.com/)
2. 点击 "Add new site" → "Import an existing project"
3. 选择 Git 提供商（GitHub/GitLab/Bitbucket）
4. 选择 `music888` 仓库
5. 配置构建设置：
   ```
   Build command: npm run build
   Publish directory: dist
   ```
6. 点击 "Deploy site"

### 通过 Netlify CLI 部署

```bash
# 安装 Netlify CLI
npm install -g netlify-cli

# 登录
netlify login

# 初始化项目
netlify init

# 构建并部署
npm run build
netlify deploy --prod
```

### 配置文件

在项目根目录创建 `netlify.toml`：

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
```

## 📄 GitHub Pages 部署

### 方式一：GitHub Actions 自动部署

1. 在项目根目录创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v2
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v3
```

2. 在仓库设置中启用 GitHub Pages：
   - Settings → Pages
   - Source: GitHub Actions

### 方式二：手动部署

```bash
# 构建项目
npm run build

# 部署到 gh-pages 分支
npx gh-pages -d dist
```

### 配置 base URL

如果使用仓库路径（如 `username.github.io/music888`），需要在 `vite.config.ts` 中配置：

```typescript
export default {
  base: '/music888/',
}
```

## 🖥️ 自托管方案

### Nginx 配置

创建 `/etc/nginx/sites-available/music888`：

```nginx
server {
    listen 80;
    server_name music.yourdomain.com;
    
    # 如果配置了 SSL
    # listen 443 ssl http2;
    # ssl_certificate /path/to/cert.pem;
    # ssl_certificate_key /path/to/key.pem;
    
    root /var/www/music888/dist;
    index index.html;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # SPA 路由重写
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

启用站点：

```bash
sudo ln -s /etc/nginx/sites-available/music888 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Apache 配置

创建 `.htaccess` 文件在 `dist` 目录：

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>

# Gzip 压缩
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# 缓存控制
<IfModule mod_expires.c>
  ExpiresActive On
  ExpiresByType image/jpg "access plus 1 year"
  ExpiresByType image/jpeg "access plus 1 year"
  ExpiresByType image/gif "access plus 1 year"
  ExpiresByType image/png "access plus 1 year"
  ExpiresByType image/svg+xml "access plus 1 year"
  ExpiresByType text/css "access plus 1 year"
  ExpiresByType application/javascript "access plus 1 year"
  ExpiresByType application/x-font-woff "access plus 1 year"
</IfModule>
```

### Docker 部署

创建 `Dockerfile`：

```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 运行阶段
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

创建 `nginx.conf`：

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

构建和运行：

```bash
# 构建镜像
docker build -t music888 .

# 运行容器
docker run -d -p 80:80 --name music888 music888
```

### Docker Compose 部署

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  music888:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

运行：

```bash
docker-compose up -d
```

## ❓ 常见问题

### 1. 部署后页面空白

**原因**：通常是路由配置问题或资源路径错误。

**解决方案**：
- 检查 `base` 配置是否正确
- 确保服务器配置了 SPA 路由重写
- 检查浏览器控制台错误

### 2. API 请求失败

**原因**：跨域问题或 API 地址配置错误。

**解决方案**：
- 检查 API 服务是否支持 CORS
- 配置正确的 API 地址
- 使用代理服务器（已在 `vercel.json` 中配置）

### 3. 资源加载 404

**原因**：`base` 路径配置不正确。

**解决方案**：
```typescript
// vite.config.ts
export default {
  base: process.env.NODE_ENV === 'production' ? '/your-repo-name/' : '/',
}
```

### 4. 移动端显示异常

**原因**：CSS 未正确加载或视口配置问题。

**解决方案**：
- 清除浏览器缓存
- 检查 `<meta name="viewport">` 标签
- 确保响应式 CSS 正确加载

### 5. Service Worker 缓存问题

**原因**：旧版本被缓存。

**解决方案**：
```javascript
// 在浏览器控制台执行
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister())
})
```

## 📊 性能优化建议

### CDN 加速

建议使用 CDN 加速静态资源：
- Vercel 自带全球 CDN
- Netlify 自带全球 CDN
- 自托管可使用 Cloudflare CDN

### 启用 HTTP/2

现代部署平台默认支持 HTTP/2，自托管需配置：

```nginx
listen 443 ssl http2;
```

### 开启 Brotli 压缩

```nginx
brotli on;
brotli_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;
```

## 🔒 安全建议

1. **HTTPS**：始终使用 HTTPS
2. **安全头**：配置必要的安全响应头
3. **定期更新**：保持依赖包更新
4. **CSP**：配置内容安全策略（如需要）

## 📞 获取帮助

如果在部署过程中遇到问题：

1. 查看 [GitHub Issues](https://github.com/truelife0958/music888/issues)
2. 提交新的 Issue 描述您的问题
3. 加入讨论获取社区帮助

---

**提示**：推荐使用 Vercel 或 Netlify 进行部署，它们提供了最简单的部署体验和最好的性能。
