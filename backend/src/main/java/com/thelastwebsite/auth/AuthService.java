package com.thelastwebsite.auth;

import com.thelastwebsite.common.ApiException;
import com.thelastwebsite.common.AuditService;
import com.thelastwebsite.common.Constants;
import com.thelastwebsite.email.EmailService;
import com.thelastwebsite.spots.Spot;
import com.thelastwebsite.spots.SpotRepository;
import com.thelastwebsite.users.User;
import com.thelastwebsite.users.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Service
public class AuthService {
    public static final String PURPOSE_CLAIM = "CLAIM";
    public static final String PURPOSE_MANAGE = "MANAGE";

    private final UserRepository userRepository;
    private final VerificationTokenRepository verificationTokenRepository;
    private final AuthSessionRepository authSessionRepository;
    private final SpotRepository spotRepository;
    private final EmailService emailService;
    private final TokenHasher tokenHasher;
    private final AuditService auditService;

    public AuthService(UserRepository userRepository,
                       VerificationTokenRepository verificationTokenRepository,
                       AuthSessionRepository authSessionRepository,
                       SpotRepository spotRepository,
                       EmailService emailService,
                       TokenHasher tokenHasher,
                       AuditService auditService) {
        this.userRepository = userRepository;
        this.verificationTokenRepository = verificationTokenRepository;
        this.authSessionRepository = authSessionRepository;
        this.spotRepository = spotRepository;
        this.emailService = emailService;
        this.tokenHasher = tokenHasher;
        this.auditService = auditService;
    }

    @Transactional
    public void sendManagementCode(String email) {
        User user = userRepository.findByEmail(email.toLowerCase())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "No spots found for this email."));
        String code = createCode(user, null, PURPOSE_MANAGE);
        emailService.sendManagementCode(user.getEmail(), code);
    }

    @Transactional
    public void sendClaimCode(User user, Spot spot) {
        String code = createCode(user, spot, PURPOSE_CLAIM);
        emailService.sendClaimVerification(user.getEmail(), spot.getSpotNumber(), code);
    }

    @Transactional
    public VerifyResult verifyCode(String email, String code, String purpose) {
        String hash = tokenHasher.hash(code);
        VerificationToken match = verificationTokenRepository
                .findActiveCode(email.toLowerCase(), purpose, hash, LocalDateTime.now())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "Invalid or expired code."));

        match.setUsedAt(LocalDateTime.now());
        verificationTokenRepository.save(match);

        User user = match.getUser();
        user.setEmailVerified(true);
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        Spot claimed = null;
        if (PURPOSE_CLAIM.equals(purpose) && match.getSpot() != null) {
            claimed = match.getSpot();
            claimed.setStatus(Constants.STATUS_CLAIMED);
            claimed.setUser(user);
            claimed.setClaimedAt(LocalDateTime.now());
            claimed.setReservedUntil(null);
            claimed.setUpdatedAt(LocalDateTime.now());
            spotRepository.save(claimed);
            auditService.record(user, claimed, Constants.ACTION_SPOT_CLAIMED, null);
            emailService.sendClaimConfirmation(user.getEmail(), claimed.getSpotNumber(), claimed.getName(), claimed.getMessage());
        }

        AuthSession session = new AuthSession();
        session.setUser(user);
        session.setSpot(claimed);
        String sessionRaw = tokenHasher.generateRawToken();
        session.setTokenHash(tokenHasher.hash(sessionRaw));
        session.setExpiresAt(Instant.now().plus(14, ChronoUnit.DAYS));
        authSessionRepository.save(session);
        auditService.record(user, claimed, Constants.ACTION_EMAIL_VERIFIED, null);
        return new VerifyResult(sessionRaw, user, claimed);
    }

    public User requireUser(String rawSession) {
        if (rawSession == null || rawSession.isBlank()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }
        AuthSession session = authSessionRepository.findByTokenHash(tokenHasher.hash(rawSession))
                .filter(item -> item.getExpiresAt().isAfter(Instant.now()))
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Authentication required."));
        return session.getUser();
    }

    public User findOrCreate(String email) {
        return userRepository.findByEmail(email.toLowerCase()).orElseGet(() -> {
            User user = new User();
            user.setEmail(email.toLowerCase());
            user.setEmailVerified(false);
            return userRepository.save(user);
        });
    }

    private String createCode(User user, Spot spot, String purpose) {
        String code = tokenHasher.generateCode();
        VerificationToken token = new VerificationToken();
        token.setUser(user);
        token.setSpot(spot);
        token.setPurpose(purpose);
        token.setTokenHash(tokenHasher.hash(code));
        token.setExpiresAt(LocalDateTime.now().plusMinutes(Constants.OTP_EXPIRY_MINUTES));
        verificationTokenRepository.save(token);
        return code;
    }

    public record VerifyResult(String sessionToken, User user, Spot claimedSpot) {}
}
