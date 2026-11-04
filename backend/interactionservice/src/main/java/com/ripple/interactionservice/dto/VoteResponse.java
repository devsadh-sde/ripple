
package com.ripple.interactionservice.dto;

import com.ripple.interactionservice.entity.Vote;

import java.time.OffsetDateTime;
import java.util.UUID;

public record VoteResponse(
    Long id,
    Long pollId,
    Long optionId,
    UUID participantId,
    OffsetDateTime createdAt,
    String message
) {

    public static VoteResponse from(Vote vote) {
        return new VoteResponse(
            vote.getId(),
            vote.getPollId(),
            vote.getOptionId(),
            vote.getParticipantId(),
            vote.getCreatedAt(),
            "Vote submitted successfully"
        );
    }
}
