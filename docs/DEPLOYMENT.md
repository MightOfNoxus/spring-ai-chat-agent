# 部署指南

本文档详细介绍如何部署 Spring AI Chat Agent 应用。

## 部署方式概览

| 方式 | 适用场景 | 复杂度 |
|------|----------|--------|
| Manus 平台 | 快速部署，无需服务器 | 低 |
| Docker Compose | 自托管，完整控制 | 中 |
| Kubernetes | 大规模生产环境 | 高 |

## 方式一：Manus 平台部署（推荐）

Manus 平台提供一键部署功能，是最简单的部署方式。

### 步骤

1. **登录 Manus 平台**
   
   访问 https://manus.im 并登录您的账户。

2. **创建项目**
   
   在控制台中创建新项目，选择 "Web Application" 类型。

3. **连接 GitHub**
   
   将项目连接到 GitHub 仓库：
   - 仓库地址：`https://github.com/MightOfNoxus/spring-ai-chat-agent`

4. **配置环境变量**
   
   在项目设置中配置必要的环境变量（大部分已自动配置）。

5. **发布**
   
   点击 "Publish" 按钮，等待部署完成。

### 自定义域名

1. 在项目设置中找到 "Domains" 选项
2. 添加您的自定义域名
3. 按照提示配置 DNS 记录
4. 等待 SSL 证书自动签发

## 方式二：Docker Compose 部署

适合有自己服务器的用户，提供完整的控制权。

### 前置要求

- Ubuntu 22.04 或更高版本
- Docker 24.0+
- Docker Compose 2.0+
- 至少 2GB RAM
- 20GB 磁盘空间

### 安装 Docker

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 添加当前用户到 docker 组
sudo usermod -aG docker $USER

# 安装 Docker Compose
sudo apt install docker-compose-plugin

# 验证安装
docker --version
docker compose version
```

### 部署步骤

1. **克隆代码**

```bash
git clone https://github.com/MightOfNoxus/spring-ai-chat-agent.git
cd spring-ai-chat-agent
```

2. **创建环境配置**

```bash
# 创建 .env 文件
cat > .env << 'EOF'
# 数据库配置
DATABASE_URL=mysql://appuser:your-secure-password@mysql:3306/spring_ai_chat
MYSQL_ROOT_PASSWORD=your-root-password
MYSQL_DATABASE=spring_ai_chat
MYSQL_USER=appuser
MYSQL_PASSWORD=your-secure-password

# 应用安全
JWT_SECRET=your-very-long-random-secret-key-at-least-32-chars

# AI API 配置
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key

# OAuth 配置
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im

# 所有者信息
OWNER_OPEN_ID=your-open-id
OWNER_NAME=Your Name
EOF
```

3. **启动服务**

```bash
# 开发环境（不含 Nginx）
docker compose up -d

# 生产环境（含 Nginx）
docker compose --profile production up -d
```

4. **检查服务状态**

```bash
# 查看所有容器状态
docker compose ps

# 查看应用日志
docker compose logs -f app

# 查看数据库日志
docker compose logs -f mysql
```

5. **初始化数据库**

```bash
# 进入应用容器
docker compose exec app sh

# 运行数据库迁移
pnpm db:push
```

### 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker compose up -d --build
```

### 备份与恢复

**备份数据库：**

```bash
# 创建备份
docker compose exec mysql mysqldump -u root -p spring_ai_chat > backup.sql

# 恢复备份
docker compose exec -T mysql mysql -u root -p spring_ai_chat < backup.sql
```

**备份上传文件：**

```bash
# 备份 volumes
docker run --rm -v spring-ai-chat-agent_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql_backup.tar.gz /data
```

## 方式三：手动部署

适合需要完全自定义的高级用户。

### 系统要求

- Node.js 22+
- MySQL 8.0+
- Nginx（可选）
- PM2（进程管理）

### 部署步骤

1. **安装依赖**

```bash
# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 pnpm
npm install -g pnpm

# 安装 PM2
npm install -g pm2
```

2. **配置 MySQL**

```bash
# 安装 MySQL
sudo apt install mysql-server

# 创建数据库和用户
sudo mysql << 'EOF'
CREATE DATABASE spring_ai_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'appuser'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON spring_ai_chat.* TO 'appuser'@'localhost';
FLUSH PRIVILEGES;
EOF
```

3. **部署应用**

```bash
# 克隆代码
git clone https://github.com/MightOfNoxus/spring-ai-chat-agent.git
cd spring-ai-chat-agent

# 安装依赖
pnpm install

# 构建应用
pnpm build

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 运行数据库迁移
pnpm db:push

# 使用 PM2 启动
pm2 start dist/index.js --name spring-ai-chat
pm2 save
pm2 startup
```

4. **配置 Nginx**

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **配置 SSL（使用 Certbot）**

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 环境变量说明

| 变量名 | 必需 | 描述 |
|--------|------|------|
| `DATABASE_URL` | 是 | MySQL 连接字符串 |
| `JWT_SECRET` | 是 | JWT 签名密钥，至少 32 字符 |
| `BUILT_IN_FORGE_API_URL` | 是 | AI API 服务地址 |
| `BUILT_IN_FORGE_API_KEY` | 是 | AI API 密钥 |
| `VITE_APP_ID` | 是 | OAuth 应用 ID |
| `OAUTH_SERVER_URL` | 是 | OAuth 服务器地址 |
| `VITE_OAUTH_PORTAL_URL` | 是 | OAuth 登录页面地址 |
| `OWNER_OPEN_ID` | 否 | 项目所有者 ID |
| `OWNER_NAME` | 否 | 项目所有者名称 |
| `NODE_ENV` | 否 | 运行环境，默认 development |
| `PORT` | 否 | 服务端口，默认 3000 |

## 健康检查

应用提供以下健康检查端点：

- `GET /api/health` - 应用健康状态
- `GET /api/trpc/auth.me` - 认证服务状态

## 监控与日志

### 查看日志

```bash
# Docker 环境
docker compose logs -f app

# PM2 环境
pm2 logs spring-ai-chat
```

### 监控指标

建议使用以下工具进行监控：

- **Prometheus + Grafana**: 系统指标监控
- **Sentry**: 错误追踪
- **Uptime Robot**: 可用性监控

## 故障排除

### 常见问题

**1. 数据库连接失败**

```bash
# 检查 MySQL 状态
docker compose exec mysql mysqladmin -u root -p ping

# 检查连接字符串
echo $DATABASE_URL
```

**2. 应用启动失败**

```bash
# 查看详细日志
docker compose logs app --tail=100

# 检查端口占用
netstat -tlnp | grep 3000
```

**3. OAuth 登录失败**

- 确认 `VITE_APP_ID` 配置正确
- 确认回调 URL 已在 OAuth 服务器注册
- 检查 `OAUTH_SERVER_URL` 是否可访问

### 获取帮助

如果遇到问题，请：

1. 查看 [GitHub Issues](https://github.com/MightOfNoxus/spring-ai-chat-agent/issues)
2. 提交新的 Issue 并附上详细的错误日志
