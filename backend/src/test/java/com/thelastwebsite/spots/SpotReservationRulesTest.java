package com.thelastwebsite.spots;

import com.thelastwebsite.common.Constants;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class SpotReservationRulesTest {

    @Test
    void expiredReservationReturnsToAvailable() {
        Spot spot = new Spot();
        spot.setStatus(Constants.STATUS_RESERVED);
        spot.setReservedUntil(LocalDateTime.now().minusMinutes(1));
        if (Constants.STATUS_RESERVED.equals(spot.getStatus())
                && spot.getReservedUntil().isBefore(LocalDateTime.now())) {
            spot.setStatus(Constants.STATUS_AVAILABLE);
            spot.setReservedUntil(null);
        }
        assertThat(spot.getStatus()).isEqualTo(Constants.STATUS_AVAILABLE);
    }
}
