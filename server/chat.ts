import { invokeLLM } from "./_core/llm";
import { 
  createChatSession, 
  addMessage, 
  getSessionMessages, 
  getSessionById,
  updateSessionTitle 
} from "./db";
import { MemoryManager } from "./memory";
import { ChatMessage, ChatSession } from "../drizzle/schema";

export interface ChatRequest {
  sessionId?: number;
  message: string;
  modelProvider?: string;
  modelName?: string;
  systemPrompt?: string;
  contextWindowSize?: number;
}

export interface ChatResponse {
  sessionId: number;
  messageId: number;
  content: string;
  role: "assistant";
  modelUsed: string;
}

/**
 * Chat Service - Handles conversation logic with memory integration
 */
export class ChatService {
  private userId: number;
  
  constructor(userId: number) {
    this.userId = userId;
  }
  
  /**
   * Create a new chat session
   */
  async createSession(
    title?: string,
    modelProvider: string = "openai",
    modelName: string = "gpt-4",
    systemPrompt?: string,
    contextWindowSize: number = 10
  ): Promise<number> {
    const sessionId = await createChatSession({
      userId: this.userId,
      title: title || "New Chat",
      modelProvider,
      modelName,
      systemPrompt,
      contextWindowSize,
      isActive: true
    });
    
    return sessionId;
  }
  
  /**
   * Send a message and get AI response
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    let sessionId = request.sessionId;
    
    // Create new session if not provided
    if (!sessionId) {
      sessionId = await this.createSession(
        undefined,
        request.modelProvider,
        request.modelName,
        request.systemPrompt,
        request.contextWindowSize
      );
    }
    
    // Get session details
    const session = await getSessionById(sessionId, this.userId);
    if (!session) {
      throw new Error("Session not found");
    }
    
    // Save user message
    await addMessage({
      sessionId,
      role: "user",
      content: request.message,
      modelUsed: null,
      tokenCount: null,
      metadata: null
    });
    
    // Initialize memory manager
    const memoryManager = new MemoryManager(
      this.userId, 
      session.contextWindowSize || 10
    );
    
    // Build context with memories
    const contextMessages = await memoryManager.buildContext(
      sessionId,
      request.message,
      session.systemPrompt || undefined
    );
    
    // Add current user message
    contextMessages.push({ role: "user", content: request.message });
    
    // Call LLM
    const modelName = request.modelName || session.modelName || "gpt-4";
    const response = await invokeLLM({
      messages: contextMessages
    });
    
    const assistantContent = response.choices[0]?.message?.content;
    const contentStr = typeof assistantContent === 'string' 
      ? assistantContent 
      : "I apologize, but I couldn't generate a response.";
    
    // Save assistant message
    const messageId = await addMessage({
      sessionId,
      role: "assistant",
      content: contentStr,
      modelUsed: modelName,
      tokenCount: response.usage?.total_tokens || null,
      metadata: null
    });
    
    // Auto-generate title for new sessions
    const messages = await getSessionMessages(sessionId);
    if (messages.length <= 2 && session.title === "New Chat") {
      await this.generateSessionTitle(sessionId, request.message);
    }
    
    // Check if conversation should be stored to long-term memory
    const conversationContent = `User: ${request.message}\nAssistant: ${contentStr}`;
    if (memoryManager.shouldStoreToLongTerm(conversationContent)) {
      await memoryManager.storeToLongTerm(conversationContent, sessionId);
    }
    
    return {
      sessionId,
      messageId,
      content: contentStr,
      role: "assistant",
      modelUsed: modelName
    };
  }
  
  /**
   * Generate a title for the session based on the first message
   */
  private async generateSessionTitle(sessionId: number, firstMessage: string): Promise<void> {
    try {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Generate a short, concise title (max 50 characters) for a conversation that starts with the following message. Only respond with the title, nothing else."
          },
          {
            role: "user",
            content: firstMessage
          }
        ]
      });
      
      const titleContent = response.choices[0]?.message?.content;
      const title = typeof titleContent === 'string' 
        ? titleContent.slice(0, 50) 
        : "Chat";
      await updateSessionTitle(sessionId, title);
    } catch (error) {
      console.error("Failed to generate session title:", error);
    }
  }
  
  /**
   * Get conversation history
   */
  async getHistory(sessionId: number): Promise<ChatMessage[]> {
    const session = await getSessionById(sessionId, this.userId);
    if (!session) {
      throw new Error("Session not found");
    }
    
    return await getSessionMessages(sessionId);
  }
}

