

package com.ripple.interactionservice.dto;

import com.ripple.interactionservice.entity.Poll;
import java.time.OffsetDateTime;
import java.util.List;

public record PollResponse(
    Long id,
    Long eventId,
    String question,
    String status,
    OffsetDateTime createdAt,
    List<OptionResponse> options
) {

    public record OptionResponse(
        Long id,
        String text
    ) {}

    public static PollResponse from(Poll poll) {

        List<OptionResponse> options = poll.getOptions()
            .stream()
            .map(option -> new OptionResponse(
                option.getId(),
                option.getOptionText()
            ))
            .toList();

        return new PollResponse(
            poll.getId(),
            poll.getEventId(),
            poll.getQuestion(),
            poll.getStatus(),
            poll.getCreatedAt(),
            options
        );
    }
}
