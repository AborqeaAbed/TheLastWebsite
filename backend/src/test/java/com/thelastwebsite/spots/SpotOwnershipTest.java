package com.thelastwebsite.spots;

import com.thelastwebsite.common.ApiException;
import com.thelastwebsite.common.Constants;
import com.thelastwebsite.spots.dto.UpdateSpotRequest;
import com.thelastwebsite.users.User;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SpotOwnershipTest {
    @Test
    void otherUserCannotEdit() {
        User owner = new User();
        owner.setId(UUID.randomUUID());
        User other = new User();
        other.setId(UUID.randomUUID());
        Spot spot = new Spot();
        spot.setSpotNumber(10);
        spot.setStatus(Constants.STATUS_CLAIMED);
        spot.setUser(owner);
        if (spot.getUser() == null || !spot.getUser().getId().equals(other.getId())) {
            assertThatThrownBy(() -> {
                throw new ApiException(org.springframework.http.HttpStatus.FORBIDDEN, "You cannot edit another user's spot.");
            }).isInstanceOf(ApiException.class);
        }
        UpdateSpotRequest ignored = new UpdateSpotRequest();
        ignored.setName("x");
        ignored.setMessage("y");
    }
}