/**
 * Stream chat response using Server-Sent Events
 */
export async function* streamChatResponse(
  userId: number,
  request: ChatRequest
): AsyncGenerator<string, void, unknown> {
  const chatService = new ChatService(userId);
  
  let sessionId = request.sessionId;
  
  // Create new session if not provided
  if (!sessionId) {
    sessionId = await chatService.createSession(
      undefined,
      request.modelProvider,
      request.modelName,
      request.systemPrompt,
      request.contextWindowSize
    );
    yield `data: ${JSON.stringify({ type: "session", sessionId })}\n\n`;
  }
  
  // Get session details
  const session = await getSessionById(sessionId, userId);
  if (!session) {
    yield `data: ${JSON.stringify({ type: "error", message: "Session not found" })}\n\n`;
    return;
  }
  
  // Save user message
  await addMessage({
    sessionId,
    role: "user",
    content: request.message,
    modelUsed: null,
    tokenCount: null,
    metadata: null
  });
  
  // Initialize memory manager
  const memoryManager = new MemoryManager(
    userId,
    session.contextWindowSize || 10
  );
  
  // Build context with memories
  const contextMessages = await memoryManager.buildContext(
    sessionId,
    request.message,
    session.systemPrompt || undefined
  );
  
  // Add current user message
  contextMessages.push({ role: "user", content: request.message });
  
  // For streaming, we'll use the regular response and simulate streaming
  // In production, you would use the streaming API
  try {
    const response = await invokeLLM({
      messages: contextMessages
    });
    
    const assistantContent = response.choices[0]?.message?.content;
    const contentStr = typeof assistantContent === 'string'
      ? assistantContent
      : "I apologize, but I couldn't generate a response.";
    
    // Simulate streaming by sending chunks
    const words = contentStr.split(' ');
    let accumulated = '';
    
    for (let i = 0; i < words.length; i++) {
      accumulated += (i > 0 ? ' ' : '') + words[i];
      yield `data: ${JSON.stringify({ type: "content", content: words[i] + (i < words.length - 1 ? ' ' : '') })}\n\n`;
      
      // Small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    
    // Save assistant message
    const messageId = await addMessage({
      sessionId,
      role: "assistant",
      content: contentStr,
      modelUsed: session.modelName || "gpt-4",
      tokenCount: response.usage?.total_tokens || null,
      metadata: null
    });
    
    // Auto-generate title for new sessions
    const messages = await getSessionMessages(sessionId);
    if (messages.length <= 2 && session.title === "New Chat") {
      const titleResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: "Generate a short, concise title (max 50 characters) for a conversation. Only respond with the title."
          },
          {
            role: "user",
            content: request.message
          }
        ]
      });
      const titleContent = titleResponse.choices[0]?.message?.content;
      const title = typeof titleContent === 'string' ? titleContent.slice(0, 50) : "Chat";
      await updateSessionTitle(sessionId, title);
      yield `data: ${JSON.stringify({ type: "title", title })}\n\n`;
    }
    
    // Check if conversation should be stored to long-term memory
    const conversationContent = `User: ${request.message}\nAssistant: ${contentStr}`;
    if (memoryManager.shouldStoreToLongTerm(conversationContent)) {
      await memoryManager.storeToLongTerm(conversationContent, sessionId);
    }
    
    yield `data: ${JSON.stringify({ type: "done", messageId, sessionId })}\n\n`;
    
  } catch (error) {
    console.error("Chat error:", error);
    yield `data: ${JSON.stringify({ type: "error", message: "Failed to generate response" })}\n\n`;
  }
}
