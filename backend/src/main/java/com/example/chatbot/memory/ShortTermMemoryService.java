package com.example.chatbot.memory;

import com.example.chatbot.entity.ChatMessage;
import com.example.chatbot.entity.ChatSession;
import com.example.chatbot.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Short-term Memory Service
 * 
 * Manages conversation context within a session by maintaining
 * a sliding window of recent messages.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ShortTermMemoryService {
    
    private final ChatMessageRepository messageRepository;
    
    /**
     * Get recent messages for context window
     * 
     * @param session The chat session
     * @param windowSize Number of recent messages to retrieve
     * @return List of Spring AI Message objects for the context
     */
    public List<Message> getContextMessages(ChatSession session, int windowSize) {
        // Get recent messages (windowSize * 2 to account for user/assistant pairs)
        List<ChatMessage> recentMessages = messageRepository.findRecentMessages(
                session.getId(), 
                PageRequest.of(0, windowSize * 2)
        );
        
        // Reverse to get chronological order
        Collections.reverse(recentMessages);
        
        // Convert to Spring AI Message format
        return recentMessages.stream()
                .map(this::convertToSpringAiMessage)
                .collect(Collectors.toList());
    }
    
    /**
     * Build full message list including system prompt and context
     * 
     * @param session The chat session
     * @param currentUserMessage The current user message
     * @return Complete list of messages for the AI model
     */
    public List<Message> buildMessageList(ChatSession session, String currentUserMessage) {
        List<Message> messages = new ArrayList<>();
        
        // Add system prompt if exists
        if (session.getSystemPrompt() != null && !session.getSystemPrompt().isEmpty()) {
            messages.add(new SystemMessage(session.getSystemPrompt()));
        }
        
        // Add context messages (short-term memory)
        int windowSize = session.getContextWindowSize() != null ? session.getContextWindowSize() : 10;
        messages.addAll(getContextMessages(session, windowSize));
        
        // Add current user message
        messages.add(new UserMessage(currentUserMessage));
        
        log.debug("Built message list with {} messages for session {}", messages.size(), session.getId());
        
        return messages;
    }
    
    /**
     * Convert database ChatMessage to Spring AI Message
     */
    private Message convertToSpringAiMessage(ChatMessage chatMessage) {
        return switch (chatMessage.getRole()) {
            case USER -> new UserMessage(chatMessage.getContent());
            case ASSISTANT -> new AssistantMessage(chatMessage.getContent());
            case SYSTEM -> new SystemMessage(chatMessage.getContent());
        };
    }
    
    /**
     * Get the total number of messages in a session
     */
    public long getMessageCount(ChatSession session) {
        return messageRepository.countBySession(session);
    }
}
