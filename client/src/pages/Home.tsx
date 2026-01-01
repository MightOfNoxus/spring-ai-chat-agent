import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Brain, MessageSquare, Database, Zap, Shield, Globe } from "lucide-react";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = [
    {
      icon: MessageSquare,
      title: "多轮对话",
      description: "支持连续对话，AI 能够理解上下文，提供更准确的回答"
    },
    {
      icon: Brain,
      title: "短期记忆",
      description: "会话级别的上下文管理，保持当前对话的连贯性"
    },
    {
      icon: Database,
      title: "长期记忆",
      description: "基于向量数据库的语义检索，记住重要的对话内容"
    },
    {
      icon: Globe,
      title: "多模型支持",
      description: "支持 OpenAI、Claude、Gemini 等主流大模型"
    },
    {
      icon: Zap,
      title: "流式响应",
      description: "实时展示 AI 生成内容，提供流畅的交互体验"
    },
    {
      icon: Shield,
      title: "安全可靠",
      description: "数据加密存储，支持 Docker 容器化部署"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 size-80 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 size-80 rounded-full bg-purple-500/10 blur-3xl" />
        </div>

        <div className="relative container mx-auto px-4 py-20">
          <div className="text-center space-y-8 max-w-4xl mx-auto">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="rounded-2xl bg-primary/10 p-6 backdrop-blur">
                <Sparkles className="size-16 text-primary" />
              </div>
            </div>

            {/* Title */}
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground">
                Spring AI Chat Agent
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
                一个具备多轮对话、短期记忆和长期记忆功能的智能聊天助手
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Button size="lg" className="text-lg px-8" onClick={() => setLocation("/chat")}>
                  <MessageSquare className="size-5 mr-2" />
                  开始对话
                </Button>
              ) : (
                <Button size="lg" className="text-lg px-8" onClick={() => window.location.href = getLoginUrl()}>
                  <Sparkles className="size-5 mr-2" />
                  登录开始使用
                </Button>
              )}
              <Button size="lg" variant="outline" className="text-lg px-8" asChild>
                <a href="https://github.com/MightOfNoxus/spring-ai-chat-agent" target="_blank" rel="noopener noreferrer">
                  查看源码
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-foreground mb-4">核心功能</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            基于 Spring AI 框架构建，集成多种先进技术，提供智能化的对话体验
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group p-6 rounded-2xl bg-card border shadow-sm hover:shadow-md transition-all duration-300"
            >
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="size-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tech Stack Section */}
      <div className="bg-card/50 backdrop-blur border-y">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">技术栈</h2>
            <p className="text-muted-foreground">
              采用现代化的技术架构，确保高性能和可扩展性
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 max-w-4xl mx-auto">
            {[
              "Spring Boot",
              "Spring AI",
              "Vue 3",
              "Element Plus",
              "TypeScript",
              "MySQL",
              "Vector Database",
              "Docker",
              "SSE Streaming"
            ].map((tech, index) => (
              <span
                key={index}
                className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground text-sm">
          <p>Built with Spring AI and Vue 3</p>
          <p className="mt-2">
            <a 
              href="https://github.com/MightOfNoxus/spring-ai-chat-agent" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              GitHub Repository
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
