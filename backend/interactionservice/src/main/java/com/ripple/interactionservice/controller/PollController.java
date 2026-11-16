
package com.ripple.interactionservice.controller;

import com.ripple.interactionservice.dto.CreatePollRequest;
import com.ripple.interactionservice.dto.PollResponse;
import com.ripple.interactionservice.entity.Poll;
import com.ripple.interactionservice.repository.PollRepository;
import com.ripple.interactionservice.security.PollAuthorizationService;
import com.ripple.interactionservice.service.PollService;
import com.ripple.interactionservice.service.RealtimePublisher;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/polls")
public class PollController {

    private final PollService pollService;
    private final RealtimePublisher realtimePublisher;
    private final PollRepository pollRepository;
    private final PollAuthorizationService pollAuthorizationService;

    public PollController(
            PollService pollService,
            RealtimePublisher realtimePublisher,
            PollRepository pollRepository,
            PollAuthorizationService pollAuthorizationService
    ) {
        this.pollService = pollService;
        this.realtimePublisher = realtimePublisher;
        this.pollRepository = pollRepository;
        this.pollAuthorizationService = pollAuthorizationService;
    }

    // 1. Create poll - authenticated event owner only
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PollResponse createPoll(
            @RequestBody CreatePollRequest requestBody,
            HttpServletRequest request
    ) {
        pollAuthorizationService.requireEventOwner(
                requestBody.eventId(),
                request
        );

        return PollResponse.from(
                pollService.createPoll(
                        requestBody.eventId(),
                        requestBody.question(),
                        requestBody.options()
                )
        );
    }

    // 2. Get all polls for an event
    @GetMapping("/event/{eventId}")
    public List<PollResponse> getPollsForEvent(
            @PathVariable Long eventId
    ) {
        return pollService.getPollsForEvent(eventId);
    }

    // 3. Get live polls for audience
    @GetMapping("/event/{eventId}/live")
    public List<PollResponse> getLivePolls(
            @PathVariable Long eventId
    ) {
        return pollService.getLivePollsForEvent(eventId);
    }

    // 4. Start poll - authenticated event owner only
    @PostMapping("/{id}/start")
    public PollResponse startPoll(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        Long eventId = getEventIdForPoll(id);

        pollAuthorizationService.requireEventOwner(
                eventId,
                request
        );

        PollResponse response = PollResponse.from(
                pollService.startPoll(id)
        );

        realtimePublisher.pollStarted(id);

        return response;
    }

    // 5. Close poll - authenticated event owner only
    @PostMapping("/{id}/close")
    public PollResponse closePoll(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        Long eventId = getEventIdForPoll(id);

        pollAuthorizationService.requireEventOwner(
                eventId,
                request
        );

        PollResponse response = PollResponse.from(
                pollService.closePoll(id)
        );

        realtimePublisher.pollClosed(id);

        return response;
    }

    // Look up event ownership from PostgreSQL,
    // not from a client-supplied organizer/event ID.
    private Long getEventIdForPoll(Long pollId) {
        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Poll not found"
                        )
                );

        return poll.getEventId();
    }
}
