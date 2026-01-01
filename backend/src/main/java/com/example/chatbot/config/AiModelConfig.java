package com.example.chatbot.config;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.openai.OpenAiChatModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.HashMap;
import java.util.Map;

/**
 * AI Model Configuration
 * 
 * Configures multiple AI model providers (OpenAI, Azure, Anthropic, etc.)
 * and provides a unified interface for model selection.
 */
@Configuration
public class AiModelConfig {
    
    @Value("${app.default-provider:openai}")
    private String defaultProvider;
    
    @Value("${app.memory.short-term-size:10}")
    private int shortTermMemorySize;
    
    /**
     * Primary ChatClient using the default provider
     */
    @Bean
    @Primary
    public ChatClient chatClient(ChatModel chatModel) {
        return ChatClient.builder(chatModel)
                .defaultSystem("You are a helpful AI assistant with memory capabilities. " +
                        "You can remember previous conversations and provide personalized responses.")
                .build();
    }
    
    /**
     * Map of available chat models by provider name
     */
    @Bean
    public Map<String, ChatModel> chatModelRegistry(
            @Autowired(required = false) @Qualifier("openAiChatModel") ChatModel openAiModel,
            @Autowired(required = false) @Qualifier("azureOpenAiChatModel") ChatModel azureModel,
            @Autowired(required = false) @Qualifier("anthropicChatModel") ChatModel anthropicModel) {
        
        Map<String, ChatModel> registry = new HashMap<>();
        
        if (openAiModel != null) {
            registry.put("openai", openAiModel);
        }
        if (azureModel != null) {
            registry.put("azure", azureModel);
        }
        if (anthropicModel != null) {
            registry.put("anthropic", anthropicModel);
        }
        
        return registry;
    }
    
    public String getDefaultProvider() {
        return defaultProvider;
    }
    
    public int getShortTermMemorySize() {
        return shortTermMemorySize;
    }
}
