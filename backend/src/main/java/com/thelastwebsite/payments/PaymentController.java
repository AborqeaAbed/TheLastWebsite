package com.thelastwebsite.payments;

import com.thelastwebsite.spots.dto.ClaimRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/create-checkout/{spotNumber}")
    public ResponseEntity<Map<String, Object>> createCheckout(@PathVariable Integer spotNumber,
                                                              @Valid @RequestBody ClaimRequest request) {
        PaymentService.CheckoutResult result = paymentService.createCheckout(spotNumber, request);
        return ResponseEntity.ok(Map.of(
                "sessionId", result.sessionId(),
                "url", result.url(),
                "mocked", result.mocked(),
                "provider", result.provider()
        ));
    }

    @PostMapping("/stripe-webhook")
    public ResponseEntity<Void> handleStripeWebhook(@RequestBody String payload,
                                                    @RequestHeader(value = "Stripe-Signature", required = false) String sigHeader) {
        paymentService.handleWebhook(payload, sigHeader == null ? "" : sigHeader);
        return ResponseEntity.ok().build();
    }
}
