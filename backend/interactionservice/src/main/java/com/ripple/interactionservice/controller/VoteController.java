
package com.ripple.interactionservice.controller;

import com.ripple.interactionservice.dto.CastVoteRequest;
import com.ripple.interactionservice.dto.VoteResponse;
import com.ripple.interactionservice.service.RealtimePublisher;
import com.ripple.interactionservice.service.VoteService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/polls")
public class VoteController {

    private final VoteService voteService;
    private final RealtimePublisher realtimePublisher;

    public VoteController(
            VoteService voteService,
            RealtimePublisher realtimePublisher
    ) {
        this.voteService = voteService;
        this.realtimePublisher = realtimePublisher;
    }

    @PostMapping("/{pollId}/votes")
    @ResponseStatus(HttpStatus.CREATED)
    public VoteResponse castVote(
            @PathVariable Long pollId,
            @RequestBody CastVoteRequest request
    ) {
        VoteResponse response = VoteResponse.from(
                voteService.castVote(
                        pollId,
                        request.optionId(),
                        request.participantId()
                )
        );

        // The transactional service has returned successfully.
        // The vote is committed before we notify subscribers.
        realtimePublisher.voteCast(pollId);

        return response;
    }
}
