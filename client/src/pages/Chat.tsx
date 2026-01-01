import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { 
  MessageSquare, 
  Plus, 
  Send, 
  Loader2, 
  Settings, 
  Trash2, 
  Edit3,
  Download,
  Menu,
  X,
  Sparkles,
  User,
  MoreVertical,
  FileText,
  AlertCircle
} from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { Streamdown } from "streamdown";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

type Message = {
  id?: number;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
};

export default function Chat() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<{ id: number; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4");
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const utils = trpc.useUtils();

  // Fetch sessions
  const { data: sessions, isLoading: sessionsLoading } = trpc.chat.getSessions.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch models
  const { data: models } = trpc.models.getModels.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch current session messages
  const { data: sessionData, isLoading: messagesLoading } = trpc.chat.getSession.useQuery(
    { sessionId: activeSessionId! },
    { enabled: !!activeSessionId && isAuthenticated }
  );

  // Mutations
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (response) => {
      setMessages(prev => [...prev, {
        id: response.messageId,
        role: "assistant",
        content: response.content,
        createdAt: new Date()
      }]);
      setIsStreaming(false);
      setStreamingContent("");
      utils.chat.getSessions.invalidate();
    },
    onError: (error) => {
      toast.error("发送消息失败: " + error.message);
      setIsStreaming(false);
    }
  });

  const createSessionMutation = trpc.chat.createSession.useMutation({
    onSuccess: (data) => {
      setActiveSessionId(data.sessionId);
      setMessages([]);
      utils.chat.getSessions.invalidate();
      setMobileMenuOpen(false);
    }
  });

  const deleteSessionMutation = trpc.chat.deleteSession.useMutation({
    onSuccess: () => {
      if (sessions && sessions.length > 1) {
        const remaining = sessions.filter(s => s.id !== activeSessionId);
        setActiveSessionId(remaining[0]?.id || null);
      } else {
        setActiveSessionId(null);
        setMessages([]);
      }
      utils.chat.getSessions.invalidate();
      toast.success("会话已删除");
    }
  });

  const updateTitleMutation = trpc.chat.updateTitle.useMutation({
    onSuccess: () => {
      utils.chat.getSessions.invalidate();
      setEditDialogOpen(false);
      toast.success("标题已更新");
    }
  });

  const exportMarkdownMutation = trpc.export.exportMarkdown.useMutation({
    onSuccess: (data) => {
      window.open(data.url, '_blank');
      toast.success("导出成功");
    },
    onError: (error) => {
      toast.error("导出失败: " + error.message);
    }
  });

  // Update messages when session data changes
  useEffect(() => {
    if (sessionData?.messages) {
      setMessages(sessionData.messages.map(m => ({
        id: m.id,
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        createdAt: m.createdAt
      })));
    }
  }, [sessionData]);

  // Auto-select first session
  useEffect(() => {
    if (sessions && sessions.length > 0 && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement;
    if (viewport) {
      requestAnimationFrame(() => {
        viewport.scrollTo({ top: viewport.scrollHeight, behavior: 'smooth' });
      });
    }
  }, [messages, streamingContent]);

  // Handle mobile sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
        setMobileMenuOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      createdAt: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsStreaming(true);

    // Find selected model info
    const modelInfo = models?.find(m => m.modelName === selectedModel);

    sendMessageMutation.mutate({
      sessionId: activeSessionId || undefined,
      message: userMessage.content,
      modelProvider: modelInfo?.provider || "openai",
      modelName: selectedModel
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    createSessionMutation.mutate({
      modelName: selectedModel
    });
  };

  const handleEditTitle = (session: { id: number; title: string | null }) => {
    setEditingSession({ id: session.id, title: session.title || "" });
    setNewTitle(session.title || "");
    setEditDialogOpen(true);
  };

  const handleSaveTitle = () => {
    if (editingSession && newTitle.trim()) {
      updateTitleMutation.mutate({
        sessionId: editingSession.id,
        title: newTitle.trim()
      });
    }
  };

  const handleExport = () => {
    if (activeSessionId) {
      exportMarkdownMutation.mutate({ sessionId: activeSessionId });
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <Sparkles className="size-12 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Spring AI Chat Agent</h1>
          <p className="text-muted-foreground max-w-md">
            一个具备多轮对话、短期记忆和长期记忆功能的智能聊天助手，支持多种主流大模型。
          </p>
        </div>
        <Button size="lg" onClick={() => window.location.href = getLoginUrl()}>
          登录开始使用
        </Button>
      </div>
    );
  }

  const displayMessages = messages.filter(m => m.role !== "system");

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:relative z-50 h-full w-72 bg-card border-r flex flex-col transition-transform duration-300",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        !sidebarOpen && "md:w-0 md:border-0 md:overflow-hidden"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles className="size-5 text-primary" />
            <span>AI Chat</span>
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <Button 
            className="w-full gap-2" 
            onClick={handleNewChat}
            disabled={createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            新建对话
          </Button>
        </div>

        {/* Sessions List */}
        <ScrollArea className="flex-1 px-2">
          <div className="space-y-1 pb-4">
            {sessionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : sessions && sessions.length > 0 ? (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors",
                    activeSessionId === session.id
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  )}
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setMobileMenuOpen(false);
                  }}
                >
                  <MessageSquare className="size-4 shrink-0" />
                  <span className="flex-1 truncate text-sm">
                    {session.title || "新对话"}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditTitle(session)}>
                        <Edit3 className="size-4 mr-2" />
                        重命名
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => deleteSessionMutation.mutate({ sessionId: session.id })}
                      >
                        <Trash2 className="size-4 mr-2" />
                        删除
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                暂无对话记录
              </div>
            )}
          </div>
        </ScrollArea>

        {/* User Info */}
        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="size-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || "用户"}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b flex items-center justify-between px-4 bg-card/50 backdrop-blur shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:flex"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="size-5" />
            </Button>
            <h1 className="font-medium truncate">
              {sessionData?.session?.title || "新对话"}
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Model Selector */}
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="选择模型" />
              </SelectTrigger>
              <SelectContent>
                {models?.map((model) => (
                  <SelectItem key={model.id} value={model.modelName}>
                    {model.displayName}
                  </SelectItem>
                )) || (
                  <>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5</SelectItem>
                    <SelectItem value="claude-3-sonnet">Claude 3</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>

            {/* Export Button */}
            {activeSessionId && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleExport}
                disabled={exportMarkdownMutation.isPending}
                title="导出对话"
              >
                {exportMarkdownMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Download className="size-4" />
                )}
              </Button>
            )}
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden" ref={scrollAreaRef}>
          {messagesLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayMessages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-6 p-4">
              <div className="text-center space-y-3">
                <div className="flex justify-center">
                  <div className="rounded-full bg-primary/10 p-4">
                    <Sparkles className="size-8 text-primary" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold">开始新对话</h2>
                <p className="text-muted-foreground max-w-md">
                  我是一个具备记忆功能的 AI 助手，可以记住我们的对话内容，为您提供更加个性化的服务。
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                {[
                  "介绍一下你的记忆功能",
                  "帮我写一段 Python 代码",
                  "解释一下量子计算",
                  "今天有什么新闻？"
                ].map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setInput(prompt);
                      textareaRef.current?.focus();
                    }}
                    className="rounded-lg border border-border bg-card px-4 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <ScrollArea className="h-full">
              <div className="max-w-4xl mx-auto p-4 space-y-6">
                {displayMessages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={cn(
                      "flex gap-3",
                      message.role === "user" ? "justify-end" : "justify-start"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="size-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <Sparkles className="size-4 text-primary" />
                      </div>
                    )}
                    
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-3",
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      )}
                    >
                      {message.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <Streamdown>{message.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      )}
                    </div>

                    {message.role === "user" && (
                      <div className="size-8 shrink-0 rounded-full bg-secondary flex items-center justify-center">
                        <User className="size-4 text-secondary-foreground" />
                      </div>
                    )}
                  </div>
                ))}

                {/* Streaming indicator */}
                {isStreaming && (
                  <div className="flex gap-3 justify-start">
                    <div className="size-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <Sparkles className="size-4 text-primary" />
                    </div>
                    <div className="rounded-2xl bg-muted px-4 py-3">
                      {streamingContent ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <Streamdown>{streamingContent}</Streamdown>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">思考中...</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t bg-card/50 backdrop-blur p-4 shrink-0">
          <div className="max-w-4xl mx-auto">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex gap-3 items-end"
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息... (Shift+Enter 换行)"
                className="flex-1 min-h-[44px] max-h-32 resize-none rounded-xl"
                rows={1}
              />
              <Button
                type="submit"
                size="icon"
                className="size-11 rounded-xl shrink-0"
                disabled={!input.trim() || isStreaming}
              >
                {isStreaming ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <Send className="size-5" />
                )}
              </Button>
            </form>
            <p className="text-xs text-muted-foreground text-center mt-2">
              AI 可能会产生错误信息，请核实重要内容
            </p>
          </div>
        </div>
      </main>

      {/* Edit Title Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名对话</DialogTitle>
            <DialogDescription>
              为这个对话设置一个新的标题
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="输入新标题"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSaveTitle();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              取消
            </Button>
            <Button 
              onClick={handleSaveTitle}
              disabled={updateTitleMutation.isPending}
            >
              {updateTitleMutation.isPending ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
