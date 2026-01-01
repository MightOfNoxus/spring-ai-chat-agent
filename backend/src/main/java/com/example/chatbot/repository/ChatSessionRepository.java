package com.example.chatbot.repository;

import com.example.chatbot.entity.ChatSession;
import com.example.chatbot.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    
    List<ChatSession> findByUserAndIsActiveTrueOrderByUpdatedAtDesc(User user);
    
    @Query("SELECT s FROM ChatSession s WHERE s.id = :sessionId AND s.user.id = :userId")
    Optional<ChatSession> findByIdAndUserId(@Param("sessionId") Long sessionId, @Param("userId") Long userId);
    
    @Query("SELECT s FROM ChatSession s LEFT JOIN FETCH s.messages WHERE s.id = :sessionId AND s.user.id = :userId")
    Optional<ChatSession> findByIdAndUserIdWithMessages(@Param("sessionId") Long sessionId, @Param("userId") Long userId);
}
