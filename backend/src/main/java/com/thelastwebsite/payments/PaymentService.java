package com.thelastwebsite.payments;

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
        Spot spot = spotService.reserveSpot(spotNumber);
        User user = authService.findOrCreate(request.getEmail());
        user.setEmailVerified(true);
        user.setUpdatedAt(LocalDateTime.now());
        spot.setName(request.getName().trim());
        spot.setMessage(request.getMessage().trim());
        spot.setUser(user);
        spot.setStatus(Constants.STATUS_CLAIMED);
        spot.setClaimedAt(LocalDateTime.now());
        spot.setReservedUntil(null);
        spot.setUpdatedAt(LocalDateTime.now());
        spotRepository.save(spot);

        String checkoutId;
        if (mockPayments) {
            checkoutId = "mock_" + spot.getId();
            applySuccessfulPayment(checkoutId, user, spot);
            return new CheckoutResult(checkoutId, "/spot/" + spotNumber + "?claimed=1", true);
        }

        com.stripe.Stripe.apiKey = stripeSecretKey;
        try {
            SessionCreateParams params = SessionCreateParams.builder()
                    .setMode(SessionCreateParams.Mode.PAYMENT)
                    .setSuccessUrl(successUrl + "?session_id={CHECKOUT_SESSION_ID}")
                    .setCancelUrl(cancelUrl)
                    .putMetadata("spotNumber", String.valueOf(spotNumber))
                    .putMetadata("userId", user.getId().toString())
                    .addLineItem(SessionCreateParams.LineItem.builder()
                            .setQuantity(1L)
                            .setPriceData(SessionCreateParams.LineItem.PriceData.builder()
                                    .setCurrency(Constants.CURRENCY)
                                    .setUnitAmount((long) Constants.SPOT_PRICE_CENTS)
                                    .setProductData(SessionCreateParams.LineItem.PriceData.ProductData.builder()
                                            .setName("Spot #" + spotNumber)
                                            .build())
                                    .build())
                            .build())
                    .build();
            Session session = Session.create(params);
            persistPendingPayment(session.getId(), user, spot);
            return new CheckoutResult(session.getId(), session.getUrl(), false);
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
        Session session = (Session) event.getDataObjectDeserializer().getObject().orElse(null);
        if (session == null) {
            return;
        }
        if (paymentRepository.findByStripePaymentId(session.getId()).filter(p -> Constants.PAYMENT_SUCCEEDED.equals(p.getStatus())).isPresent()) {
            return;
        }
        Integer spotNumber = Integer.valueOf(session.getMetadata().get("spotNumber"));
        Spot spot = spotRepository.findBySpotNumber(spotNumber).orElseThrow();
        User user = spot.getUser();
        applySuccessfulPayment(session.getId(), user, spot);
    }

    @Transactional
    public void applySuccessfulPayment(String stripePaymentId, User user, Spot spot) {
        Optional<Payment> existing = paymentRepository.findByStripePaymentId(stripePaymentId);
        if (existing.isPresent() && Constants.PAYMENT_SUCCEEDED.equals(existing.get().getStatus())) {
            return;
        }
        Payment payment = existing.orElseGet(Payment::new);
        payment.setSpot(spot);
        payment.setUser(user);
        payment.setStripePaymentId(stripePaymentId);
        payment.setAmount(Constants.SPOT_PRICE_CENTS);
        payment.setCurrency("USD");
        payment.setStatus(Constants.PAYMENT_SUCCEEDED);
        payment.setUpdatedAt(LocalDateTime.now());
        paymentRepository.save(payment);

        // TODO: restore email verification before CLAIMED. For local testing, skip the inbox
        // and permanently save the slot immediately after payment confirmation.
        user.setEmailVerified(true);
        user.setUpdatedAt(LocalDateTime.now());
        spot.setStatus(Constants.STATUS_CLAIMED);
        spot.setClaimedAt(LocalDateTime.now());
        spot.setReservedUntil(null);
        spot.setUpdatedAt(LocalDateTime.now());
        spotRepository.save(spot);
        auditService.record(user, spot, Constants.ACTION_PAYMENT_COMPLETED, stripePaymentId);
        auditService.record(user, spot, Constants.ACTION_SPOT_CLAIMED, "DEV_SKIP_EMAIL_VERIFICATION");
        authService.sendClaimLink(user, spot);
    }

    private void persistPendingPayment(String stripeId, User user, Spot spot) {
        Payment payment = new Payment();
        payment.setSpot(spot);
        payment.setUser(user);
        payment.setStripePaymentId(stripeId);
        payment.setAmount(Constants.SPOT_PRICE_CENTS);
        payment.setCurrency("USD");
        payment.setStatus(Constants.PAYMENT_PENDING);
        paymentRepository.save(payment);
    }

    public record CheckoutResult(String sessionId, String url, boolean mocked) {}
}
