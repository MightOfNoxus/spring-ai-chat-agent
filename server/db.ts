import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  chatSessions, InsertChatSession, ChatSession,
  chatMessages, InsertChatMessage, ChatMessage,
  memoryVectors, InsertMemoryVector, MemoryVector,
  exportedFiles, InsertExportedFile,
  modelConfigs, InsertModelConfig
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Functions ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Chat Session Functions ============
export async function createChatSession(session: InsertChatSession): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(chatSessions).values(session);
  return result[0].insertId;
}

export async function getUserSessions(userId: number): Promise<ChatSession[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(chatSessions)
    .where(and(eq(chatSessions.userId, userId), eq(chatSessions.isActive, true)))
    .orderBy(desc(chatSessions.updatedAt));
}

export async function getSessionById(sessionId: number, userId: number): Promise<ChatSession | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .limit(1);
  
  return result[0];
}

export async function updateSessionTitle(sessionId: number, title: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(chatSessions)
    .set({ title, updatedAt: new Date() })
    .where(eq(chatSessions.id, sessionId));
}

export async function deleteSession(sessionId: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(chatSessions)
    .set({ isActive: false })
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)));
}

// ============ Chat Message Functions ============
export async function addMessage(message: InsertChatMessage): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(chatMessages).values(message);
  
  // Update session's updatedAt
  await db.update(chatSessions)
    .set({ updatedAt: new Date() })
    .where(eq(chatSessions.id, message.sessionId));
  
  return result[0].insertId;
}

export async function getSessionMessages(sessionId: number, limit?: number): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];
  
  let query = db.select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);
  
  if (limit) {
    query = query.limit(limit) as typeof query;
  }
  
  return await query;
}

export async function getRecentMessages(sessionId: number, count: number): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Get the most recent N messages for short-term memory
  const messages = await db.select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(count);
  
  // Return in chronological order
  return messages.reverse();
}

// ============ Memory Vector Functions ============
export async function addMemoryVector(memory: InsertMemoryVector): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(memoryVectors).values(memory);
  return result[0].insertId;
}

export async function getUserMemories(userId: number, limit: number = 100): Promise<MemoryVector[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(memoryVectors)
    .where(eq(memoryVectors.userId, userId))
    .orderBy(desc(memoryVectors.importance))
    .limit(limit);
}

export async function updateMemoryAccess(memoryId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  await db.update(memoryVectors)
    .set({ 
      accessCount: sql`${memoryVectors.accessCount} + 1`,
      lastAccessedAt: new Date()
    })
    .where(eq(memoryVectors.id, memoryId));
}

// ============ Exported Files Functions ============
export async function addExportedFile(file: InsertExportedFile): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(exportedFiles).values(file);
  return result[0].insertId;
}

export async function getUserExportedFiles(userId: number): Promise<typeof exportedFiles.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(exportedFiles)
    .where(eq(exportedFiles.userId, userId))
    .orderBy(desc(exportedFiles.createdAt));
}

// ============ Model Config Functions ============
export async function getEnabledModels(): Promise<typeof modelConfigs.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select()
    .from(modelConfigs)
    .where(eq(modelConfigs.isEnabled, true));
}

export async function initializeDefaultModels(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  const existingModels = await db.select().from(modelConfigs).limit(1);
  if (existingModels.length > 0) return;
  
  const defaultModels: InsertModelConfig[] = [
    { provider: "openai", modelName: "gpt-4", displayName: "GPT-4", description: "OpenAI GPT-4 - Most capable model", maxTokens: 8192 },
    { provider: "openai", modelName: "gpt-4-turbo", displayName: "GPT-4 Turbo", description: "OpenAI GPT-4 Turbo - Faster and cheaper", maxTokens: 128000 },
    { provider: "openai", modelName: "gpt-3.5-turbo", displayName: "GPT-3.5 Turbo", description: "OpenAI GPT-3.5 - Fast and efficient", maxTokens: 16385 },
    { provider: "anthropic", modelName: "claude-3-opus", displayName: "Claude 3 Opus", description: "Anthropic Claude 3 Opus - Most powerful", maxTokens: 200000 },
    { provider: "anthropic", modelName: "claude-3-sonnet", displayName: "Claude 3 Sonnet", description: "Anthropic Claude 3 Sonnet - Balanced", maxTokens: 200000 },
    { provider: "google", modelName: "gemini-pro", displayName: "Gemini Pro", description: "Google Gemini Pro - Versatile model", maxTokens: 32000 },
    { provider: "azure", modelName: "gpt-4", displayName: "Azure GPT-4", description: "Azure OpenAI GPT-4", maxTokens: 8192 },
  ];
  
  await db.insert(modelConfigs).values(defaultModels);
}
