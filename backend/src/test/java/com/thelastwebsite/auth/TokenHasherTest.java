package com.thelastwebsite.auth;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TokenHasherTest {
    @Test
    void hashesAreDeterministicAndNotRaw() {
        TokenHasher hasher = new TokenHasher();
        String raw = hasher.generateRawToken();
        assertThat(hasher.hash(raw)).isEqualTo(hasher.hash(raw));
        assertThat(hasher.hash(raw)).isNotEqualTo(raw);
        assertThat(hasher.hash("other")).isNotEqualTo(hasher.hash(raw));
    }
}
