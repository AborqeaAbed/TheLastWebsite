package com.thelastwebsite.email;

import com.resend.Resend;
import com.resend.services.emails.model.CreateEmailOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!dev")
public class ResendEmailSender implements EmailSender {

    private final Resend resend;
    private final String from;

    public ResendEmailSender(
            @Value("${resend.api-key}") String apiKey,
            @Value("${email.from}") String from) {
        this.resend = new Resend(apiKey);
        this.from = from;
    }

    @Override
    public void send(String to, String subject, String htmlBody) {
        try {
            CreateEmailOptions params = CreateEmailOptions.builder()
                    .from(from)
                    .to(to)
                    .subject(subject)
                    .html(htmlBody)
                    .build();
            resend.emails().send(params);
        } catch (Exception ex) {
            throw new IllegalStateException("Failed to send email via Resend", ex);
        }
    }
}
