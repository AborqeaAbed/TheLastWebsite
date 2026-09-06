package com.thelastwebsite.spots.dto;

import java.util.List;
import java.util.Map;

public class ViewportResponse {
    private String mode;
    private Long claimed;
    private Long available;
    private List<SpotDto> spots;
    private List<Map<String, Object>> regions;

    public String getMode() {
        return mode;
    }

    public void setMode(String mode) {
        this.mode = mode;
    }

    public Long getClaimed() {
        return claimed;
    }

    public void setClaimed(Long claimed) {
        this.claimed = claimed;
    }

    public Long getAvailable() {
        return available;
    }

    public void setAvailable(Long available) {
        this.available = available;
    }

    public List<SpotDto> getSpots() {
        return spots;
    }

    public void setSpots(List<SpotDto> spots) {
        this.spots = spots;
    }

    public List<Map<String, Object>> getRegions() {
        return regions;
    }

    public void setRegions(List<Map<String, Object>> regions) {
        this.regions = regions;
    }
}
