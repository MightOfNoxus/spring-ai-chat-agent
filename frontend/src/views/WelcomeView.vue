<template>
  <div class="welcome-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="logo-icon">
          <el-icon :size="80"><Promotion /></el-icon>
        </div>
        <h1>Spring AI Chat Agent</h1>
        <p class="subtitle">
          一个具备多轮对话、短期记忆和长期记忆功能的智能聊天助手
        </p>
        <div class="cta-buttons">
          <el-button type="primary" size="large" @click="goToChat">
            <el-icon><ChatDotRound /></el-icon>
            开始对话
          </el-button>
          <el-button size="large" @click="openGitHub">
            <el-icon><Link /></el-icon>
            查看源码
          </el-button>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <h2>核心功能</h2>
      <div class="features-grid">
        <div class="feature-card" v-for="feature in features" :key="feature.title">
          <div class="feature-icon">
            <el-icon :size="32"><component :is="feature.icon" /></el-icon>
          </div>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </div>
      </div>
    </section>

    <!-- Tech Stack Section -->
    <section class="tech-stack">
      <h2>技术栈</h2>
      <div class="tech-tags">
        <el-tag v-for="tech in techStack" :key="tech" size="large" effect="plain">
          {{ tech }}
        </el-tag>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p>Built with Spring AI and Vue 3</p>
      <a href="https://github.com/MightOfNoxus/spring-ai-chat-agent" target="_blank">
        GitHub Repository
      </a>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  Promotion,
  ChatDotRound,
  Link,
  ChatLineSquare,
  Cpu,
  DataLine,
  Connection,
  Lightning,
  Shield
} from '@element-plus/icons-vue'

const router = useRouter()

const features = [
  {
    icon: ChatLineSquare,
    title: '多轮对话',
    description: '支持连续对话，AI 能够理解上下文，提供更准确的回答'
  },
  {
    icon: Cpu,
    title: '短期记忆',
    description: '会话级别的上下文管理，保持当前对话的连贯性'
  },
  {
    icon: DataLine,
    title: '长期记忆',
    description: '基于向量数据库的语义检索，记住重要的对话内容'
  },
  {
    icon: Connection,
    title: '多模型支持',
    description: '支持 OpenAI、Claude、Gemini 等主流大模型'
  },
  {
    icon: Lightning,
    title: '流式响应',
    description: '实时展示 AI 生成内容，提供流畅的交互体验'
  },
  {
    icon: Shield,
    title: '安全可靠',
    description: '数据加密存储，支持 Docker 容器化部署'
  }
]

const techStack = [
  'Spring Boot 3',
  'Spring AI',
  'Vue 3',
  'Element Plus',
  'TypeScript',
  'MySQL',
  'Vector Database',
  'Docker',
  'SSE Streaming'
]

const goToChat = () => {
  router.push('/')
}

const openGitHub = () => {
  window.open('https://github.com/MightOfNoxus/spring-ai-chat-agent', '_blank')
}
</script>

<style lang="scss" scoped>
.welcome-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.hero {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 40px 20px;
  text-align: center;
  color: #fff;
}

.hero-content {
  max-width: 600px;
}

.logo-icon {
  margin-bottom: 24px;
  opacity: 0.9;
}

h1 {
  font-size: 48px;
  font-weight: 700;
  margin: 0 0 16px;
}

.subtitle {
  font-size: 20px;
  opacity: 0.9;
  margin-bottom: 32px;
}

.cta-buttons {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
}

.features {
  background: #fff;
  padding: 80px 20px;
  text-align: center;

  h2 {
    font-size: 32px;
    margin-bottom: 48px;
    color: #303133;
  }
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  padding: 32px;
  border-radius: 16px;
  background: #f5f7fa;
  transition: transform 0.3s, box-shadow 0.3s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  }

  .feature-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 16px;
    color: #fff;
  }

  h3 {
    font-size: 20px;
    margin: 0 0 12px;
    color: #303133;
  }

  p {
    color: #606266;
    line-height: 1.6;
    margin: 0;
  }
}

.tech-stack {
  background: #f5f7fa;
  padding: 60px 20px;
  text-align: center;

  h2 {
    font-size: 28px;
    margin-bottom: 32px;
    color: #303133;
  }
}

.tech-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  max-width: 800px;
  margin: 0 auto;
}

.footer {
  background: #303133;
  color: #fff;
  padding: 32px 20px;
  text-align: center;

  p {
    margin: 0 0 8px;
    opacity: 0.8;
  }

  a {
    color: #fff;
    opacity: 0.6;
    transition: opacity 0.2s;

    &:hover {
      opacity: 1;
    }
  }
}

@media (max-width: 768px) {
  h1 {
    font-size: 32px;
  }

  .subtitle {
    font-size: 16px;
  }
}
</style>
