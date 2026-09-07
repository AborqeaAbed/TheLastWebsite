package com.thelastwebsite.spots.dto;

public class StatsDto {
    private long claimed;
    private long available;
    private long pendingVerification;
    private long reserved;
    private long total = 1_000_000;

    public long getClaimed() {
        return claimed;
    }

    public void setClaimed(long claimed) {
        this.claimed = claimed;
    }

    public long getAvailable() {
        return available;
    }

    public void setAvailable(long available) {
        this.available = available;
    }

    public long getPendingVerification() {
        return pendingVerification;
    }

    public void setPendingVerification(long pendingVerification) {
        this.pendingVerification = pendingVerification;
    }

    public long getReserved() {
        return reserved;
    }

    public void setReserved(long reserved) {
        this.reserved = reserved;
    }

    public long getTotal() {
        return total;
    }

    public void setTotal(long total) {
        this.total = total;
    }

    private long launchSpotsRemaining;
    private int currentPriceCents;
    private int nextPriceCents;
    private long launchRevenueCents;
    private long launchRevenueGoalCents;

    public long getLaunchSpotsRemaining() {
        return launchSpotsRemaining;
    }

    public void setLaunchSpotsRemaining(long launchSpotsRemaining) {
        this.launchSpotsRemaining = launchSpotsRemaining;
    }

    public int getCurrentPriceCents() {
        return currentPriceCents;
    }

    public void setCurrentPriceCents(int currentPriceCents) {
        this.currentPriceCents = currentPriceCents;
    }

    public int getNextPriceCents() {
        return nextPriceCents;
    }

    public void setNextPriceCents(int nextPriceCents) {
        this.nextPriceCents = nextPriceCents;
    }

    public long getLaunchRevenueCents() {
        return launchRevenueCents;
    }

    public void setLaunchRevenueCents(long launchRevenueCents) {
        this.launchRevenueCents = launchRevenueCents;
    }

    public long getLaunchRevenueGoalCents() {
        return launchRevenueGoalCents;
    }

    public void setLaunchRevenueGoalCents(long launchRevenueGoalCents) {
        this.launchRevenueGoalCents = launchRevenueGoalCents;
    }
}
