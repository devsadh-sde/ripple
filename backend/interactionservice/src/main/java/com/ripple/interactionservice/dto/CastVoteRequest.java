
package com.ripple.interactionservice.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.UUID;

public record CastVoteRequest(

    @NotNull
    @Positive
    Long optionId,

    @NotNull
    UUID participantId

) {}
