package com.thelastwebsite.spots;

import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SpotRepository extends JpaRepository<Spot, UUID> {
    Optional<Spot> findBySpotNumber(Integer spotNumber);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Spot s WHERE s.spotNumber = :spotNumber")
    Optional<Spot> findBySpotNumberForUpdate(@Param("spotNumber") Integer spotNumber);

    List<Spot> findByStatus(String status);

    @Query("SELECT s FROM Spot s WHERE s.status = :status AND s.reservedUntil < :now")
    List<Spot> findExpiredReservations(@Param("status") String status, @Param("now") LocalDateTime now);

    List<Spot> findByUserId(UUID userId);

    Optional<Spot> findFirstByUserIdAndStatusOrderByUpdatedAtDesc(UUID userId, String status);

    @Query("SELECT s FROM Spot s WHERE s.x >= :minX AND s.x <= :maxX AND s.y >= :minY AND s.y <= :maxY")
    List<Spot> findSpotsInViewport(@Param("minX") Double minX,
                                   @Param("maxX") Double maxX,
                                   @Param("minY") Double minY,
                                   @Param("maxY") Double maxY);

    @Query("SELECT s FROM Spot s WHERE s.x >= :minX AND s.x <= :maxX AND s.y >= :minY AND s.y <= :maxY AND s.status = 'CLAIMED'")
    List<Spot> findClaimedInViewport(@Param("minX") Double minX,
                                     @Param("maxX") Double maxX,
                                     @Param("minY") Double minY,
                                     @Param("maxY") Double maxY);

    @Query("SELECT COUNT(s) FROM Spot s WHERE s.status = 'CLAIMED'")
    long countClaimedSpots();

    @Query("SELECT COUNT(s) FROM Spot s WHERE s.status = 'AVAILABLE'")
    long countAvailableSpots();

    @Query("SELECT COUNT(s) FROM Spot s WHERE s.status = 'PENDING_VERIFICATION'")
    long countPendingVerification();

    @Query("SELECT COUNT(s) FROM Spot s WHERE s.status = 'RESERVED'")
    long countReserved();

    @Query(value = """
            SELECT * FROM spots
            WHERE status = 'AVAILABLE' AND locked = false
            ORDER BY random()
            LIMIT 1
            """, nativeQuery = true)
    Optional<Spot> findRandomAvailable();

    @Query(value = """
            SELECT * FROM spots
            ORDER BY random()
            LIMIT 1
            """, nativeQuery = true)
    Optional<Spot> findRandomAny();

    List<Spot> findByStatusOrderByClaimedAtDesc(String status, Pageable pageable);

    @Query(value = """
            SELECT * FROM spots
            WHERE spot_number = :numeric
               OR (name ILIKE '%' || :q || '%')
               OR (message ILIKE '%' || :q || '%')
            ORDER BY
              CASE WHEN spot_number = :numeric THEN 0 ELSE 1 END,
              claimed_at DESC NULLS LAST
            LIMIT 20
            """, nativeQuery = true)
    List<Spot> search(@Param("q") String q, @Param("numeric") Integer numeric);

    @Query("SELECT s FROM Spot s WHERE s.moderationStatus = :status ORDER BY s.updatedAt DESC")
    List<Spot> findByModerationStatus(@Param("status") String status, Pageable pageable);

    @Modifying
    @Query("""
            UPDATE Spot s
            SET s.status = 'AVAILABLE', s.reservedUntil = null, s.user = null, s.name = null, s.message = null, s.updatedAt = :now
            WHERE ((s.status = 'RESERVED' AND s.reservedUntil < :now)
               OR (s.status = 'PENDING_VERIFICATION' AND s.reservedUntil IS NOT NULL AND s.reservedUntil < :now AND s.claimedAt IS NULL))
              AND NOT EXISTS (SELECT 1 FROM Payment p WHERE p.spot = s AND p.status = 'SUCCEEDED')
            """)
    int releaseExpiredReservations(@Param("now") LocalDateTime now);
}
