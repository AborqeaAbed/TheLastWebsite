package com.thelastwebsite.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Configuration
public class SecurityConfig {

    @Value("${cors.allowed-origins:http://localhost:3000}")
    private String allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        List<String> origins = Arrays.asList(allowedOrigins.split(","));
        http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(request -> {
                    CorsConfiguration config = new CorsConfiguration();
                    config.setAllowedOrigins(origins);
                    config.setAllowedMethods(List.of("GET", "POST", "PUT", "OPTIONS"));
                    config.setAllowedHeaders(List.of("*"));
                    config.setAllowCredentials(true);
                    return config;
                }))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .headers(headers -> headers
                        .contentTypeOptions(content -> {})
                        .referrerPolicy(policy -> policy.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.SAME_ORIGIN)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/admin/**").permitAll()
                        .requestMatchers("/api/**").permitAll()
                        .anyRequest().permitAll())
                .addFilterBefore(new RateLimitFilter(), UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    static class RateLimitFilter extends OncePerRequestFilter {
        private final Map<String, Window> windows = new ConcurrentHashMap<>();

        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
                throws ServletException, IOException {
            String path = request.getRequestURI();
            if (path.startsWith("/api/auth") || path.startsWith("/api/payments/create-checkout") || (path.startsWith("/api/spots") && request.getMethod().equals("POST"))) {
                String key = request.getRemoteAddr() + path;
                Window window = windows.compute(key, (k, current) -> {
                    long now = Instant.now().getEpochSecond();
                    if (current == null || now - current.start > 60) {
                        return new Window(now, 1);
                    }
                    current.count++;
                    return current;
                });
                if (window.count > 30) {
                    response.setStatus(429);
                    response.getWriter().write("{\"error\":\"Too many requests\"}");
                    return;
                }
            }
            filterChain.doFilter(request, response);
        }

        static class Window {
            final long start;
            int count;

            Window(long start, int count) {
                this.start = start;
                this.count = count;
            }
        }
    }
}
