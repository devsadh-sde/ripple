
package com.ripple.interactionservice.dto;

import java.util.List;

public record PollResultsResponse(
    Long pollId,
    String question,
    String status,
    long totalVotes,
    List<OptionResult> results
) {

    public record OptionResult(
        Long optionId,
        String optionText,
        long votes,
        double percentage
    ) {}
}
