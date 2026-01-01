package com.example.chatbot.dto;

import com.example.chatbot.entity.ChatMessage;
import com.example.chatbot.entity.ChatSession;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Session Response DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionResponse {
    
    private Long id;
    private String title;
    private String modelProvider;
    private String modelName;
    private String systemPrompt;
    private Integer contextWindowSize;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<MessageResponse> messages;
    
    public static SessionResponse fromEntity(ChatSession session) {
        return SessionResponse.builder()
                .id(session.getId())
                .title(session.getTitle())
                .modelProvider(session.getModelProvider())
                .modelName(session.getModelName())
                .systemPrompt(session.getSystemPrompt())
                .contextWindowSize(session.getContextWindowSize())
                .isActive(session.getIsActive())
                .createdAt(session.getCreatedAt())
                .updatedAt(session.getUpdatedAt())
                .build();
    }
    
    public static SessionResponse fromEntityWithMessages(ChatSession session) {
        SessionResponse response = fromEntity(session);
        if (session.getMessages() != null) {
            response.setMessages(session.getMessages().stream()
                    .map(MessageResponse::fromEntity)
                    .collect(Collectors.toList()));
        }
        return response;
    }
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MessageResponse {
        private Long id;
        private String role;
        private String content;
        private String modelUsed;
        private LocalDateTime createdAt;
        
        public static MessageResponse fromEntity(ChatMessage message) {
            return MessageResponse.builder()
                    .id(message.getId())
                    .role(message.getRole().name().toLowerCase())
                    .content(message.getContent())
                    .modelUsed(message.getModelUsed())
                    .createdAt(message.getCreatedAt())
                    .build();
        }
    }
}
