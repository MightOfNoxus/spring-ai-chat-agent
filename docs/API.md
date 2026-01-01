# API 接口文档

本文档详细描述了 Spring AI Chat Agent 的所有 API 接口。

## 概述

本项目使用 tRPC 作为 API 框架，所有接口通过 `/api/trpc` 端点访问。tRPC 提供端到端的类型安全，前端可以直接使用 TypeScript 类型。

## 认证

所有需要认证的接口使用 `protectedProcedure`，未认证用户将收到 401 错误。认证通过 OAuth 完成，登录后会设置 session cookie。

## 接口详情

### 认证模块 (auth)

#### auth.me

获取当前登录用户信息。

**类型：** Query

**认证：** 不需要

**参数：** 无

**返回值：**
```typescript
{
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  role: "user" | "admin";
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
} | null
```

**示例：**
```typescript
const { data: user } = trpc.auth.me.useQuery();
```

---

#### auth.logout

用户登出，清除 session cookie。

**类型：** Mutation

**认证：** 不需要

**参数：** 无

**返回值：**
```typescript
{ success: true }
```

**示例：**
```typescript
const logoutMutation = trpc.auth.logout.useMutation();
await logoutMutation.mutateAsync();
```

---

### 聊天模块 (chat)

#### chat.getSessions

获取当前用户的所有聊天会话。

**类型：** Query

**认证：** 需要

**参数：** 无

**返回值：**
```typescript
Array<{
  id: number;
  userId: number;
  title: string | null;
  modelProvider: string | null;
  modelName: string | null;
  systemPrompt: string | null;
  contextWindowSize: number | null;
  isActive: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}>
```

---

#### chat.getSession

获取指定会话的详细信息和消息历史。

**类型：** Query

**认证：** 需要

**参数：**
```typescript
{
  sessionId: number;
}
```

**返回值：**
```typescript
{
  session: ChatSession;
  messages: Array<ChatMessage>;
}
```

---

#### chat.createSession

创建新的聊天会话。

**类型：** Mutation

**认证：** 需要

**参数：**
```typescript
{
  title?: string;           // 会话标题，默认 "New Chat"
  modelProvider?: string;   // 模型提供商，默认 "openai"
  modelName?: string;       // 模型名称，默认 "gpt-4"
  systemPrompt?: string;    // 系统提示词
  contextWindowSize?: number; // 上下文窗口大小，默认 10
}
```

**返回值：**
```typescript
{
  sessionId: number;
}
```

---

#### chat.sendMessage

发送消息并获取 AI 回复。

**类型：** Mutation

**认证：** 需要

**参数：**
```typescript
{
  sessionId?: number;       // 会话 ID，不提供则创建新会话
  message: string;          // 用户消息内容
  modelProvider?: string;   // 模型提供商
  modelName?: string;       // 模型名称
  systemPrompt?: string;    // 系统提示词
  contextWindowSize?: number; // 上下文窗口大小
}
```

**返回值：**
```typescript
{
  sessionId: number;
  messageId: number;
  content: string;
  role: "assistant";
  modelUsed: string;
}
```

---

#### chat.updateTitle

更新会话标题。

**类型：** Mutation

**认证：** 需要

**参数：**
```typescript
{
  sessionId: number;
  title: string;  // 1-255 字符
}
```

**返回值：**
```typescript
{ success: true }
```

---

#### chat.deleteSession

删除（软删除）会话。

**类型：** Mutation

**认证：** 需要

**参数：**
```typescript
{
  sessionId: number;
}
```

**返回值：**
```typescript
{ success: true }
```

---

### 模型模块 (models)

#### models.getModels

获取所有可用的 AI 模型配置。

**类型：** Query

**认证：** 需要

**参数：** 无

**返回值：**
```typescript
Array<{
  id: number;
  provider: string;
  modelName: string;
  displayName: string;
  description: string | null;
  maxTokens: number | null;
  isEnabled: boolean | null;
  createdAt: Date;
}>
```

---

### 记忆模块 (memory)

#### memory.getMemories

获取用户的长期记忆列表。

**类型：** Query

**认证：** 需要

**参数：**
```typescript
{
  limit?: number;  // 返回数量限制，默认 50
}
```

**返回值：**
```typescript
Array<{
  id: number;
  userId: number;
  sessionId: number | null;
  content: string;
  summary: string | null;
  embedding: number[] | null;
  importance: number | null;
  accessCount: number | null;
  lastAccessedAt: Date | null;
  createdAt: Date;
}>
```

---

#### memory.storeMemory

手动存储内容到长期记忆。

**类型：** Mutation

**认证：** 需要

**参数：**
```typescript
{
  content: string;       // 要存储的内容
  sessionId?: number;    // 关联的会话 ID
}
```

**返回值：**
```typescript
{
  memoryId: number;
}
```

---

#### memory.searchMemories

搜索相关记忆。

**类型：** Query

**认证：** 需要

**参数：**
```typescript
{
  query: string;    // 搜索查询
  topK?: number;    // 返回结果数量，默认 5
}
```

**返回值：**
```typescript
Array<MemoryVector>
```

---

### 导出模块 (export)

#### export.getExports

获取用户的导出文件列表。

**类型：** Query

**认证：** 需要

**参数：** 无

**返回值：**
```typescript
Array<{
  id: number;
  userId: number;
  sessionId: number;
  fileName: string;
  fileType: "pdf" | "markdown";
  fileUrl: string;
  fileKey: string;
  fileSize: number | null;
  createdAt: Date;
}>
```

---

#### export.exportMarkdown

将会话导出为 Markdown 文件。

**类型：** Mutation

**认证：** 需要

**参数：**
```typescript
{
  sessionId: number;
}
```

**返回值：**
```typescript
{
  url: string;      // 文件下载 URL
  fileName: string; // 文件名
}
```

---

### 通知模块 (notification)

#### notification.reportIssue

向项目所有者报告问题。

**类型：** Mutation

**认证：** 需要

**参数：**
```typescript
{
  title: string;           // 问题标题
  description: string;     // 问题描述
  errorDetails?: string;   // 错误详情
}
```

**返回值：**
```typescript
{
  success: boolean;
}
```

---

## 错误处理

所有接口在发生错误时会抛出 TRPCError，包含以下信息：

```typescript
{
  code: string;      // 错误代码
  message: string;   // 错误消息
}
```

常见错误代码：

| 代码 | 描述 |
|------|------|
| `UNAUTHORIZED` | 未认证 |
| `FORBIDDEN` | 无权限 |
| `NOT_FOUND` | 资源不存在 |
| `BAD_REQUEST` | 请求参数错误 |
| `INTERNAL_SERVER_ERROR` | 服务器内部错误 |

## 使用示例

### 完整的聊天流程

```typescript
import { trpc } from '@/lib/trpc';

// 1. 创建新会话
const createSession = trpc.chat.createSession.useMutation();
const { sessionId } = await createSession.mutateAsync({
  title: "我的对话",
  modelName: "gpt-4"
});

// 2. 发送消息
const sendMessage = trpc.chat.sendMessage.useMutation();
const response = await sendMessage.mutateAsync({
  sessionId,
  message: "你好，请介绍一下自己"
});

console.log(response.content);

// 3. 获取历史消息
const { data: sessionData } = trpc.chat.getSession.useQuery({ sessionId });
console.log(sessionData?.messages);

// 4. 导出对话
const exportMd = trpc.export.exportMarkdown.useMutation();
const { url } = await exportMd.mutateAsync({ sessionId });
window.open(url, '_blank');
```
