package com.thelastwebsite.admin;

import com.thelastwebsite.common.AuditLog;
import com.thelastwebsite.common.AuditLogRepository;
import com.thelastwebsite.common.AuditService;
import com.thelastwebsite.common.Constants;
import com.thelastwebsite.payments.Payment;
import com.thelastwebsite.payments.PaymentRepository;
import com.thelastwebsite.spots.Spot;
import com.thelastwebsite.spots.SpotRepository;
import com.thelastwebsite.spots.SpotService;
import com.thelastwebsite.spots.dto.StatsDto;
import com.thelastwebsite.users.User;
import com.thelastwebsite.users.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final SpotService spotService;
    private final SpotRepository spotRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;
    private final String adminToken;

    public AdminController(SpotService spotService,
                           SpotRepository spotRepository,
                           UserRepository userRepository,
                           PaymentRepository paymentRepository,
                           AuditLogRepository auditLogRepository,
                           AuditService auditService,
                           @Value("${admin.token:dev-admin-token}") String adminToken) {
        this.spotService = spotService;
        this.spotRepository = spotRepository;
        this.userRepository = userRepository;
        this.paymentRepository = paymentRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditService = auditService;
        this.adminToken = adminToken;
    }

    @GetMapping("/stats")
    public Map<String, Object> stats(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        requireAdmin(token);
        StatsDto stats = spotService.stats();
        long revenue = paymentRepository.findAll().stream()
                .filter(p -> Constants.PAYMENT_SUCCEEDED.equals(p.getStatus()))
                .mapToLong(Payment::getAmount)
                .sum();
        long today = spotRepository.findByStatusOrderByClaimedAtDesc(Constants.STATUS_CLAIMED, PageRequest.of(0, 5000))
                .stream()
                .filter(s -> s.getClaimedAt() != null && s.getClaimedAt().toLocalDate().equals(LocalDate.now()))
                .count();
        return Map.of(
                "totalSpots", stats.getTotal(),
                "claimed", stats.getClaimed(),
                "available", stats.getAvailable(),
                "pendingVerification", stats.getPendingVerification(),
                "revenueCents", revenue,
                "claimsToday", today
        );
    }

    @GetMapping("/users")
    public List<User> users(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                            @RequestParam(required = false) String q) {
        requireAdmin(token);
        if (q == null || q.isBlank()) {
            return userRepository.findAll(PageRequest.of(0, 50)).getContent();
        }
        return userRepository.findByEmail(q).map(List::of).orElse(List.of());
    }

    @GetMapping("/spots")
    public List<Spot> spots(@RequestHeader(value = "X-Admin-Token", required = false) String token,
                            @RequestParam(required = false) Integer spotNumber) {
        requireAdmin(token);
        if (spotNumber != null) {
            return spotRepository.findBySpotNumber(spotNumber).map(List::of).orElse(List.of());
        }
        return spotRepository.findByStatusOrderByClaimedAtDesc(Constants.STATUS_CLAIMED, PageRequest.of(0, 50));
    }

    @GetMapping("/moderation")
    public List<Spot> moderation(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        requireAdmin(token);
        return spotRepository.findByModerationStatus(Constants.MODERATION_PENDING, PageRequest.of(0, 50));
    }

    @PostMapping("/spots/{spotNumber}/lock")
    public Map<String, Object> lock(@PathVariable Integer spotNumber,
                                    @RequestHeader(value = "X-Admin-Token", required = false) String token) {
        requireAdmin(token);
        Spot spot = spotRepository.findBySpotNumber(spotNumber).orElseThrow();
        spot.setLocked(true);
        spot.setUpdatedAt(LocalDateTime.now());
        spotRepository.save(spot);
        auditService.record(null, spot, Constants.ACTION_SPOT_LOCKED, null);
        return Map.of("locked", true);
    }

    @PostMapping("/spots/{spotNumber}/moderate")
    public Map<String, Object> moderate(@PathVariable Integer spotNumber,
                                        @RequestParam String status,
                                        @RequestHeader(value = "X-Admin-Token", required = false) String token) {
        requireAdmin(token);
        Spot spot = spotRepository.findBySpotNumber(spotNumber).orElseThrow();
        spot.setModerationStatus(status);
        spot.setUpdatedAt(LocalDateTime.now());
        spotRepository.save(spot);
        auditService.record(null, spot, Constants.ACTION_MESSAGE_MODERATED, status);
        return Map.of("moderationStatus", status);
    }

    @GetMapping("/audit")
    public List<AuditLog> audit(@RequestHeader(value = "X-Admin-Token", required = false) String token) {
        requireAdmin(token);
        return auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, 100));
    }

    private void requireAdmin(String token) {
        if (token == null || !token.equals(adminToken)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin only");
        }
    }
}
