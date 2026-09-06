package com.thelastwebsite.analytics;

import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {
    private static final Set<String> ALLOWED = Set.of(
            "homepage_view", "map_loaded", "map_zoom", "map_pan", "spot_viewed",
            "search_started", "search_result_clicked", "random_spot_clicked",
            "claim_started", "checkout_started", "payment_success",
            "email_verification", "spot_claimed", "spot_edited", "spot_shared"
    );

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    public record TrackRequest(@NotBlank String eventName, String metadata) {}

    @PostMapping
    public ResponseEntity<Void> track(@RequestBody TrackRequest request) {
        if (!ALLOWED.contains(request.eventName())) {
            return ResponseEntity.badRequest().build();
        }
        analyticsService.track(request.eventName(), request.metadata());
        return ResponseEntity.accepted().build();
    }
}
