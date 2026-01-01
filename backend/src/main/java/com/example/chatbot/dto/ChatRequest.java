package com.example.chatbot.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Chat Request DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatRequest {
    
    private Long sessionId;
    
    @NotBlank(message = "Message cannot be empty")
    private String message;
    
    private String modelProvider;
    
    private String modelName;
    
    private String systemPrompt;
    
    private Integer contextWindowSize;
}
