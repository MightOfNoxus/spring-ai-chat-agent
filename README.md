# Spring AI Chat Agent

一个智能聊天应用，具备多轮对话、短期记忆和长期记忆功能，支持多种主流大模型。项目提供两套技术实现：

1. **Spring Boot + Spring AI 后端** + **Vue 3 + Element Plus 前端**（Java 技术栈）
2. **Node.js + tRPC 后端** + **React + shadcn/ui 前端**（Manus 平台优化版）

## 功能特性

### 核心功能

| 功能 | 描述 |
|------|------|
| **多轮对话** | 支持连续对话，AI 能够理解上下文，提供更准确的回答 |
| **短期记忆** | 会话级别的上下文窗口管理，保持当前对话的连贯性（默认 10 轮） |
| **长期记忆** | 基于向量数据库的语义检索，记住重要的对话内容 |
| **多模型支持** | 支持 OpenAI GPT-4、Azure OpenAI、Anthropic Claude 等 |
| **流式响应** | SSE 实时推送，流畅展示 AI 生成内容 |
| **对话导出** | 支持将对话历史导出为 Markdown 文件 |

## 技术架构

### Spring Boot 版本（Java 技术栈）

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Vue 3)                          │
│                 Element Plus + TypeScript                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 Backend (Spring Boot 3)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Spring AI  │  │   Memory    │  │    REST API         │  │
│  │  ChatClient │  │   Service   │  │    Controllers      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌─────────┐    ┌─────────┐    ┌─────────────┐
        │  MySQL  │    │  Redis  │    │ Vector Store│
        └─────────┘    └─────────┘    └─────────────┘
```

**后端技术栈：**
- Java 21 + Spring Boot 3.2
- Spring AI 1.0（多模型集成框架）
- Spring Data JPA + MySQL
- Server-Sent Events (SSE) 流式传输

**前端技术栈：**
- Vue 3 + TypeScript
- Element Plus UI 组件库
- Pinia 状态管理
- Vite 构建工具

### Node.js 版本（Manus 平台优化）

**后端技术栈：**
- Node.js + Express + tRPC
- Drizzle ORM + MySQL
- 内置向量存储

**前端技术栈：**
- React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- tRPC React Query

## 快速开始

### 环境要求

**Spring Boot 版本：**
- Java 21+
- Maven 3.9+
- MySQL 8.0+

**Node.js 版本：**
- Node.js 22+
- pnpm 10+
- MySQL 8.0+

### 方式一：Docker 部署（推荐）

```bash
# 克隆项目
git clone https://github.com/MightOfNoxus/spring-ai-chat-agent.git
cd spring-ai-chat-agent

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入 API Key

# 启动 Spring Boot 版本
docker-compose --profile spring up -d

# 或启动 Node.js 版本
docker-compose up -d
```

**访问地址：**
- Spring Boot 版本：前端 http://localhost:5173，后端 http://localhost:8080
- Node.js 版本：http://localhost:3000

### 方式二：本地开发

#### Spring Boot 后端

```bash
cd backend

# 配置环境变量
export DATABASE_URL=jdbc:mysql://localhost:3306/spring_ai_chat
export OPENAI_API_KEY=your-api-key

# 运行
./mvnw spring-boot:run
```

#### Vue 前端

```bash
cd frontend

# 安装依赖
pnpm install

# 开发模式
pnpm dev
```

#### Node.js 版本

```bash
# 安装依赖
pnpm install

# 初始化数据库
pnpm db:push

