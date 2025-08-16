# 环博物流官方网站

## 项目简介

环博物流官方网站是一个专业的货运服务公司多页面网站，提供完整的企业展示和客户服务功能。网站采用现代化的设计理念，支持响应式布局，为客户提供优质的用户体验。

### 主要功能

- **企业展示**: 专业的公司介绍、服务展示和团队介绍
- **服务介绍**: 详细的海运、空运、清关、仓储等服务说明
- **在线咨询**: 完整的联系表单系统，支持客户需求提交
- **响应式设计**: 完美适配电脑、平板和手机设备
- **SEO优化**: 搜索引擎友好的页面结构和内容组织

## 技术栈

### 前端技术
- **HTML5**: 语义化标签，良好的SEO结构
- **CSS3**: 现代化样式，响应式设计，CSS Grid和Flexbox布局
- **JavaScript (ES6+)**: 交互功能，表单验证，动态效果
- **Font Awesome**: 图标库
- **Google Fonts**: 中文字体支持

### 后端技术
- **Node.js**: 服务器运行环境
- **Express.js**: Web应用框架
- **nodemailer**: 邮件发送服务
- **express-validator**: 表单验证
- **helmet**: 安全中间件
- **cors**: 跨域请求支持
- **express-rate-limit**: API限流保护

## 项目结构

```
HuanboWorld/
├── index.html              # 首页
├── services.html           # 服务页面
├── about.html              # 关于我们页面
├── contact.html            # 联系我们页面
├── styles.css              # 主要样式文件
├── script.js               # 前端JavaScript
├── server.js               # Node.js服务器
├── package.json            # 项目配置和依赖
├── env.example             # 环境变量配置示例
├── README.md               # 项目说明文档
├── data/                   # 数据存储目录
│   └── submissions.json    # 表单提交数据
└── uploads/                # 文件上传目录
```

## 快速开始

### 环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/huanboworld/website.git
   cd website
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **配置环境变量**
   ```bash
   # 复制环境变量配置文件
   cp env.example .env
   
   # 编辑配置文件，填入实际配置信息
   nano .env
   ```

4. **启动开发服务器**
   ```bash
   # 开发模式（自动重启）
   npm run dev
   
   # 或生产模式
   npm start
   ```

5. **访问网站**
   ```
   http://localhost:3000
   ```

## 环境配置

创建 `.env` 文件并配置以下参数：

```env
# 服务器配置
NODE_ENV=development
PORT=3000

# 邮件服务配置
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# 公司接收邮箱
COMPANY_EMAIL=info@huanboworld.com

# 管理员令牌
ADMIN_TOKEN=your-secret-token
```

### 邮件服务配置说明

支持以下邮件服务商：

- **QQ邮箱**: `smtp.qq.com:587`
- **163邮箱**: `smtp.163.com:587`
- **Gmail**: `smtp.gmail.com:587`
- **企业邮箱**: 根据邮箱提供商配置

## 部署指南

### 1. 服务器部署

#### 使用 PM2 部署（推荐）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start server.js --name "huanbo-website"

# 设置开机自启
pm2 startup
pm2 save
```

#### 使用 Docker 部署

1. **创建 Dockerfile**
   ```dockerfile
   FROM node:16-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci --only=production
   COPY . .
   EXPOSE 3000
   CMD ["npm", "start"]
   ```

2. **构建和运行**
   ```bash
   # 构建镜像
   docker build -t huanbo-website .
   
   # 运行容器
   docker run -d -p 3000:3000 --name huanbo-site huanbo-website
   ```

### 2. Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name www.huanboworld.com huanboworld.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.huanboworld.com huanboworld.com;
    
    # SSL 证书配置
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # 静态文件缓存
    location ~* \.(css|js|img|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # 代理到 Node.js 应用
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. SSL 证书配置

#### 使用 Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d www.huanboworld.com -d huanboworld.com

# 设置自动续期
sudo crontab -e
# 添加以下行
0 12 * * * /usr/bin/certbot renew --quiet
```

## API 接口

### 联系表单提交

```
POST /api/contact
Content-Type: application/json

{
  "name": "客户姓名",
  "contact": "联系方式（邮箱或手机）",
  "company": "公司名称（可选）",
  "service-type": "服务类型（可选）",
  "cargo-type": "货物类型（可选）",
  "destination": "目的地（可选）",
  "message": "详细需求描述"
}
```

### 管理员统计接口

```
GET /api/admin/stats
Authorization: Bearer your-admin-token

响应示例:
{
  "total": 150,
  "today": 5,
  "thisWeek": 23,
  "serviceTypes": {
    "海运": 45,
    "空运": 38,
    "清关": 25,
    "综合": 42
  }
}
```

## 功能特性

### 前端特性

- ✅ 响应式设计，支持所有设备
- ✅ 现代化UI设计，专业的视觉效果
- ✅ 平滑滚动和动画效果
- ✅ 表单实时验证
- ✅ 图片懒加载优化
- ✅ SEO友好的页面结构

### 后端特性

- ✅ 表单数据验证和安全过滤
- ✅ 邮件通知系统
- ✅ API限流保护
- ✅ 错误处理和日志记录
- ✅ CORS跨域支持
- ✅ 安全头部配置

### 安全特性

- ✅ CSRF保护
- ✅ XSS防护
- ✅ SQL注入防护
- ✅ 文件上传安全验证
- ✅ API访问频率限制
- ✅ 输入数据验证和清理

## 性能优化

### 前端优化

- **CSS优化**: 压缩样式，减少重复代码
- **JavaScript优化**: 事件委托，防抖处理
- **图片优化**: 使用WebP格式，懒加载
- **缓存策略**: 静态资源长期缓存

### 后端优化

- **响应压缩**: Gzip压缩
- **静态文件缓存**: 浏览器缓存控制
- **数据库优化**: 索引优化（如使用数据库）
- **内存管理**: 合理的内存使用

## 维护和监控

### 日志监控

```bash
# 查看PM2日志
pm2 logs huanbo-website

# 查看错误日志
pm2 logs huanbo-website --err

# 实时监控
pm2 monit
```

### 健康检查

```bash
# 检查服务状态
curl http://localhost:3000/health

# 响应示例
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600
}
```

### 数据备份

```bash
# 备份提交数据
cp data/submissions.json backups/submissions-$(date +%Y%m%d).json

# 自动备份脚本
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d-%H%M%S)
tar -czf "$BACKUP_DIR/huanbo-backup-$DATE.tar.gz" data/ uploads/
```

## 常见问题

### Q: 邮件发送失败怎么办？

A: 检查以下配置：
1. SMTP服务器地址和端口是否正确
2. 邮箱用户名和密码是否正确
3. 是否开启了邮箱的SMTP服务
4. 防火墙是否阻止了SMTP端口

### Q: 表单提交后没有收到确认邮件？

A: 可能的原因：
1. 邮件被归类到垃圾邮件
2. 邮箱地址填写错误
3. 邮件服务器配置问题

### Q: 网站加载速度慢怎么优化？

A: 优化建议：
1. 启用Gzip压缩
2. 配置静态资源缓存
3. 使用CDN加速
4. 优化图片大小和格式

## 技术支持

如需技术支持，请通过以下方式联系：

- **邮箱**: tech@huanboworld.com
- **电话**: +86 400-123-4567
- **GitHub Issues**: https://github.com/huanboworld/website/issues

## 版权信息

© 2024 环博物流. 保留所有权利.

本项目仅供学习和商业使用，请勿用于非法用途。

---

*最后更新时间: 2024年12月*
