<template>
  <div class="chat-container">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="logo" v-if="!sidebarCollapsed">
          <el-icon><ChatDotRound /></el-icon>
          <span>AI Chat</span>
        </div>
        <el-button 
          class="collapse-btn"
          :icon="sidebarCollapsed ? Expand : Fold" 
          @click="sidebarCollapsed = !sidebarCollapsed"
          text
        />
      </div>

      <el-button 
        class="new-chat-btn" 
        type="primary" 
        @click="handleNewChat"
        :icon="Plus"
      >
        <span v-if="!sidebarCollapsed">新建对话</span>
      </el-button>

      <div class="sessions-list" v-if="!sidebarCollapsed">
        <div v-if="chatStore.sessions.length === 0" class="empty-sessions">
          暂无对话记录
        </div>
        <div
          v-for="session in chatStore.sortedSessions"
          :key="session.id"
          class="session-item"
          :class="{ active: chatStore.currentSession?.id === session.id }"
          @click="handleSelectSession(session)"
        >
          <el-icon><ChatLineSquare /></el-icon>
          <span class="session-title">{{ session.title }}</span>
          <el-dropdown trigger="click" @command="handleSessionAction($event, session)">
            <el-button :icon="MoreFilled" text size="small" @click.stop />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename">
                  <el-icon><Edit /></el-icon> 重命名
                </el-dropdown-item>
                <el-dropdown-item command="delete" divided>
                  <el-icon><Delete /></el-icon> 删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="sidebar-footer" v-if="!sidebarCollapsed">
        <div class="user-info">
          <el-avatar :size="32" :icon="UserFilled" />
          <span>用户</span>
        </div>
      </div>
    </aside>

    <!-- Main Chat Area -->
    <main class="chat-main">
      <!-- Header -->
      <header class="chat-header">
        <div class="header-left">
          <span class="chat-title">{{ chatStore.currentSession?.title || '新对话' }}</span>
        </div>
        <div class="header-right">
          <el-select 
            v-model="selectedModelKey" 
            placeholder="选择模型"
            @change="handleModelChange"
            style="width: 180px"
          >
            <el-option-group
              v-for="group in modelOptions"
              :key="group.label"
              :label="group.label"
            >
              <el-option
                v-for="model in group.options"
                :key="model.value"
                :label="model.label"
                :value="model.value"
              />
            </el-option-group>
          </el-select>
          <el-button :icon="Download" @click="handleExport" text>导出</el-button>
        </div>
      </header>

      <!-- Messages Area -->
      <div class="messages-container" ref="messagesContainer">
        <div v-if="chatStore.messages.length === 0" class="welcome-screen">
          <div class="welcome-icon">
            <el-icon :size="64"><Promotion /></el-icon>
          </div>
          <h2>开始新对话</h2>
          <p>我是一个具备记忆功能的 AI 助手，可以记住我们的对话内容，为您提供更加个性化的服务。</p>
          <div class="quick-prompts">
            <el-button 
              v-for="prompt in quickPrompts" 
              :key="prompt"
              @click="handleQuickPrompt(prompt)"
              round
            >
              {{ prompt }}
            </el-button>
          </div>
        </div>

        <div v-else class="messages-list">
          <div
            v-for="message in chatStore.messages"
            :key="message.id"
            class="message"
            :class="message.role"
          >
            <div class="message-avatar">
              <el-avatar v-if="message.role === 'user'" :icon="UserFilled" />
              <el-avatar v-else :icon="Monitor" style="background: var(--el-color-primary)" />
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-role">{{ message.role === 'user' ? '你' : 'AI' }}</span>
                <span class="message-time">{{ formatTime(message.createdAt) }}</span>
              </div>
              <div class="message-text" v-html="renderMarkdown(message.content)"></div>
            </div>
          </div>

          <div v-if="chatStore.isStreaming" class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-container">
        <div class="input-wrapper">
          <el-input
            v-model="inputMessage"
            type="textarea"
            :rows="1"
            :autosize="{ minRows: 1, maxRows: 5 }"
            placeholder="输入消息... (Shift+Enter 换行)"
            @keydown.enter.exact.prevent="handleSend"
            :disabled="chatStore.isStreaming"
          />
          <el-button
            class="send-btn"
            type="primary"
            :icon="Promotion"
            :loading="chatStore.isStreaming"
            :disabled="!inputMessage.trim() || chatStore.isStreaming"
            @click="handleSend"
            circle
          />
        </div>
        <div class="input-footer">
          <span>AI 可能会产生错误信息，请核实重要内容</span>
        </div>
      </div>
    </main>

    <!-- Rename Dialog -->
    <el-dialog v-model="renameDialogVisible" title="重命名对话" width="400px">
      <el-input v-model="newSessionTitle" placeholder="请输入新标题" />
      <template #footer>
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRename">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from 'vue'
import { useChatStore } from '@/stores/chat'
import type { Session } from '@/api/chat'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'
import {
  ChatDotRound,
  ChatLineSquare,
  Plus,
  Fold,
  Expand,
  MoreFilled,
  Edit,
  Delete,
  UserFilled,
  Monitor,
  Promotion,
  Download
} from '@element-plus/icons-vue'

