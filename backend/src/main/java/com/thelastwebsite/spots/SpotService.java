package com.thelastwebsite.spots;

import com.thelastwebsite.common.ApiException;
import com.thelastwebsite.common.AuditService;
import com.thelastwebsite.common.Constants;
import com.thelastwebsite.moderation.ContentModerationService;
import com.thelastwebsite.spots.dto.SpotDto;
import com.thelastwebsite.spots.dto.StatsDto;
import com.thelastwebsite.spots.dto.UpdateSpotRequest;
import com.thelastwebsite.spots.dto.ViewportResponse;
import com.thelastwebsite.users.User;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class SpotService {
    private final SpotRepository spotRepository;
    private final ContentModerationService moderationService;
    private final AuditService auditService;

    public SpotService(SpotRepository spotRepository,
                       ContentModerationService moderationService,
                       AuditService auditService) {
        this.spotRepository = spotRepository;
        this.moderationService = moderationService;
        this.auditService = auditService;
    }

    public Optional<SpotDto> getSpotByNumber(Integer spotNumber) {
        return spotRepository.findBySpotNumber(spotNumber).map(this::toPublicDto);
    }

    public ViewportResponse getSpotsInViewport(Double minX, Double maxX, Double minY, Double maxY, Integer zoom) {
        ViewportResponse response = new ViewportResponse();
        int safeZoom = zoom == null ? 1 : zoom;
        if (safeZoom <= 1) {
            response.setMode("universe");
            response.setClaimed(spotRepository.countClaimedSpots());
            response.setAvailable(spotRepository.countAvailableSpots());
            return response;
        }
        if (safeZoom == 2) {
            response.setMode("regions");
            List<Spot> claimed = spotRepository.findClaimedInViewport(minX, maxX, minY, maxY);
            Map<String, Map<String, Object>> buckets = new HashMap<>();
            for (Spot spot : claimed) {
                int gx = (int) Math.floor(spot.getX() * 20);
                int gy = (int) Math.floor(spot.getY() * 20);
                String key = gx + ":" + gy;
                buckets.computeIfAbsent(key, ignored -> {
                    Map<String, Object> bucket = new HashMap<>();
                    bucket.put("x", gx / 20.0);
                    bucket.put("y", gy / 20.0);
                    bucket.put("claimed", 0);
                    return bucket;
                });
                bucketIncrement(buckets.get(key));
            }
            response.setRegions(new ArrayList<>(buckets.values()));
            response.setClaimed((long) claimed.size());
            return response;
        }
        response.setMode("spots");
        List<SpotDto> spots = spotRepository.findSpotsInViewport(minX, maxX, minY, maxY)
                .stream()
                .limit(2500)
                .map(this::toPublicDto)
                .toList();
        response.setSpots(spots);
        return response;
    }

    public Optional<SpotDto> getRandomAvailableSpot() {
        return spotRepository.findRandomAvailable().or(() -> spotRepository.findRandomAny()).map(this::toPublicDto);
    }

    public List<SpotDto> getLatestClaims() {
        return spotRepository.findByStatusOrderByClaimedAtDesc(Constants.STATUS_CLAIMED, PageRequest.of(0, 12))
                .stream()
                .map(this::toPublicDto)
                .toList();
    }

    public List<SpotDto> search(String query) {
        if (query == null || query.isBlank()) {
            return List.of();
        }
        Integer numeric = null;
        String digits = query.replaceAll("[^0-9]", "");
        if (!digits.isBlank()) {
            try {
                numeric = Integer.parseInt(digits);
            } catch (NumberFormatException ignored) {
                numeric = -1;
            }
        } else {
            numeric = -1;
        }
        return spotRepository.search(query.trim(), numeric).stream().map(this::toPublicDto).toList();
    }

    public StatsDto stats() {
        StatsDto stats = new StatsDto();
        stats.setClaimed(spotRepository.countClaimedSpots());
        stats.setAvailable(spotRepository.countAvailableSpots());
        stats.setPendingVerification(spotRepository.countPendingVerification());
        stats.setReserved(spotRepository.countReserved());
        stats.setTotal(Constants.TOTAL_SPOTS);
        long claimed = stats.getClaimed();
        long launchRemaining = Math.max(0, Constants.LAUNCH_SUBSCRIBER_LIMIT - claimed);
        stats.setLaunchSpotsRemaining(launchRemaining);
        stats.setCurrentPriceCents(launchRemaining > 0 ? Constants.LAUNCH_PRICE_CENTS : Constants.STANDARD_PRICE_CENTS);
        stats.setNextPriceCents(Constants.STANDARD_PRICE_CENTS);
        stats.setLaunchRevenueCents(Math.min(claimed, Constants.LAUNCH_SUBSCRIBER_LIMIT) * (long) Constants.LAUNCH_PRICE_CENTS);
        stats.setLaunchRevenueGoalCents((long) Constants.LAUNCH_SUBSCRIBER_LIMIT * Constants.LAUNCH_PRICE_CENTS);
        return stats;
    }

    @Transactional
    public Spot reserveSpot(Integer spotNumber) {
        Spot spot = spotRepository.findBySpotNumberForUpdate(spotNumber)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Spot not found"));
        releaseIfExpired(spot);
        if (Boolean.TRUE.equals(spot.getLocked())) {
            throw new ApiException(HttpStatus.CONFLICT, "This spot is locked.");
        }
        if (!Constants.STATUS_AVAILABLE.equals(spot.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "This spot was just claimed by someone else.");
        }
        spot.setStatus(Constants.STATUS_RESERVED);
        spot.setReservedUntil(LocalDateTime.now().plusSeconds(Constants.RESERVATION_TIMEOUT_SECONDS));
        spot.setUpdatedAt(LocalDateTime.now());
        Spot saved = spotRepository.save(spot);
        auditService.record(null, saved, Constants.ACTION_SPOT_RESERVED, null);
        return saved;
    }

    @Transactional
    public Spot releaseReservation(Integer spotNumber) {
        Spot spot = spotRepository.findBySpotNumberForUpdate(spotNumber)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Spot not found"));
        if (Constants.STATUS_CLAIMED.equals(spot.getStatus())) {
            return spot;
        }
        if (Constants.STATUS_RESERVED.equals(spot.getStatus())
                || Constants.STATUS_PENDING_VERIFICATION.equals(spot.getStatus())) {
            spot.setStatus(Constants.STATUS_AVAILABLE);
            spot.setReservedUntil(null);
            spot.setUser(null);
            spot.setName(null);
            spot.setMessage(null);
            spot.setUpdatedAt(LocalDateTime.now());
            return spotRepository.save(spot);
        }
        return spot;
    }

    public boolean isActiveReservation(Spot spot) {
        if (spot == null || !Constants.STATUS_RESERVED.equals(spot.getStatus())) {
            return false;
        }
        return spot.getReservedUntil() != null && spot.getReservedUntil().isAfter(LocalDateTime.now());
    }

    @Transactional
    public SpotDto updateOwnedSpot(User user, Integer spotNumber, UpdateSpotRequest request) {
        Spot spot = spotRepository.findBySpotNumber(spotNumber)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Spot not found"));
        if (spot.getUser() == null || !spot.getUser().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You cannot edit another user's spot.");
        }
        if (!Constants.STATUS_CLAIMED.equals(spot.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "Spot is not yet permanently claimed.");
        }
        String name = moderationService.sanitize(request.getName());
        String message = moderationService.sanitize(request.getMessage());
        spot.setName(name);
        spot.setMessage(message);
        spot.setModerationStatus(moderationService.evaluate(name, message));
        spot.setUpdatedAt(LocalDateTime.now());
        auditService.record(user, spot, Constants.ACTION_SPOT_EDITED, null);
        return toPublicDto(spotRepository.save(spot));
    }

    public List<SpotDto> spotsForUser(UUID userId) {
        return spotRepository.findByUserId(userId).stream().map(this::toPublicDto).toList();
    }

    @Scheduled(fixedDelay = 30_000)
    @Transactional
    public void expireReservations() {
        spotRepository.releaseExpiredReservations(LocalDateTime.now());
    }

    public SpotDto toPublicDto(Spot spot) {
        SpotDto dto = new SpotDto();
        dto.setSpotNumber(spot.getSpotNumber());
        dto.setX(spot.getX());
        dto.setY(spot.getY());
        dto.setStatus(spot.getStatus());
        dto.setClaimedAt(spot.getClaimedAt());
        dto.setModerationStatus(spot.getModerationStatus());
        if (!Constants.MODERATION_REJECTED.equals(spot.getModerationStatus())
                && (Constants.STATUS_CLAIMED.equals(spot.getStatus())
                || Constants.STATUS_PENDING_VERIFICATION.equals(spot.getStatus()))) {
            dto.setName(spot.getName());
            dto.setMessage(spot.getMessage());
        }
        return dto;
    }

    private void releaseIfExpired(Spot spot) {
        boolean unfinished = Constants.STATUS_RESERVED.equals(spot.getStatus())
                || (Constants.STATUS_PENDING_VERIFICATION.equals(spot.getStatus())
                    && spot.getClaimedAt() == null
                    && spot.getReservedUntil() != null);
        boolean expired = spot.getReservedUntil() != null && spot.getReservedUntil().isBefore(LocalDateTime.now());
        if (unfinished && expired) {
            spot.setStatus(Constants.STATUS_AVAILABLE);
            spot.setReservedUntil(null);
            spot.setUser(null);
            spot.setName(null);
            spot.setMessage(null);
        }
    }

    private void bucketIncrement(Map<String, Object> bucket) {
        Number current = (Number) bucket.get("claimed");
        bucket.put("claimed", current.intValue() + 1);
    }
}
