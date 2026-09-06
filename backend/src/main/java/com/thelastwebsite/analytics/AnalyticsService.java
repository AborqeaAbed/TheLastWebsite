package com.thelastwebsite.analytics;

import org.springframework.stereotype.Service;

@Service
public class AnalyticsService {
    private final AnalyticsEventRepository repository;

    public AnalyticsService(AnalyticsEventRepository repository) {
        this.repository = repository;
    }

    public void track(String eventName, String metadata) {
        AnalyticsEvent event = new AnalyticsEvent();
        event.setEventName(eventName);
        event.setMetadata(metadata);
        repository.save(event);
    }
}
