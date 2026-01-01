package com.example.chatbot.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Session Creation Request DTO
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionRequest {
    
    private String title;
    
    private String modelProvider;
    
    private String modelName;
    
    private String systemPrompt;
    
    private Integer contextWindowSize;
}
