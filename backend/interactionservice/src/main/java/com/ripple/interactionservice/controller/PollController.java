
package com.ripple.interactionservice.controller;

import com.ripple.interactionservice.dto.CreatePollRequest;
import com.ripple.interactionservice.dto.PollResponse;
import com.ripple.interactionservice.service.PollService;
import com.ripple.interactionservice.service.RealtimePublisher;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/polls")
public class PollController {

    private final PollService pollService;
    private final RealtimePublisher realtimePublisher;

    public PollController(
            PollService pollService,
            RealtimePublisher realtimePublisher
    ) {
        this.pollService = pollService;
        this.realtimePublisher = realtimePublisher;
    }

    // ------------------------------------
    // 1. Create a new poll
    // ------------------------------------

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PollResponse createPoll(
            @RequestBody CreatePollRequest request
    ) {
        return PollResponse.from(
                pollService.createPoll(
                        request.eventId(),
                        request.question(),
                        request.options()
                )
        );
    }

    // ------------------------------------
    // 2. Retrieve all polls for an event
    // DRAFT + LIVE + CLOSED
    // ------------------------------------

    @GetMapping("/event/{eventId}")
    public List<PollResponse> getPollsForEvent(
            @PathVariable Long eventId
    ) {
        return pollService.getPollsForEvent(eventId);
    }

    // ------------------------------------
    // 3. Retrieve LIVE polls for Audience
    // ------------------------------------

    @GetMapping("/event/{eventId}/live")
    public List<PollResponse> getLivePolls(
            @PathVariable Long eventId
    ) {
        return pollService.getLivePollsForEvent(eventId);
    }

    // ------------------------------------
    // 4. Start a poll + WebSocket broadcast
    // ------------------------------------

    @PostMapping("/{id}/start")
    public PollResponse startPoll(
            @PathVariable Long id
    ) {
        PollResponse response = PollResponse.from(
                pollService.startPoll(id)
        );

        realtimePublisher.pollStarted(id);

        return response;
    }

    // ------------------------------------
    // 5. Close a poll + WebSocket broadcast
    // ------------------------------------

    @PostMapping("/{id}/close")
    public PollResponse closePoll(
            @PathVariable Long id
    ) {
        PollResponse response = PollResponse.from(
                pollService.closePoll(id)
        );

        realtimePublisher.pollClosed(id);

        return response;
    }
}
