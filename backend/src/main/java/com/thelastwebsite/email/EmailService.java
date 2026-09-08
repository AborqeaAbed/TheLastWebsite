package com.thelastwebsite.email;

import org.springframework.stereotype.Service;

@Service
public class EmailService {
    private final EmailSender emailSender;

    public EmailService(EmailSender emailSender) {
        this.emailSender = emailSender;
    }

    public void sendClaimVerification(String to, int spotNumber, String code) {
        String body = """
                <p>You just paid for Spot #%d on The Last Website.</p>
                <p>Enter the code below on the website to permanently claim your spot:</p>
                <h2 style="font-size:2rem;letter-spacing:0.3em;font-family:monospace">%s</h2>
                <p>This code expires in 15 minutes. If you didn't make this purchase, ignore this email.</p>
                """.formatted(spotNumber, code);
        emailSender.send(to, "Your verification code for Spot #" + spotNumber, body);
    }

    public void sendClaimConfirmation(String to, int spotNumber, String name, String message) {
        String body = """
                <!DOCTYPE html>
                <html>
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;background:#0F1117;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#0F1117;padding:40px 16px;">
                    <tr><td align="center">
                      <table width="100%%" cellpadding="0" cellspacing="0" style="max-width:520px;">

                        <!-- Header -->
                        <tr><td style="padding-bottom:32px;text-align:center;">
                          <p style="margin:0;font-size:11px;letter-spacing:0.25em;color:#D4AF37;text-transform:uppercase;">The Last Website</p>
                        </td></tr>

                        <!-- Hero card -->
                        <tr><td style="background:#1A2035;border:1px solid rgba(212,175,55,0.2);border-radius:16px;padding:40px 36px;">

                          <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.2em;color:#D4AF37;text-transform:uppercase;">Your spot is live</p>
                          <h1 style="margin:0 0 24px;font-size:28px;font-weight:700;color:#E8E8E8;line-height:1.2;">
                            Congratulations, %s.
                          </h1>

                          <!-- Spot number badge -->
                          <div style="display:inline-block;background:rgba(212,175,55,0.1);border:1.5px solid rgba(212,175,55,0.35);border-radius:10px;padding:10px 20px;margin-bottom:28px;">
                            <span style="font-size:13px;font-weight:700;letter-spacing:0.15em;color:#D4AF37;">SPOT #%d</span>
                          </div>

                          <!-- Message card -->
                          <div style="background:rgba(212,175,55,0.06);border-left:3px solid #D4AF37;border-radius:0 10px 10px 0;padding:20px 24px;margin-bottom:28px;">
                            <p style="margin:0 0 10px;font-size:17px;font-style:italic;color:#E8E8E8;line-height:1.5;">&ldquo;%s&rdquo;</p>
                            <p style="margin:0;font-size:14px;color:#A0A8B8;">&mdash; %s</p>
                          </div>

                          <p style="margin:0 0 28px;font-size:14px;color:#A0A8B8;line-height:1.6;">
                            Your spot is permanently yours. No renewals, no expiry — it lives on the grid forever.
                          </p>

                          <!-- Divider -->
                          <div style="border-top:1px solid rgba(212,175,55,0.1);margin-bottom:28px;"></div>

                          <p style="margin:0;font-size:13px;color:#7A8297;line-height:1.6;">
                            To manage or update your spot, visit <a href="https://thelastwebsite.com" style="color:#D4AF37;text-decoration:none;">thelastwebsite.com</a> and click <em>My Spot</em>.
                          </p>

                        </td></tr>

                        <!-- Footer -->
                        <tr><td style="padding-top:28px;text-align:center;">
                          <p style="margin:0;font-size:12px;color:#4A5568;">
                            &copy; The Last Website &nbsp;&middot;&nbsp; You received this because you claimed a spot.
                          </p>
                        </td></tr>

                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(name, spotNumber, message, name);
        emailSender.send(to, "Your permanent spot is live — Spot #" + spotNumber, body);
    }

    public void sendManagementCode(String to, String code) {
        String body = """
                <p>Your verification code for The Last Website:</p>
                <h2 style="font-size:2rem;letter-spacing:0.3em;font-family:monospace">%s</h2>
                <p>Enter this code on the website to access your spots. Expires in 15 minutes.</p>
                """.formatted(code);
        emailSender.send(to, "Your verification code — The Last Website", body);
    }
}
