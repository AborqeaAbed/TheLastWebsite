package com.thelastwebsite.payments;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.stripe.exception.SignatureVerificationException;
import com.stripe.exception.StripeException;
import com.stripe.model.Event;
import com.stripe.model.checkout.Session;
import com.stripe.net.Webhook;
import com.stripe.param.checkout.SessionCreateParams;
import com.thelastwebsite.auth.AuthService;
import com.thelastwebsite.common.ApiException;
import com.thelastwebsite.common.AuditService;
import com.thelastwebsite.common.Constants;
import com.thelastwebsite.spots.Spot;
import com.thelastwebsite.spots.SpotRepository;
import com.thelastwebsite.spots.SpotService;
import com.thelastwebsite.spots.dto.ClaimRequest;
import com.thelastwebsite.users.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class PaymentService {
    private final PaymentRepository paymentRepository;
    private final SpotRepository spotRepository;
    private final SpotService spotService;
    private final AuthService authService;
    private final AuditService auditService;
    private final String stripeSecretKey;
    private final String webhookSecret;
    private final String successUrl;
    private final String cancelUrl;
    private final boolean mockPayments;

    public PaymentService(PaymentRepository paymentRepository,
                          SpotRepository spotRepository,
                          SpotService spotService,
                          AuthService authService,
                          AuditService auditService,
                          @Value("${stripe.secret-key:}") String stripeSecretKey,
                          @Value("${stripe.webhook-secret:}") String webhookSecret,
                          @Value("${payment.success-url:http://localhost:3000/verify}") String successUrl,
                          @Value("${payment.cancel-url:http://localhost:3000/?canceled=1}") String cancelUrl) {
        this.paymentRepository = paymentRepository;
        this.spotRepository = spotRepository;
        this.spotService = spotService;
        this.authService = authService;
        this.auditService = auditService;
        this.stripeSecretKey = stripeSecretKey;
        this.webhookSecret = webhookSecret;
        this.successUrl = successUrl;
        this.cancelUrl = cancelUrl;
        this.mockPayments = stripeSecretKey == null || stripeSecretKey.isBlank() || stripeSecretKey.contains("your_stripe");
    }

    @Transactional
    public CheckoutResult createCheckout(Integer spotNumber, ClaimRequest request) {
        String provider = normalizeProvider(request.getProvider());
        Spot spot = spotRepository.findBySpotNumberForUpdate(spotNumber)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Spot not found"));
        if (!spotService.isActiveReservation(spot)) {
            throw new ApiException(HttpStatus.CONFLICT, "This spot is no longer reserved. Claim it again.");
        }

        User user = authService.findOrCreate(request.getEmail());
        spot.setName(request.getName().trim());
        spot.setMessage(request.getMessage().trim());
        spot.setUser(user);
        spot.setUpdatedAt(LocalDateTime.now());
        spotRepository.save(spot);
        int priceCents = currentPriceCents();

        String checkoutId = provider + "_" + spot.getId();
        if (mockPayments) {
            applySuccessfulPayment(checkoutId, user, spot, priceCents);
            return new CheckoutResult(checkoutId, "/spot/" + spotNumber + "?claimed=1", true, provider);
        }

        if (Constants.PAYMENT_PROVIDER_PAYPAL.equals(provider)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PayPal checkout is not configured yet.");
        }

        com.stripe.Stripe.apiKey = stripeSecretKey;
        try {
            String encodedEmail = URLEncoder.encode(user.getEmail(), StandardCharsets.UTF_8);
            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(successUrl + "?email=" + encodedEmail + "&spot=" + spotNumber + "&session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(cancelUrl)
                    .putMetadata("spotNumber", String.valueOf(spotNumber))
                    .putMetadata("userId", user.getId().toString())
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency(Constants.CURRENCY)
                                    .setUnitAmount((long) priceCents)
                                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName("Spot #" + spotNumber)
                                            .build())
                                    .build())
                            .build())
                    .build();
            Session session = Session.create(params);
            spot.setReservedUntil(LocalDateTime.now().plusSeconds(Constants.CHECKOUT_HOLD_TIMEOUT_SECONDS));
            spotRepository.save(spot);
            persistPendingPayment(session.getId(), user, spot);
            return new CheckoutResult(session.getId(), session.getUrl(), false, provider);
        } catch (StripeException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Your payment couldn't be completed.");
        }
    }

    @Transactional
    public void handleWebhook(String payload, String signature) {
        if (mockPayments) {
            return;
        }
        Event event;
        try {
            event = Webhook.constructEvent(payload, signature, webhookSecret);
        } catch (SignatureVerificationException ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Invalid webhook signature.");
        }
        if (!"checkout.session.completed".equals(event.getType())) {
            return;
        }
        Session session = resolveSession(event);
        if (session == null) {
            return;
        }
        if (paymentRepository.findByStripePaymentId(session.getId()).filter(p -> Constants.PAYMENT_SUCCEEDED.equals(p.getStatus())).isPresent()) {
            return;
        }
        Integer spotNumber = Integer.valueOf(session.getMetadata().get("spotNumber"));
        Spot spot = spotRepository.findBySpotNumberForUpdate(spotNumber).orElseThrow();
        if (!spotService.isActiveReservation(spot) && !Constants.STATUS_CLAIMED.equals(spot.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "This spot is no longer reserved.");
        }
        User user = spot.getUser();
        applySuccessfulPayment(session.getId(), user, spot, currentPriceCents());
    }

    /**
     * The embedded object in a webhook event is serialized using the Stripe account's current
     * API version, which can be newer than the version this SDK is pinned to — in that case
     * {@code getObject()} silently returns empty instead of throwing. Fall back to fetching the
     * session fresh by id, which Stripe returns shaped for the SDK's own pinned API version.
     */
    private Session resolveSession(Event event) {
        Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
        if (session != null) {
            return session;
        }
        String rawJson = event.getDataObjectDeserializer().getRawJson();
        if (rawJson == null) {
            return null;
        }
        JsonObject raw = JsonParser.parseString(rawJson).getAsJsonObject();
        if (!raw.has("id")) {
            return null;
        }
        String sessionId = raw.get("id").getAsString();
        try {
            com.stripe.Stripe.apiKey = stripeSecretKey;
            return Session.retrieve(sessionId);
        } catch (StripeException ex) {
            return null;
        }
    }

    @Transactional
    public void applySuccessfulPayment(String stripePaymentId, User user, Spot spot) {
        applySuccessfulPayment(stripePaymentId, user, spot, currentPriceCents());
    }

    @Transactional
    public void applySuccessfulPayment(String stripePaymentId, User user, Spot spot, int amountCents) {
        Optional<Payment> existing = paymentRepository.findByStripePaymentId(stripePaymentId);
        if (existing.isPresent() && Constants.PAYMENT_SUCCEEDED.equals(existing.get().getStatus())) {
            return;
        }
        Payment payment = existing.orElseGet(Payment::new);
        payment.setSpot(spot);
        payment.setUser(user);
        payment.setStripePaymentId(stripePaymentId);
        payment.setAmount(amountCents);
        payment.setCurrency("USD");
        payment.setStatus(Constants.PAYMENT_SUCCEEDED);
        payment.setUpdatedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        spot.setStatus(Constants.STATUS_PENDING_VERIFICATION);
        spot.setReservedUntil(null);
        spot.setUpdatedAt(LocalDateTime.now());
        spotRepository.save(spot);
        auditService.record(user, spot, Constants.ACTION_PAYMENT_COMPLETED, stripePaymentId);
        authService.sendClaimCode(user, spot);
    }

    private void persistPendingPayment(String stripeId, User user, Spot spot) {
        Payment payment = new Payment();
        payment.setSpot(spot);
        payment.setUser(user);
        payment.setStripePaymentId(stripeId);
        payment.setAmount(currentPriceCents());
        payment.setCurrency("USD");
        payment.setStatus(Constants.PAYMENT_PENDING);
        paymentRepository.save(payment);
    }

    private int currentPriceCents() {
        long claimed = spotRepository.countClaimedSpots();
        return claimed < Constants.LAUNCH_SUBSCRIBER_LIMIT
                ? Constants.LAUNCH_PRICE_CENTS
                : Constants.STANDARD_PRICE_CENTS;
    }

    private String normalizeProvider(String provider) {
        if (provider == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Choose Stripe or PayPal.");
        }
        String normalized = provider.trim().toUpperCase();
        if (Constants.PAYMENT_PROVIDER_STRIPE.equals(normalized) || Constants.PAYMENT_PROVIDER_PAYPAL.equals(normalized)) {
            return normalized;
        }
        throw new ApiException(HttpStatus.BAD_REQUEST, "Choose Stripe or PayPal.");
    }

    public record CheckoutResult(String sessionId, String url, boolean mocked, String provider) {}
}
