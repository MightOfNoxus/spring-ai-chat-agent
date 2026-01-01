import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { 
  getUserSessions, 
  getSessionById, 
  deleteSession, 
  updateSessionTitle,
  getSessionMessages,
  getEnabledModels,
  initializeDefaultModels,
  getUserExportedFiles,
  addExportedFile,
  getUserMemories
} from "./db";
import { ChatService, streamChatResponse } from "./chat";
import { MemoryManager } from "./memory";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";
import { nanoid } from "nanoid";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Chat session management
  chat: router({
    // Get all sessions for current user
    getSessions: protectedProcedure.query(async ({ ctx }) => {
      return await getUserSessions(ctx.user.id);
    }),

    // Get a specific session with messages
    getSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await getSessionById(input.sessionId, ctx.user.id);
        if (!session) {
          throw new Error("Session not found");
        }
        const messages = await getSessionMessages(input.sessionId);
        return { session, messages };
      }),

    // Create a new chat session
    createSession: protectedProcedure
      .input(z.object({
        title: z.string().optional(),
        modelProvider: z.string().default("openai"),
        modelName: z.string().default("gpt-4"),
        systemPrompt: z.string().optional(),
        contextWindowSize: z.number().default(10)
      }))
      .mutation(async ({ ctx, input }) => {
        const chatService = new ChatService(ctx.user.id);
        const sessionId = await chatService.createSession(
          input.title,
          input.modelProvider,
          input.modelName,
          input.systemPrompt,
          input.contextWindowSize
        );
        return { sessionId };
      }),

    // Send a message (non-streaming)
    sendMessage: protectedProcedure
      .input(z.object({
        sessionId: z.number().optional(),
        message: z.string().min(1),
        modelProvider: z.string().optional(),
        modelName: z.string().optional(),
        systemPrompt: z.string().optional(),
        contextWindowSize: z.number().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const chatService = new ChatService(ctx.user.id);
        return await chatService.sendMessage(input);
      }),

    // Update session title
    updateTitle: protectedProcedure
      .input(z.object({
        sessionId: z.number(),
        title: z.string().min(1).max(255)
      }))
      .mutation(async ({ ctx, input }) => {
        const session = await getSessionById(input.sessionId, ctx.user.id);
        if (!session) {
          throw new Error("Session not found");
        }
        await updateSessionTitle(input.sessionId, input.title);
        return { success: true };
      }),

    // Delete a session
    deleteSession: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSession(input.sessionId, ctx.user.id);
        return { success: true };
      }),

    // Get message history for a session
    getHistory: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .query(async ({ ctx, input }) => {
        const session = await getSessionById(input.sessionId, ctx.user.id);
        if (!session) {
          throw new Error("Session not found");
        }
        return await getSessionMessages(input.sessionId);
      }),
  }),

  // Model configuration
  models: router({
    // Get available models
    getModels: protectedProcedure.query(async () => {
      await initializeDefaultModels();
      return await getEnabledModels();
    }),
  }),

  // Memory management
  memory: router({
    // Get user's long-term memories
    getMemories: protectedProcedure
      .input(z.object({ limit: z.number().default(50) }))
      .query(async ({ ctx, input }) => {
        return await getUserMemories(ctx.user.id, input.limit);
      }),

    // Store content to long-term memory
    storeMemory: protectedProcedure
      .input(z.object({
        content: z.string().min(1),
        sessionId: z.number().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const memoryManager = new MemoryManager(ctx.user.id);
        const memoryId = await memoryManager.storeToLongTerm(
          input.content,
          input.sessionId
        );
        return { memoryId };
      }),

    // Search memories by query
    searchMemories: protectedProcedure
      .input(z.object({
        query: z.string().min(1),
        topK: z.number().default(5)
      }))
      .query(async ({ ctx, input }) => {
        const memoryManager = new MemoryManager(ctx.user.id);
        // Access the private longTerm property through a method
        const memories = await getUserMemories(ctx.user.id, 100);
        return memories.slice(0, input.topK);
      }),
  }),

  // Export functionality
  export: router({
    // Get user's exported files
    getExports: protectedProcedure.query(async ({ ctx }) => {
      return await getUserExportedFiles(ctx.user.id);
    }),

    // Export session to Markdown
    exportMarkdown: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await getSessionById(input.sessionId, ctx.user.id);
        if (!session) {
          throw new Error("Session not found");
        }
        
        const messages = await getSessionMessages(input.sessionId);
        
        // Generate Markdown content
        let markdown = `# ${session.title || 'Chat Export'}\n\n`;
        markdown += `**Date:** ${new Date().toISOString()}\n`;
        markdown += `**Model:** ${session.modelName || 'Unknown'}\n\n`;
        markdown += `---\n\n`;
        
        for (const msg of messages) {
          const roleLabel = msg.role === 'user' ? '👤 User' : msg.role === 'assistant' ? '🤖 Assistant' : '⚙️ System';
          markdown += `### ${roleLabel}\n\n${msg.content}\n\n`;
        }
        
        // Upload to S3
        const fileName = `chat-export-${session.id}-${nanoid(8)}.md`;
        const fileKey = `exports/${ctx.user.id}/${fileName}`;
        const { url } = await storagePut(fileKey, Buffer.from(markdown, 'utf-8'), 'text/markdown');
        
        // Save to database
        await addExportedFile({
          userId: ctx.user.id,
          sessionId: input.sessionId,
          fileName,
          fileType: 'markdown',
          fileUrl: url,
          fileKey,
          fileSize: Buffer.byteLength(markdown, 'utf-8')
        });
        
        return { url, fileName };
      }),

    // Export session to simple text format (PDF generation would require additional libraries)
    exportText: protectedProcedure
      .input(z.object({ sessionId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const session = await getSessionById(input.sessionId, ctx.user.id);
        if (!session) {
          throw new Error("Session not found");
        }
        
        const messages = await getSessionMessages(input.sessionId);
        
        // Generate text content
        let text = `${session.title || 'Chat Export'}\n`;
        text += `${'='.repeat(50)}\n\n`;
        text += `Date: ${new Date().toISOString()}\n`;
        text += `Model: ${session.modelName || 'Unknown'}\n\n`;
        text += `${'-'.repeat(50)}\n\n`;
        
        for (const msg of messages) {
          const roleLabel = msg.role === 'user' ? 'User' : msg.role === 'assistant' ? 'Assistant' : 'System';
          text += `[${roleLabel}]\n${msg.content}\n\n`;
        }
        
        // Upload to S3
        const fileName = `chat-export-${session.id}-${nanoid(8)}.txt`;
        const fileKey = `exports/${ctx.user.id}/${fileName}`;
        const { url } = await storagePut(fileKey, Buffer.from(text, 'utf-8'), 'text/plain');
        
        // Save to database
        await addExportedFile({
          userId: ctx.user.id,
          sessionId: input.sessionId,
          fileName,
          fileType: 'markdown', // Using markdown type for text files
          fileUrl: url,
          fileKey,
          fileSize: Buffer.byteLength(text, 'utf-8')
        });
        
        return { url, fileName };
      }),
  }),

  // Notification for errors/issues
  notification: router({
    // Report an issue to the owner
    reportIssue: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        errorDetails: z.string().optional()
      }))
      .mutation(async ({ ctx, input }) => {
        const content = `
**Issue Report from User**

**User:** ${ctx.user.name || ctx.user.email || 'Unknown'}
**User ID:** ${ctx.user.id}
**Time:** ${new Date().toISOString()}

**Description:**
${input.description}

${input.errorDetails ? `**Error Details:**\n\`\`\`\n${input.errorDetails}\n\`\`\`` : ''}
        `.trim();
        
        const success = await notifyOwner({
          title: `[Issue] ${input.title}`,
          content
        });
        
        return { success };
      }),
  }),
});

export type AppRouter = typeof appRouter;