# 启动开发服务器
pnpm dev
```

## 配置说明

### 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| `DATABASE_URL` | 数据库连接 URL | - |
| `OPENAI_API_KEY` | OpenAI API 密钥 | - |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI API 密钥 | - |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI 端点 | - |
| `ANTHROPIC_API_KEY` | Anthropic Claude API 密钥 | - |
| `DEFAULT_AI_PROVIDER` | 默认 AI 提供商 | openai |
| `MEMORY_SHORT_TERM_SIZE` | 短期记忆窗口大小 | 10 |

### 支持的模型

| 提供商 | 模型 | 说明 |
|--------|------|------|
| OpenAI | gpt-4, gpt-4-turbo, gpt-3.5-turbo | 需要 OPENAI_API_KEY |
| Azure OpenAI | gpt-4 (Azure) | 需要 AZURE_OPENAI_API_KEY |
| Anthropic | claude-3-opus, claude-3-sonnet | 需要 ANTHROPIC_API_KEY |

## API 文档

### Spring Boot REST API

```http
# 创建会话
POST /api/chat/sessions
Content-Type: application/json
X-User-Id: 1

{
  "title": "新对话",
  "modelProvider": "openai",
  "modelName": "gpt-4"
}

# 发送消息（流式）
POST /api/chat/messages/stream
Content-Type: application/json
Accept: text/event-stream
X-User-Id: 1

{
  "sessionId": 1,
  "message": "你好"
}
```

### tRPC API（Node.js 版本）

| 接口 | 方法 | 描述 |
|------|------|------|
| `chat.getSessions` | Query | 获取用户所有会话 |
| `chat.createSession` | Mutation | 创建新会话 |
| `chat.sendMessage` | Mutation | 发送消息并获取回复 |
| `memory.searchMemories` | Query | 搜索相关记忆 |

## 项目结构

```
spring-ai-chat-agent/
├── backend/                    # Spring Boot 后端
│   ├── src/main/java/
│   │   └── com/example/chatbot/
│   │       ├── config/         # 配置类
│   │       ├── controller/     # REST 控制器
│   │       ├── entity/         # JPA 实体
│   │       ├── memory/         # 记忆服务
│   │       ├── repository/     # 数据仓库
│   │       └── service/        # 业务服务
│   ├── Dockerfile
│   └── pom.xml
├── frontend/                   # Vue 3 前端
│   ├── src/
│   │   ├── api/                # API 服务
│   │   ├── stores/             # Pinia 状态
│   │   └── views/              # 页面视图
│   ├── Dockerfile
│   └── package.json
├── client/                     # React 前端（Node.js 版本）
├── server/                     # Node.js 后端
├── drizzle/                    # 数据库 Schema
├── docker/                     # Docker 配置
├── docker-compose.yml
└── README.md
```

## 记忆系统设计

### 短期记忆

基于会话级别的滑动窗口机制，保留最近 N 轮对话作为上下文。

```java
// Spring AI 实现
public List<Message> getContextMessages(ChatSession session, int windowSize) {
    List<ChatMessage> recentMessages = messageRepository.findRecentMessages(
            session.getId(), 
            PageRequest.of(0, windowSize * 2)
    );
    return recentMessages.stream()
            .map(this::convertToSpringAiMessage)
            .collect(Collectors.toList());
}
```

### 长期记忆

使用向量嵌入技术，将重要对话内容转换为向量存储，支持语义相似度检索。

```java
// 语义检索
public List<MemoryVector> searchMemories(User user, String query, int topK) {
    SearchRequest searchRequest = SearchRequest.builder()
            .query(query)
            .topK(topK)
            .similarityThreshold(0.7)
            .filterExpression("userId == '" + user.getId() + "'")
            .build();
    
    return vectorStore.similaritySearch(searchRequest);
}
```

## 部署指南

### Docker Compose 部署

```bash
# Spring Boot 版本
docker-compose --profile spring up -d

# Node.js 版本
docker-compose up -d

# 生产环境（含 Nginx）
docker-compose --profile production up -d
```

### Manus 平台部署

1. 在 Manus 平台创建项目
2. 连接 GitHub 仓库
3. 配置环境变量
4. 点击发布按钮

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

- GitHub: [MightOfNoxus/spring-ai-chat-agent](https://github.com/MightOfNoxus/spring-ai-chat-agent)
