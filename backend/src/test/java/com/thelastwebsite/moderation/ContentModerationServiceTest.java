package com.thelastwebsite.moderation;

import com.thelastwebsite.common.Constants;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ContentModerationServiceTest {
    private final ContentModerationService service = new ContentModerationService();

    @Test
    void stripsHtml() {
        assertThat(service.sanitize("<b>hello</b>")).isEqualTo("hello");
    }

    @Test
    void flagsInjection() {
        assertThat(service.evaluate("n", "javascript:alert(1)")).isEqualTo(Constants.MODERATION_REJECTED);
    }
}
