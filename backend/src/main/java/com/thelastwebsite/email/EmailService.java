package com.thelastwebsite.email;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private final EmailSender emailSender;
    private final String baseUrl;

    public EmailService(EmailSender emailSender, @Value("${email.magic-link-base-url}") String baseUrl) {
        this.emailSender = emailSender;
        this.baseUrl = baseUrl;
    }

    public void sendClaimVerification(String to, int spotNumber, String rawToken) {
        String link = baseUrl + "/verify?token=" + rawToken;
        String body = """
                <p>You just claimed Spot #%d.</p>
                <p>Click below to verify your email and permanently claim your spot.</p>
                <p><a href="%s">VERIFY &amp; CLAIM MY SPOT</a></p>
                <p>If you didn't make this purchase, you can safely ignore this email.</p>
                """.formatted(spotNumber, link);
        emailSender.send(to, "Your spot on The Last Website is waiting", body);
    }

    public void sendManagementLink(String to, String rawToken) {
        String link = baseUrl + "/verify?token=" + rawToken;
        String body = """
                <p>Use this link to manage your spots.</p>
                <p><a href="%s">OPEN MY SPOTS</a></p>
                """.formatted(link);
        emailSender.send(to, "Manage your spots on The Last Website", body);
    }
}
