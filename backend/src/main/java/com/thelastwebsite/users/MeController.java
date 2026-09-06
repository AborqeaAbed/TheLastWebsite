package com.thelastwebsite.users;

import com.thelastwebsite.auth.AuthController;
import com.thelastwebsite.auth.AuthService;
import com.thelastwebsite.spots.SpotService;
import com.thelastwebsite.spots.dto.SpotDto;
import com.thelastwebsite.spots.dto.UpdateSpotRequest;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/me")
public class MeController {
    private final AuthService authService;
    private final SpotService spotService;

    public MeController(AuthService authService, SpotService spotService) {
        this.authService = authService;
        this.spotService = spotService;
    }

    @GetMapping("/spots")
    public List<SpotDto> mySpots(HttpServletRequest request) {
        return spotService.spotsForUser(authService.requireUser(sessionFrom(request)).getId());
    }

    @PutMapping("/spots/{spotNumber}")
    public SpotDto updateSpot(@PathVariable Integer spotNumber,
                              @Valid @RequestBody UpdateSpotRequest body,
                              HttpServletRequest request) {
        return spotService.updateOwnedSpot(authService.requireUser(sessionFrom(request)), spotNumber, body);
    }

    @GetMapping
    public Map<String, Object> me(HttpServletRequest request) {
        var user = authService.requireUser(sessionFrom(request));
        return Map.of("email", user.getEmail(), "verified", user.getEmailVerified());
    }

    private String sessionFrom(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        return Arrays.stream(request.getCookies())
                .filter(cookie -> AuthController.SESSION_COOKIE.equals(cookie.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
