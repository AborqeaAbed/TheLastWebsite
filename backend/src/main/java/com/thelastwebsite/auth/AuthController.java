package com.thelastwebsite.auth;

import com.thelastwebsite.auth.dto.MagicLinkRequestDto;
import com.thelastwebsite.auth.dto.VerifyCodeRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    public static final String SESSION_COOKIE = "tlw_session";

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/request-code")
    public ResponseEntity<Map<String, String>> requestCode(@Valid @RequestBody MagicLinkRequestDto request) {
        authService.sendManagementCode(request.getEmail());
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @PostMapping("/verify-code")
    public ResponseEntity<Map<String, Object>> verifyCode(@Valid @RequestBody VerifyCodeRequest request,
                                                          HttpServletResponse response) {
        AuthService.VerifyResult result = authService.verifyCode(request.getEmail(), request.getCode(), request.getPurpose());
        ResponseCookie cookie = ResponseCookie.from(SESSION_COOKIE, result.sessionToken())
                .httpOnly(true)
                .secure(false)
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofDays(14))
                .build();
        response.addHeader("Set-Cookie", cookie.toString());

        Map<String, Object> body = new HashMap<>();
        body.put("verified", true);
        if (result.claimedSpot() != null) {
            body.put("spotNumber", result.claimedSpot().getSpotNumber());
            body.put("name", result.claimedSpot().getName());
            body.put("message", result.claimedSpot().getMessage());
        }
        return ResponseEntity.ok(body);
    }
}
