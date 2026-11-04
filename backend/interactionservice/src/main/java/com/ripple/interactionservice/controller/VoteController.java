
package com.ripple.interactionservice.controller;

import com.ripple.interactionservice.dto.CastVoteRequest;
import com.ripple.interactionservice.dto.VoteResponse;
import com.ripple.interactionservice.entity.Vote;
import com.ripple.interactionservice.service.VoteService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/polls")
public class VoteController {

    private final VoteService voteService;

    public VoteController(VoteService voteService) {
        this.voteService = voteService;
    }

    // Submit a vote for a poll
    @PostMapping("/{pollId}/votes")
    public ResponseEntity<VoteResponse> castVote(
            @PathVariable Long pollId,
            @Valid @RequestBody CastVoteRequest request
    ) {

        Vote vote = voteService.castVote(
            pollId,
            request.optionId(),
            request.participantId()
        );

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(VoteResponse.from(vote));
    }
}
