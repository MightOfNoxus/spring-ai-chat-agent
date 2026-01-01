import { 
  getRecentMessages, 
  addMemoryVector, 
  getUserMemories, 
  updateMemoryAccess 
} from "./db";
import { 
  generateEmbedding, 
  findSimilar, 
  summarizeForMemory, 
  calculateImportance,
  VectorEntry 
} from "./embedding";
import { ChatMessage, MemoryVector } from "../drizzle/schema";

/**
 * Short-term Memory Manager
 * Manages the context window for current conversation
 */
export class ShortTermMemory {
  private maxMessages: number;
  
  constructor(maxMessages: number = 10) {
    this.maxMessages = maxMessages;
  }
  
  /**
   * Get recent messages for context
   */
  async getContext(sessionId: number): Promise<ChatMessage[]> {
    return await getRecentMessages(sessionId, this.maxMessages);
  }
  
  /**
   * Format messages for LLM context
   */
  formatForLLM(messages: ChatMessage[]): Array<{ role: "user" | "assistant" | "system"; content: string }> {
    return messages.map(msg => ({
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content
    }));
  }
}

/**
 * Long-term Memory Manager
 * Handles persistent memory storage and semantic retrieval
 */
export class LongTermMemory {
  private userId: number;
  
  constructor(userId: number) {
    this.userId = userId;
  }
  
  /**
   * Store a new memory with embedding
   */
  async store(content: string, sessionId?: number): Promise<number> {
    // Generate summary for the content
    const summary = await summarizeForMemory(content);
    
    // Generate embedding
    const embedding = await generateEmbedding(content);
    
    // Calculate importance
    const importance = calculateImportance(content);
    
    // Store in database
    const memoryId = await addMemoryVector({
      userId: this.userId,
      sessionId: sessionId ?? null,
      content,
      summary,
      embedding,
      importance,
      accessCount: 0,
      lastAccessedAt: null
    });
    
    return memoryId;
  }
  
  /**
   * Retrieve relevant memories based on query
   */
  async retrieve(query: string, topK: number = 5): Promise<Array<MemoryVector & { similarity: number }>> {
    // Get all user memories
    const memories = await getUserMemories(this.userId, 1000);
    
    if (memories.length === 0) {
      return [];
    }
    
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query);
    
    // Convert memories to vector entries
    const vectorEntries: VectorEntry[] = memories
      .filter(m => m.embedding && Array.isArray(m.embedding))
      .map(m => ({
        id: m.id,
        content: m.content,
        embedding: m.embedding as number[],
        metadata: { summary: m.summary, importance: m.importance }
      }));
    
    // Find similar memories
    const similar = findSimilar(queryEmbedding, vectorEntries, topK);
    
    // Update access counts for retrieved memories
    for (const entry of similar) {
      await updateMemoryAccess(entry.id);
    }
    
    // Map back to MemoryVector format
    return similar.map(entry => {
      const original = memories.find(m => m.id === entry.id)!;
      return {
        ...original,
        similarity: entry.similarity
      };
    });
  }
  
  /**
   * Format memories for LLM context
   */
  formatForLLM(memories: Array<MemoryVector & { similarity: number }>): string {
    if (memories.length === 0) {
      return "";
    }
    
    const formattedMemories = memories
      .map((m, i) => `[Memory ${i + 1}] (Relevance: ${(m.similarity * 100).toFixed(0)}%)\n${m.summary || m.content}`)
      .join("\n\n");
    
    return `\n--- Relevant Long-term Memories ---\n${formattedMemories}\n--- End of Memories ---\n`;
  }
}

/**
 * Combined Memory Manager
 * Orchestrates both short-term and long-term memory
 */
export class MemoryManager {
  private shortTerm: ShortTermMemory;
  private longTerm: LongTermMemory;
  
  constructor(userId: number, contextWindowSize: number = 10) {
    this.shortTerm = new ShortTermMemory(contextWindowSize);
    this.longTerm = new LongTermMemory(userId);
  }
  
  /**
   * Build complete context for LLM including both memory types
   */
  async buildContext(
    sessionId: number, 
    currentQuery: string,
    systemPrompt?: string
  ): Promise<Array<{ role: "user" | "assistant" | "system"; content: string }>> {
    const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];
    
    // Add system prompt with long-term memory context
    let enhancedSystemPrompt = systemPrompt || "You are a helpful AI assistant with memory capabilities.";
    
    // Retrieve relevant long-term memories
    const relevantMemories = await this.longTerm.retrieve(currentQuery, 3);
    if (relevantMemories.length > 0) {
      const memoryContext = this.longTerm.formatForLLM(relevantMemories);
      enhancedSystemPrompt += `\n\nYou have access to the following relevant memories from past conversations:${memoryContext}\nUse these memories to provide more personalized and contextual responses when relevant.`;
    }
    
    messages.push({ role: "system", content: enhancedSystemPrompt });
    
    // Add short-term context (recent messages)
    const recentMessages = await this.shortTerm.getContext(sessionId);
    messages.push(...this.shortTerm.formatForLLM(recentMessages));
    
    return messages;
  }
  
  /**
   * Store important conversation content to long-term memory
   */
  async storeToLongTerm(content: string, sessionId?: number): Promise<number> {
    return await this.longTerm.store(content, sessionId);
  }
  
  /**
   * Analyze if content should be stored to long-term memory
   */
  shouldStoreToLongTerm(content: string): boolean {
    const importance = calculateImportance(content);
    return importance >= 0.6; // Store if importance is above threshold
  }
}
