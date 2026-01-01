package com.example.chatbot.repository;

import com.example.chatbot.entity.MemoryVector;
import com.example.chatbot.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface MemoryVectorRepository extends JpaRepository<MemoryVector, Long> {
    
    List<MemoryVector> findByUserOrderByImportanceDesc(User user, Pageable pageable);
    
    @Query("SELECT m FROM MemoryVector m WHERE m.user.id = :userId ORDER BY m.importance DESC, m.createdAt DESC")
    List<MemoryVector> findByUserId(@Param("userId") Long userId, Pageable pageable);
    
    @Modifying
    @Query("UPDATE MemoryVector m SET m.accessCount = m.accessCount + 1, m.lastAccessedAt = :now WHERE m.id = :id")
    void incrementAccessCount(@Param("id") Long id, @Param("now") LocalDateTime now);
}
