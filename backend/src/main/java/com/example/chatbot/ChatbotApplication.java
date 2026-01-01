package com.example.chatbot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Spring AI Chat Agent Application
 * 
 * A multi-turn conversation chatbot with short-term and long-term memory capabilities,
 * supporting multiple AI models including OpenAI, Azure OpenAI, Anthropic Claude, and Google Gemini.
 */
@SpringBootApplication
public class ChatbotApplication {

    public static void main(String[] args) {
        SpringApplication.run(ChatbotApplication.class, args);
    }
}
