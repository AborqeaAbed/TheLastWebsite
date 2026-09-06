package com.thelastwebsite.moderation;

import com.thelastwebsite.common.Constants;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

@Service
public class ContentModerationService {
    private static final Pattern HTML = Pattern.compile("<[^>]+>");
    private static final Pattern SCRIPT = Pattern.compile("(?i)javascript:|data:text/html|on\\w+=");
    private static final List<String> BLOCKED = List.of(
            "buy followers", "crypto airdrop", "click here now"
    );

    public String sanitize(String raw) {
        if (raw == null) {
            return "";
        }
        return HTML.matcher(raw).replaceAll("").replace("\u0000", "").trim();
    }

    public String evaluate(String name, String message) {
        String combined = (name + " " + message).toLowerCase(Locale.ROOT);
        if (SCRIPT.matcher(combined).find()) {
            return Constants.MODERATION_REJECTED;
        }
        for (String phrase : BLOCKED) {
            if (combined.contains(phrase)) {
                return Constants.MODERATION_PENDING;
            }
        }
        return Constants.MODERATION_APPROVED;
    }
}