const chatStore = useChatStore()

// State
const sidebarCollapsed = ref(false)
const inputMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const renameDialogVisible = ref(false)
const newSessionTitle = ref('')
const sessionToRename = ref<Session | null>(null)

// Model selection
const selectedModelKey = ref('openai/gpt-4')
const modelOptions = [
  {
    label: 'OpenAI',
    options: [
      { label: 'GPT-4', value: 'openai/gpt-4' },
      { label: 'GPT-4 Turbo', value: 'openai/gpt-4-turbo' },
      { label: 'GPT-3.5 Turbo', value: 'openai/gpt-3.5-turbo' }
    ]
  },
  {
    label: 'Azure OpenAI',
    options: [
      { label: 'GPT-4 (Azure)', value: 'azure/gpt-4' }
    ]
  },
  {
    label: 'Anthropic',
    options: [
      { label: 'Claude 3 Opus', value: 'anthropic/claude-3-opus' },
      { label: 'Claude 3 Sonnet', value: 'anthropic/claude-3-sonnet' }
    ]
  }
]

const quickPrompts = [
  '介绍一下你的记忆功能',
  '帮我写一段 Python 代码',
  '解释一下量子计算',
  '今天有什么新闻？'
]

// Methods
const handleNewChat = async () => {
  chatStore.clearCurrentSession()
}

const handleSelectSession = async (session: Session) => {
  await chatStore.fetchSession(session.id)
  scrollToBottom()
}

const handleSessionAction = (command: string, session: Session) => {
  if (command === 'rename') {
    sessionToRename.value = session
    newSessionTitle.value = session.title
    renameDialogVisible.value = true
  } else if (command === 'delete') {
    ElMessageBox.confirm('确定要删除这个对话吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      chatStore.deleteSessionById(session.id)
      ElMessage.success('删除成功')
    }).catch(() => {})
  }
}

const confirmRename = async () => {
  if (sessionToRename.value && newSessionTitle.value.trim()) {
    await chatStore.updateSessionTitle(sessionToRename.value.id, newSessionTitle.value)
    renameDialogVisible.value = false
    ElMessage.success('重命名成功')
  }
}

const handleModelChange = (value: string) => {
  const [provider, name] = value.split('/')
  chatStore.setModel(provider, name)
}

const handleSend = async () => {
  if (!inputMessage.value.trim() || chatStore.isStreaming) return
  
  const message = inputMessage.value
  inputMessage.value = ''
  
  await chatStore.sendMessage(message, true)
  scrollToBottom()
}

const handleQuickPrompt = (prompt: string) => {
  inputMessage.value = prompt
  handleSend()
}

