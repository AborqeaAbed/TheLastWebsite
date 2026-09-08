package com.thelastwebsite.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VerificationTokenRepository extends JpaRepository<VerificationToken, UUID> {
    Optional<VerificationToken> findByTokenHash(String tokenHash);
    void deleteByExpiresAtBefore(LocalDateTime now);

    @Query("SELECT t FROM VerificationToken t WHERE t.user.email = :email AND t.purpose = :purpose AND t.tokenHash = :tokenHash AND t.usedAt IS NULL AND t.expiresAt > :now")
    Optional<VerificationToken> findActiveCode(@Param("email") String email, @Param("purpose") String purpose, @Param("tokenHash") String tokenHash, @Param("now") LocalDateTime now);
}