# Project TODO

## 核心功能（已完成 - Node.js 版本）
- [x] 数据库架构设计（用户表、会话表、消息表、记忆向量表）
- [x] 后端对话管理 API（创建会话、发送消息、历史查询）
- [x] 多模型集成支持（OpenAI、Azure OpenAI、Claude、Gemini）
- [x] 短期记忆功能（会话级上下文窗口管理）
- [x] 长期记忆功能（向量数据库语义检索）
- [x] 流式响应支持（SSE 实时推送）

## 前端功能（已完成）
- [x] 响应式聊天界面（Element Plus 组件）
- [x] 移动端适配
- [x] 流式消息显示
- [x] 会话管理（创建、切换、删除）
- [x] 消息历史展示

## 高级功能（已完成）
- [x] 对话导出（PDF/Markdown）
- [x] 云端存储导出文件
- [x] 异常通知功能
- [x] 向量数据库集成

## 部署与文档（已完成）
- [x] Dockerfile 配置
- [x] docker-compose.yml 配置
- [x] 环境配置说明文档
- [x] API 接口文档
- [x] 部署指南
- [x] 使用说明

## GitHub（已完成）
- [x] 代码推送到 GitHub 仓库

---

## Spring Boot + Spring AI 重构（进行中）
- [x] 创建 Spring Boot 项目结构（Maven/Gradle）
- [x] 配置 Spring AI 依赖和多模型支持
- [x] 实现 ChatClient 多模型集成（OpenAI、Azure、Claude、Gemini）
- [x] 实现短期记忆（MessageChatMemoryAdvisor）
- [x] 实现长期记忆（VectorStore + 语义检索）
- [x] 创建 RESTful API 控制器
- [x] 实现 SSE 流式响应
- [x] 数据库实体和 Repository（JPA）
- [x] 创建 Vue 3 + Element Plus 前端项目
- [x] 前后端集成测试
- [x] 更新 Docker 配置
- [x] 更新项目文档
- [ ] 推送更新到 GitHub
