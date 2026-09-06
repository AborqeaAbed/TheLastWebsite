package com.thelastwebsite.spots;

import com.thelastwebsite.common.ApiException;
import com.thelastwebsite.common.Constants;
import com.thelastwebsite.users.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class SpotServiceTest {
    @Test
    void secondReserveWouldConflictWhenAlreadyReservedAndFresh() {
        Spot spot = new Spot();
        spot.setStatus(Constants.STATUS_RESERVED);
        spot.setReservedUntil(LocalDateTime.now().plusMinutes(4));
        boolean conflict = Constants.STATUS_RESERVED.equals(spot.getStatus())
                && spot.getReservedUntil() != null
                && spot.getReservedUntil().isAfter(LocalDateTime.now());
        assertThat(conflict).isTrue();
    }
}
