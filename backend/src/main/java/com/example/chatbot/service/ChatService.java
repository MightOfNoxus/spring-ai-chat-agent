package com.example.chatbot.service;

import com.example.chatbot.dto.ChatRequest;
import com.example.chatbot.dto.ChatResponse;
import com.example.chatbot.entity.ChatMessage;
import com.example.chatbot.entity.ChatSession;
import com.example.chatbot.entity.MemoryVector;
import com.example.chatbot.entity.User;
import com.example.chatbot.memory.LongTermMemoryService;
import com.example.chatbot.memory.ShortTermMemoryService;
import com.example.chatbot.repository.ChatMessageRepository;
import com.example.chatbot.repository.ChatSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse as AiChatResponse;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import reactor.core.publisher.Flux;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Chat Service
 * 
 * Handles chat operations including message processing,
 * memory management, and AI model interactions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {
    
    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final ShortTermMemoryService shortTermMemory;
    private final LongTermMemoryService longTermMemory;
    private final ChatClient chatClient;
    private final Map<String, ChatModel> chatModelRegistry;
    
    /**
     * Create a new chat session
     */
    @Transactional
    public ChatSession createSession(User user, String title, String modelProvider, 
                                     String modelName, String systemPrompt, Integer contextWindowSize) {
        ChatSession session = ChatSession.builder()
                .user(user)
                .title(title != null ? title : "New Chat")
                .modelProvider(modelProvider != null ? modelProvider : "openai")
                .modelName(modelName != null ? modelName : "gpt-4")
                .systemPrompt(systemPrompt)
                .contextWindowSize(contextWindowSize != null ? contextWindowSize : 10)
                .build();
        
        return sessionRepository.save(session);
    }
    
    /**
     * Get all sessions for a user
     */
    public List<ChatSession> getUserSessions(User user) {
        return sessionRepository.findByUserAndIsActiveTrueOrderByUpdatedAtDesc(user);
    }
    
    /**
     * Get a specific session with messages
     */
    public Optional<ChatSession> getSessionWithMessages(Long sessionId, Long userId) {
        return sessionRepository.findByIdAndUserIdWithMessages(sessionId, userId);
    }
    
    /**
     * Send a message and get AI response
     */
    @Transactional
    public ChatResponse sendMessage(User user, ChatRequest request) {
        log.info("Processing message for user {} in session {}", user.getId(), request.getSessionId());
        
        // Get or create session
        ChatSession session;
        if (request.getSessionId() != null) {
            session = sessionRepository.findByIdAndUserId(request.getSessionId(), user.getId())
                    .orElseThrow(() -> new RuntimeException("Session not found"));
        } else {
            session = createSession(user, null, request.getModelProvider(), 
                    request.getModelName(), request.getSystemPrompt(), request.getContextWindowSize());
        }
        
        // Save user message
        ChatMessage userMessage = ChatMessage.builder()
                .session(session)
                .role(ChatMessage.MessageRole.USER)
                .content(request.getMessage())
                .build();
        messageRepository.save(userMessage);
        
        // Build message list with short-term memory
        List<Message> messages = shortTermMemory.buildMessageList(session, request.getMessage());
        
        // Add long-term memory context if available
        List<MemoryVector> relevantMemories = longTermMemory.searchMemories(user, request.getMessage(), 5);
        if (!relevantMemories.isEmpty()) {
            String memoryContext = longTermMemory.buildMemoryContext(relevantMemories);
            // Prepend memory context to system message
            String enhancedSystemPrompt = (session.getSystemPrompt() != null ? session.getSystemPrompt() : "") 
                    + memoryContext;
            messages.add(0, new SystemMessage(enhancedSystemPrompt));
        }
        
        // Get AI response
        String modelProvider = request.getModelProvider() != null ? request.getModelProvider() : session.getModelProvider();
        ChatModel model = chatModelRegistry.getOrDefault(modelProvider, chatModelRegistry.get("openai"));
        
        String aiResponseContent;
        try {
            Prompt prompt = new Prompt(messages);
            AiChatResponse aiResponse = model.call(prompt);
            aiResponseContent = aiResponse.getResult().getOutput().getContent();
        } catch (Exception e) {
            log.error("AI model call failed: {}", e.getMessage());
            aiResponseContent = "I apologize, but I encountered an error processing your request. Please try again.";
        }
        
        // Save assistant message
        ChatMessage assistantMessage = ChatMessage.builder()
                .session(session)
                .role(ChatMessage.MessageRole.ASSISTANT)
                .content(aiResponseContent)
                .modelUsed(modelProvider + "/" + (request.getModelName() != null ? request.getModelName() : session.getModelName()))
                .build();
        messageRepository.save(assistantMessage);
        
        // Update session timestamp
        session.setUpdatedAt(java.time.LocalDateTime.now());
        sessionRepository.save(session);
        
        // Auto-generate title if first message
        if (shortTermMemory.getMessageCount(session) <= 2) {
            generateSessionTitle(session, request.getMessage());
        }
        
        return ChatResponse.builder()
                .sessionId(session.getId())
                .messageId(assistantMessage.getId())
                .content(aiResponseContent)
                .role("assistant")
                .modelUsed(assistantMessage.getModelUsed())
                .build();
    }
    
    /**
     * Send a message with streaming response
     */
    @Transactional
    public Flux<String> sendMessageStream(User user, ChatRequest request) {
        log.info("Processing streaming message for user {} in session {}", user.getId(), request.getSessionId());
        
        // Get or create session
        ChatSession session;
        if (request.getSessionId() != null) {
            session = sessionRepository.findByIdAndUserId(request.getSessionId(), user.getId())
                    .orElseThrow(() -> new RuntimeException("Session not found"));
        } else {
            session = createSession(user, null, request.getModelProvider(), 
                    request.getModelName(), request.getSystemPrompt(), request.getContextWindowSize());
        }
        
        // Save user message
        ChatMessage userMessage = ChatMessage.builder()
                .session(session)
                .role(ChatMessage.MessageRole.USER)
                .content(request.getMessage())
                .build();
        messageRepository.save(userMessage);
        
        // Build message list
        List<Message> messages = shortTermMemory.buildMessageList(session, request.getMessage());
        
        // Add long-term memory context
        List<MemoryVector> relevantMemories = longTermMemory.searchMemories(user, request.getMessage(), 5);
        if (!relevantMemories.isEmpty()) {
            String memoryContext = longTermMemory.buildMemoryContext(relevantMemories);
            String enhancedSystemPrompt = (session.getSystemPrompt() != null ? session.getSystemPrompt() : "") 
                    + memoryContext;
            messages.add(0, new SystemMessage(enhancedSystemPrompt));
        }
        
        // Get model
        String modelProvider = request.getModelProvider() != null ? request.getModelProvider() : session.getModelProvider();
        ChatModel model = chatModelRegistry.getOrDefault(modelProvider, chatModelRegistry.get("openai"));
        
        // Stream response
        Prompt prompt = new Prompt(messages);
        StringBuilder fullResponse = new StringBuilder();
        
        final ChatSession finalSession = session;
        
        return model.stream(prompt)
                .map(response -> {
                    String content = response.getResult().getOutput().getContent();
                    if (content != null) {
                        fullResponse.append(content);
                    }
                    return content != null ? content : "";
                })
                .doOnComplete(() -> {
                    // Save complete assistant message
                    ChatMessage assistantMessage = ChatMessage.builder()
                            .session(finalSession)
                            .role(ChatMessage.MessageRole.ASSISTANT)
                            .content(fullResponse.toString())
                            .modelUsed(modelProvider)
                            .build();
                    messageRepository.save(assistantMessage);
                    
                    // Update session
                    finalSession.setUpdatedAt(java.time.LocalDateTime.now());
                    sessionRepository.save(finalSession);
                });
    }
    
    /**
     * Update session title
     */
    @Transactional
    public void updateSessionTitle(Long sessionId, Long userId, String title) {
        ChatSession session = sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        session.setTitle(title);
        sessionRepository.save(session);
    }
    
    /**
     * Delete (soft delete) a session
     */
    @Transactional
    public void deleteSession(Long sessionId, Long userId) {
        ChatSession session = sessionRepository.findByIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        session.setIsActive(false);
        sessionRepository.save(session);
    }
    
    /**
     * Auto-generate session title based on first message
     */
    private void generateSessionTitle(ChatSession session, String firstMessage) {
        try {
            String title = firstMessage.length() > 50 
                    ? firstMessage.substring(0, 47) + "..." 
                    : firstMessage;
            session.setTitle(title);
            sessionRepository.save(session);
        } catch (Exception e) {
            log.warn("Failed to generate session title: {}", e.getMessage());
        }
    }
}
