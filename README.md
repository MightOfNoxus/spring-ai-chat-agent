# Spring AI Chat Agent

一个基于 Spring AI 概念和 Vue 3 构建的智能聊天应用，具备多轮对话、短期记忆和长期记忆功能，支持多种主流大模型。

## 功能特性

### 核心功能

| 功能 | 描述 |
|------|------|
| **多轮对话** | 支持连续对话，AI 能够理解上下文，提供更准确的回答 |
| **短期记忆** | 会话级别的上下文窗口管理，保持当前对话的连贯性 |
| **长期记忆** | 基于向量数据库的语义检索，记住重要的对话内容 |
| **多模型支持** | 支持 OpenAI GPT-4、Claude、Gemini 等主流大模型 |
| **流式响应** | 实时展示 AI 生成内容，提供流畅的交互体验 |
| **对话导出** | 支持将对话历史导出为 Markdown 文件并存储到云端 |

### 技术架构

本项目采用现代化的全栈技术架构，前后端分离设计，确保高性能和可扩展性。

**后端技术栈：**
- Node.js + Express + tRPC
- Drizzle ORM + MySQL
- 内置向量存储（可扩展至 Pinecone/Qdrant）
- Server-Sent Events (SSE) 流式传输

**前端技术栈：**
- React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- tRPC React Query
- Streamdown (Markdown 渲染)

## 快速开始

### 环境要求

- Node.js 22+
- pnpm 10+
- MySQL 8.0+
- Docker & Docker Compose (可选，用于容器化部署)

### 本地开发

1. **克隆仓库**

```bash
git clone https://github.com/MightOfNoxus/spring-ai-chat-agent.git
cd spring-ai-chat-agent
```

2. **安装依赖**

```bash
pnpm install
```

3. **配置环境变量**

创建 `.env` 文件并配置必要的环境变量：

```bash
# 数据库配置
DATABASE_URL=mysql://user:password@localhost:3306/spring_ai_chat

# JWT 密钥
JWT_SECRET=your-secret-key

# AI API 配置
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key
```

4. **初始化数据库**

```bash
pnpm db:push
```

5. **启动开发服务器**

```bash
pnpm dev
```

访问 http://localhost:3000 即可使用应用。

### Docker 部署

1. **使用 Docker Compose 启动**

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

2. **生产环境部署**

```bash
# 包含 Nginx 反向代理
docker-compose --profile production up -d
```

## 项目结构

```
spring-ai-chat-agent/
├── client/                 # 前端代码
│   ├── src/
│   │   ├── components/     # 可复用组件
│   │   ├── pages/          # 页面组件
│   │   ├── lib/            # 工具库
│   │   └── App.tsx         # 应用入口
│   └── index.html
├── server/                 # 后端代码
│   ├── _core/              # 核心框架代码
│   ├── db.ts               # 数据库操作
│   ├── routers.ts          # API 路由
│   ├── chat.ts             # 聊天服务
│   ├── memory.ts           # 记忆管理
│   └── embedding.ts        # 向量嵌入
├── drizzle/                # 数据库 Schema
│   └── schema.ts
├── docker/                 # Docker 配置
│   ├── nginx/
│   └── mysql/
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## API 接口文档

### 认证接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `auth.me` | Query | 获取当前用户信息 |
| `auth.logout` | Mutation | 用户登出 |

### 聊天接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `chat.getSessions` | Query | 获取用户所有会话 |
| `chat.getSession` | Query | 获取指定会话详情 |
| `chat.createSession` | Mutation | 创建新会话 |
| `chat.sendMessage` | Mutation | 发送消息并获取回复 |
| `chat.updateTitle` | Mutation | 更新会话标题 |
| `chat.deleteSession` | Mutation | 删除会话 |

### 记忆接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `memory.getMemories` | Query | 获取用户长期记忆 |
| `memory.storeMemory` | Mutation | 存储内容到长期记忆 |
| `memory.searchMemories` | Query | 搜索相关记忆 |

### 导出接口

| 接口 | 方法 | 描述 |
|------|------|------|
| `export.getExports` | Query | 获取导出文件列表 |
| `export.exportMarkdown` | Mutation | 导出会话为 Markdown |

## 记忆系统说明

### 短期记忆

短期记忆基于会话级别的上下文窗口管理，默认保留最近 10 轮对话。每次发送消息时，系统会自动将最近的对话历史作为上下文发送给 AI 模型。

配置参数：
- `contextWindowSize`: 上下文窗口大小，默认 10

### 长期记忆

长期记忆使用向量嵌入技术，将重要的对话内容转换为向量并存储。当用户发起新对话时，系统会自动检索相关的历史记忆，并将其作为额外上下文提供给 AI。

工作流程：
1. 对话完成后，系统评估内容重要性
2. 重要内容生成摘要和向量嵌入
3. 存储到向量数据库
4. 新对话时进行语义检索
5. 相关记忆注入到系统提示中

## 支持的模型

| 提供商 | 模型 | 描述 |
|--------|------|------|
| OpenAI | GPT-4 | 最强大的通用模型 |
| OpenAI | GPT-4 Turbo | 更快更便宜的版本 |
| OpenAI | GPT-3.5 Turbo | 快速高效的模型 |
| Anthropic | Claude 3 Opus | 最强大的 Claude 模型 |
| Anthropic | Claude 3 Sonnet | 平衡性能和成本 |
| Google | Gemini Pro | 多模态能力强 |
| Azure | GPT-4 | 企业级 OpenAI 服务 |

## 部署指南

### 使用 Manus 平台部署

本项目已针对 Manus 平台优化，支持一键部署：

1. 在 Manus 平台创建项目
2. 连接 GitHub 仓库
3. 配置环境变量
4. 点击发布按钮

### 自托管部署

1. **准备服务器**
   - Ubuntu 22.04 或更高版本
   - 至少 2GB RAM
   - Docker 和 Docker Compose

2. **配置域名和 SSL**
   - 将域名指向服务器 IP
   - 配置 SSL 证书（推荐使用 Let's Encrypt）

3. **部署应用**

```bash
# 克隆代码
git clone https://github.com/MightOfNoxus/spring-ai-chat-agent.git
cd spring-ai-chat-agent

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件

# 启动服务
docker-compose --profile production up -d
```

## 开发指南

### 添加新功能

1. 在 `drizzle/schema.ts` 中定义数据模型
2. 运行 `pnpm db:push` 同步数据库
3. 在 `server/db.ts` 中添加数据库操作
4. 在 `server/routers.ts` 中添加 API 路由
5. 在前端调用 tRPC hooks

### 代码规范

```bash
# 类型检查
pnpm check

# 代码格式化
pnpm format

# 运行测试
pnpm test
```

## 常见问题

**Q: 如何切换 AI 模型？**

A: 在聊天界面右上角的下拉菜单中选择不同的模型。

**Q: 长期记忆如何工作？**

A: 系统会自动评估对话内容的重要性，将重要内容存储为向量。在新对话中，系统会检索相关记忆并提供给 AI 作为参考。

**Q: 如何导出对话历史？**

A: 点击聊天界面右上角的下载按钮，选择导出格式即可。

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

- GitHub: [MightOfNoxus/spring-ai-chat-agent](https://github.com/MightOfNoxus/spring-ai-chat-agent)
