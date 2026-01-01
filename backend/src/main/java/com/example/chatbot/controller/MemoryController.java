package com.example.chatbot.controller;

import com.example.chatbot.entity.MemoryVector;
import com.example.chatbot.entity.User;
import com.example.chatbot.memory.LongTermMemoryService;
import com.example.chatbot.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Memory Controller
 * 
 * RESTful API endpoints for memory operations
 */
@RestController
@RequestMapping("/api/memory")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "${app.cors.allowed-origins}")
public class MemoryController {
    
    private final LongTermMemoryService memoryService;
    private final UserRepository userRepository;
    
    /**
     * Get all memories for a user
     */
    @GetMapping
    public ResponseEntity<List<MemoryResponse>> getMemories(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam(defaultValue = "50") int limit) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        List<MemoryResponse> memories = memoryService.getMemories(user, limit).stream()
                .map(MemoryResponse::fromEntity)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(memories);
    }
    
    /**
     * Store a new memory
     */
    @PostMapping
    public ResponseEntity<MemoryResponse> storeMemory(
            @RequestHeader("X-User-Id") Long userId,
            @RequestBody MemoryRequest request) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        MemoryVector memory = memoryService.storeMemory(
                user,
                request.getContent(),
                request.getSummary(),
                request.getImportance()
        );
        
        return ResponseEntity.ok(MemoryResponse.fromEntity(memory));
    }
    
    /**
     * Search memories
     */
    @GetMapping("/search")
    public ResponseEntity<List<MemoryResponse>> searchMemories(
            @RequestHeader("X-User-Id") Long userId,
            @RequestParam String query,
            @RequestParam(defaultValue = "5") int topK) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        List<MemoryResponse> memories = memoryService.searchMemories(user, query, topK).stream()
                .map(MemoryResponse::fromEntity)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(memories);
    }
    
    // DTOs
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class MemoryRequest {
        private String content;
        private String summary;
        private Double importance;
    }
    
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class MemoryResponse {
        private Long id;
        private String content;
        private String summary;
        private Double importance;
        private Integer accessCount;
        private LocalDateTime lastAccessedAt;
        private LocalDateTime createdAt;
        
        public static MemoryResponse fromEntity(MemoryVector memory) {
            return MemoryResponse.builder()
                    .id(memory.getId())
                    .content(memory.getContent())
                    .summary(memory.getSummary())
                    .importance(memory.getImportance())
                    .accessCount(memory.getAccessCount())
                    .lastAccessedAt(memory.getLastAccessedAt())
                    .createdAt(memory.getCreatedAt())
                    .build();
        }
    }
}
