package com.thelastwebsite.common;

import com.thelastwebsite.spots.Spot;
import com.thelastwebsite.users.User;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    public void record(User user, Spot spot, String action, String metadata) {
        AuditLog log = new AuditLog();
        log.setUser(user);
        log.setSpot(spot);
        log.setAction(action);
        log.setMetadata(metadata);
        auditLogRepository.save(log);
    }
}
