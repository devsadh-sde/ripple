
package com.ripple.interactionservice.controller;

import com.ripple.interactionservice.dto.CreatePollRequest;
import com.ripple.interactionservice.dto.PollResponse;
import com.ripple.interactionservice.entity.Poll;
import com.ripple.interactionservice.service.PollService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/polls")
public class PollController {

    private final PollService pollService;

    // Constructor Dependency Injection
    public PollController(PollService pollService) {
        this.pollService = pollService;
    }

    // 1. Create a new poll
    @PostMapping
    public ResponseEntity<PollResponse> createPoll(
            @Valid @RequestBody CreatePollRequest request) {

        Poll poll = pollService.createPoll(
            request.eventId(),
            request.question(),
            request.options()
        );

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(PollResponse.from(poll));
    }

    // 2. Start a poll (DRAFT -> LIVE)
    @PostMapping("/{id}/start")
    public PollResponse startPoll(@PathVariable Long id) {

        Poll poll = pollService.startPoll(id);

        return PollResponse.from(poll);
    }

    // 3. Close a poll (LIVE -> CLOSED)
    @PostMapping("/{id}/close")
    public PollResponse closePoll(@PathVariable Long id) {

        Poll poll = pollService.closePoll(id);

        return PollResponse.from(poll);
    }
}