const handleExport = () => {
  if (chatStore.messages.length === 0) {
    ElMessage.warning('暂无对话内容可导出')
    return
  }
  
  let markdown = `# ${chatStore.currentSession?.title || '对话记录'}\n\n`
  markdown += `导出时间：${new Date().toLocaleString()}\n\n---\n\n`
  
  for (const msg of chatStore.messages) {
    const role = msg.role === 'user' ? '**用户**' : '**AI**'
    markdown += `${role}：\n\n${msg.content}\n\n---\n\n`
  }
  
  const blob = new Blob([markdown], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chat-${Date.now()}.md`
  a.click()
  URL.revokeObjectURL(url)
  
  ElMessage.success('导出成功')
}

const renderMarkdown = (content: string) => {
  if (!content) return ''
  
  marked.setOptions({
    highlight: (code, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        return hljs.highlight(code, { language: lang }).value
      }
      return hljs.highlightAuto(code).value
    }
  })
  
  return DOMPurify.sanitize(marked.parse(content) as string)
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
    }
  })
}

// Watch for new messages
watch(() => chatStore.messages.length, () => {
  scrollToBottom()
})

// Initialize
onMounted(async () => {
  await chatStore.fetchSessions()
  
  // Initialize model from store
  selectedModelKey.value = `${chatStore.selectedModel.provider}/${chatStore.selectedModel.name}`
})
</script>

<style lang="scss" scoped>
.chat-container {
  display: flex;
  height: 100vh;
  background: #f5f7fa;
}

.sidebar {
  width: 280px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;

  &.collapsed {
    width: 60px;
  }
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.new-chat-btn {
  margin: 16px;
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.empty-sessions {
  text-align: center;
  color: #909399;
  padding: 20px;
}

.session-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: #f5f7fa;
  }

  &.active {
    background: var(--el-color-primary-light-9);
  }

  .session-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e4e7ed;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.header-left {
  .chat-title {
    font-size: 16px;
    font-weight: 500;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;

  .welcome-icon {
    color: var(--el-color-primary);
    margin-bottom: 16px;
  }

  h2 {
    margin: 0 0 8px;
    color: #303133;
  }

  p {
    color: #909399;
    max-width: 400px;
    margin-bottom: 24px;
  }

  .quick-prompts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
  }
}

.messages-list {
  max-width: 800px;
  margin: 0 auto;
}

.message {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;

  &.user {
    flex-direction: row-reverse;

    .message-content {
      align-items: flex-end;
    }

    .message-text {
      background: var(--el-color-primary);
      color: #fff;
    }
  }
}

.message-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 70%;
}

.message-header {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}

.message-text {
  padding: 12px 16px;
  background: #fff;
  border-radius: 12px;
  line-height: 1.6;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

  :deep(pre) {
    background: #f5f7fa;
    padding: 12px;
    border-radius: 8px;
    overflow-x: auto;
  }

  :deep(code) {
    font-family: 'Fira Code', monospace;
    font-size: 14px;
  }

  :deep(p) {
    margin: 0 0 8px;

    &:last-child {
      margin-bottom: 0;
    }
  }
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: #fff;
  border-radius: 12px;
  width: fit-content;

  span {
    width: 8px;
    height: 8px;
    background: var(--el-color-primary);
    border-radius: 50%;
    animation: typing 1.4s infinite ease-in-out;

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes typing {
  0%, 80%, 100% {
    transform: scale(0.6);
    opacity: 0.6;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.input-container {
  padding: 16px 24px;
  background: #fff;
  border-top: 1px solid #e4e7ed;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  max-width: 800px;
  margin: 0 auto;

  :deep(.el-textarea__inner) {
    resize: none;
    border-radius: 12px;
    padding: 12px 16px;
  }
}

.send-btn {
  flex-shrink: 0;
}

.input-footer {
  text-align: center;
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

// Responsive
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);

    &:not(.collapsed) {
      transform: translateX(0);
    }
  }

  .message-content {
    max-width: 85%;
  }
}
</style>
