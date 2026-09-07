package com.thelastwebsite.spots;

import com.thelastwebsite.spots.dto.SpotDto;
import com.thelastwebsite.spots.dto.StatsDto;
import com.thelastwebsite.spots.dto.ViewportResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/spots")
public class SpotController {
    private final SpotService spotService;

    public SpotController(SpotService spotService) {
        this.spotService = spotService;
    }

    @GetMapping("/stats")
    public StatsDto stats() {
        return spotService.stats();
    }

    @GetMapping("/viewport")
    public ViewportResponse getSpotsInViewport(
            @RequestParam Double minX,
            @RequestParam Double maxX,
            @RequestParam Double minY,
            @RequestParam Double maxY,
            @RequestParam Integer zoom) {
        return spotService.getSpotsInViewport(minX, maxX, minY, maxY, zoom);
    }

    @GetMapping("/random")
    public ResponseEntity<SpotDto> getRandomAvailableSpot() {
        return spotService.getRandomAvailableSpot()
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/latest")
    public List<SpotDto> getLatestClaims() {
        return spotService.getLatestClaims();
    }

    @GetMapping("/search")
    public List<SpotDto> search(@RequestParam String q) {
        return spotService.search(q);
    }

    @GetMapping("/{spotNumber}")
    public ResponseEntity<SpotDto> getSpot(@PathVariable @Min(1) @Max(1_000_000) Integer spotNumber) {
        return spotService.getSpotByNumber(spotNumber)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/{spotNumber}/reserve")
    public ResponseEntity<Map<String, Object>> reserveSpot(@PathVariable Integer spotNumber) {
        Spot reserved = spotService.reserveSpot(spotNumber);
        return ResponseEntity.ok(Map.of(
                "spotNumber", reserved.getSpotNumber(),
                "status", reserved.getStatus(),
                "reservedUntil", reserved.getReservedUntil()
        ));
    }

    @PostMapping("/{spotNumber}/release")
    public ResponseEntity<Map<String, Object>> releaseSpot(@PathVariable Integer spotNumber) {
        Spot released = spotService.releaseReservation(spotNumber);
        return ResponseEntity.ok(Map.of(
                "spotNumber", released.getSpotNumber(),
                "status", released.getStatus()
        ));
    }
}
