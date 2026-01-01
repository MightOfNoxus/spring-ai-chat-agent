package com.example.chatbot.controller;

import com.example.chatbot.dto.ChatRequest;
import com.example.chatbot.dto.ChatResponse;
import com.example.chatbot.dto.SessionRequest;
import com.example.chatbot.dto.SessionResponse;
import com.example.chatbot.entity.ChatSession;
import com.example.chatbot.entity.User;
import com.example.chatbot.repository.UserRepository;
import com.example.chatbot.service.ChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Chat Controller
 * 
 * RESTful API endpoints for chat operations
 */
@RestController
@RequestMapping("/api/chat")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class ChatController {
    
    private final ChatService chatService;
    private final UserRepository userRepository;
    
    /**
     * Create a new chat session
     */
    @PostMapping("/sessions")
    public ResponseEntity<SessionResponse> createSession(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody SessionRequest request) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        ChatSession session = chatService.createSession(
                user,
                request.getTitle(),
                request.getModelProvider(),
                request.getModelName(),
                request.getSystemPrompt(),
                request.getContextWindowSize()
        );
        
        return ResponseEntity.ok(SessionResponse.fromEntity(session));
    }
    
    /**
     * Get all sessions for a user
     */
    @GetMapping("/sessions")
    public ResponseEntity<List<SessionResponse>> getSessions(
            @RequestHeader("X-User-Id") Long userId) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        List<SessionResponse> sessions = chatService.getUserSessions(user).stream()
                .map(SessionResponse::fromEntity)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(sessions);
    }
    
    /**
     * Get a specific session with messages
     */
    @GetMapping("/sessions/{sessionId}")
    public ResponseEntity<SessionResponse> getSession(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long sessionId) {
        
        ChatSession session = chatService.getSessionWithMessages(sessionId, userId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        
        return ResponseEntity.ok(SessionResponse.fromEntityWithMessages(session));
    }
    
    /**
     * Update session title
     */
    @PatchMapping("/sessions/{sessionId}")
    public ResponseEntity<Map<String, Boolean>> updateSession(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long sessionId,
            @RequestBody Map<String, String> request) {
        
        String title = request.get("title");
        if (title != null) {
            chatService.updateSessionTitle(sessionId, userId, title);
        }
        
        return ResponseEntity.ok(Map.of("success", true));
    }
    
    /**
     * Delete a session
     */
    @DeleteMapping("/sessions/{sessionId}")
    public ResponseEntity<Map<String, Boolean>> deleteSession(
            @RequestHeader("X-User-Id") Long userId,
            @PathVariable Long sessionId) {
        
        chatService.deleteSession(sessionId, userId);
        return ResponseEntity.ok(Map.of("success", true));
    }
    
    /**
     * Send a message (non-streaming)
     */
    @PostMapping("/messages")
    public ResponseEntity<ChatResponse> sendMessage(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ChatRequest request) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        ChatResponse response = chatService.sendMessage(user, request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * Send a message with streaming response (SSE)
     */
    @PostMapping(value = "/messages/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> sendMessageStream(
            @RequestHeader("X-User-Id") Long userId,
            @Valid @RequestBody ChatRequest request) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        return chatService.sendMessageStream(user, request);
    }
}
