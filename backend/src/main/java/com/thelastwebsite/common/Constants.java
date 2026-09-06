package com.thelastwebsite.common;

public class Constants {
    public static final int TOTAL_SPOTS = 1_000_000;
    public static final int GRID_SIZE = 1000;
    public static final int RESERVATION_TIMEOUT_SECONDS = 300;
    public static final int MAGIC_LINK_EXPIRY_MINUTES = 60;
      public static final int MAX_MESSAGE_LENGTH = 100;
    public static final int MAX_NAME_LENGTH = 80;
    public static final String CURRENCY = "usd";
    public static final int SPOT_PRICE_CENTS = 100;

    public static final String STATUS_AVAILABLE = "AVAILABLE";
    public static final String STATUS_RESERVED = "RESERVED";
    public static final String STATUS_PENDING_VERIFICATION = "PENDING_VERIFICATION";
    public static final String STATUS_CLAIMED = "CLAIMED";
    public static final String STATUS_LOCKED = "LOCKED";

    public static final String MODERATION_PENDING = "PENDING";
    public static final String MODERATION_APPROVED = "APPROVED";
    public static final String MODERATION_REJECTED = "REJECTED";

    public static final String ACTION_SPOT_RESERVED = "SPOT_RESERVED";
    public static final String ACTION_SPOT_CLAIMED = "SPOT_CLAIMED";
    public static final String ACTION_SPOT_EDITED = "SPOT_EDITED";
    public static final String ACTION_PAYMENT_COMPLETED = "PAYMENT_COMPLETED";
    public static final String ACTION_EMAIL_VERIFIED = "EMAIL_VERIFIED";
    public static final String ACTION_SPOT_LOCKED = "SPOT_LOCKED";
    public static final String ACTION_MESSAGE_MODERATED = "MESSAGE_MODERATED";

    public static final String PAYMENT_PENDING = "PENDING";
    public static final String PAYMENT_SUCCEEDED = "SUCCEEDED";
    public static final String PAYMENT_FAILED = "FAILED";
    public static final String PAYMENT_REFUNDED = "REFUNDED";
}
