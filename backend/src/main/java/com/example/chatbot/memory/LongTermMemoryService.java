package com.example.chatbot.memory;

import com.example.chatbot.entity.MemoryVector;
import com.example.chatbot.entity.User;
import com.example.chatbot.repository.MemoryVectorRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.document.Document;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Long-term Memory Service
 * 
 * Manages persistent memory storage using vector embeddings
 * for semantic search and retrieval of relevant past conversations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LongTermMemoryService {
    
    private final MemoryVectorRepository memoryRepository;
    private final ObjectMapper objectMapper;
    
    @Autowired(required = false)
    private VectorStore vectorStore;
    
    @Autowired(required = false)
    private EmbeddingModel embeddingModel;
    
    @Value("${app.memory.long-term-threshold:0.7}")
    private double similarityThreshold;
    
    @Value("${app.memory.long-term-max-results:5}")
    private int maxResults;
    
    /**
     * Store content in long-term memory
     * 
     * @param user The user
     * @param content The content to store
     * @param summary Optional summary of the content
     * @param importance Importance score (0.0 to 1.0)
     * @return The created memory record
     */
    @Transactional
    public MemoryVector storeMemory(User user, String content, String summary, Double importance) {
        log.debug("Storing long-term memory for user {}", user.getId());
        
        // Generate embedding if embedding model is available
        List<Double> embedding = null;
        if (embeddingModel != null) {
            try {
                float[] embeddingArray = embeddingModel.embed(content);
                embedding = new ArrayList<>();
                for (float f : embeddingArray) {
                    embedding.add((double) f);
                }
            } catch (Exception e) {
                log.warn("Failed to generate embedding: {}", e.getMessage());
            }
        }
        
        // Create memory record
        MemoryVector memory = MemoryVector.builder()
                .user(user)
                .content(content)
                .summary(summary)
                .importance(importance != null ? importance : 0.5)
                .build();
        
        // Store embedding as JSON
        if (embedding != null) {
            try {
                memory.setEmbedding(objectMapper.writeValueAsString(embedding));
            } catch (JsonProcessingException e) {
                log.warn("Failed to serialize embedding: {}", e.getMessage());
            }
        }
        
        MemoryVector saved = memoryRepository.save(memory);
        
        // Also store in vector store if available
        if (vectorStore != null) {
            try {
                Document doc = new Document(content, Map.of(
                        "userId", user.getId().toString(),
                        "memoryId", saved.getId().toString(),
                        "importance", importance != null ? importance.toString() : "0.5"
                ));
                vectorStore.add(List.of(doc));
            } catch (Exception e) {
                log.warn("Failed to store in vector store: {}", e.getMessage());
            }
        }
        
        log.info("Stored memory {} for user {}", saved.getId(), user.getId());
        return saved;
    }
    
    /**
     * Search for relevant memories using semantic similarity
     * 
     * @param user The user
     * @param query The search query
     * @param topK Maximum number of results
     * @return List of relevant memories
     */
    @Transactional
    public List<MemoryVector> searchMemories(User user, String query, int topK) {
        log.debug("Searching memories for user {} with query: {}", user.getId(), query);
        
        // If vector store is available, use semantic search
        if (vectorStore != null) {
            try {
                SearchRequest searchRequest = SearchRequest.builder()
                        .query(query)
                        .topK(topK)
                        .similarityThreshold(similarityThreshold)
                        .filterExpression("userId == '" + user.getId() + "'")
                        .build();
                
                List<Document> results = vectorStore.similaritySearch(searchRequest);
                
                // Get memory IDs from results
                List<Long> memoryIds = results.stream()
                        .map(doc -> Long.parseLong(doc.getMetadata().get("memoryId").toString()))
                        .collect(Collectors.toList());
                
                // Fetch full memory records
                List<MemoryVector> memories = memoryRepository.findAllById(memoryIds);
                
                // Update access counts
                for (MemoryVector memory : memories) {
                    memoryRepository.incrementAccessCount(memory.getId(), LocalDateTime.now());
                }
                
                return memories;
            } catch (Exception e) {
                log.warn("Vector search failed, falling back to simple search: {}", e.getMessage());
            }
        }
        
        // Fallback: return most important memories
        return memoryRepository.findByUserId(user.getId(), PageRequest.of(0, topK));
    }
    
    /**
     * Get all memories for a user
     * 
     * @param user The user
     * @param limit Maximum number of memories to return
     * @return List of memories
     */
    public List<MemoryVector> getMemories(User user, int limit) {
        return memoryRepository.findByUserId(user.getId(), PageRequest.of(0, limit));
    }
    
    /**
     * Build context string from relevant memories
     * 
     * @param memories List of memories
     * @return Formatted context string
     */
    public String buildMemoryContext(List<MemoryVector> memories) {
        if (memories.isEmpty()) {
            return "";
        }
        
        StringBuilder context = new StringBuilder();
        context.append("\n[Relevant memories from past conversations:]\n");
        
        for (int i = 0; i < memories.size(); i++) {
            MemoryVector memory = memories.get(i);
            context.append(String.format("%d. %s\n", i + 1, 
                    memory.getSummary() != null ? memory.getSummary() : memory.getContent()));
        }
        
        context.append("[End of memories]\n");
        return context.toString();
    }
}
