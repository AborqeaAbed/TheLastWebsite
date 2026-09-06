package com.thelastwebsite.email;

public interface EmailSender {
    void send(String to, String subject, String htmlBody);
}
