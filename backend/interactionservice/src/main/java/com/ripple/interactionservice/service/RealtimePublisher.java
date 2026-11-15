
package com.ripple.interactionservice.service;

import com.ripple.interactionservice.repository.PollRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class RealtimePublisher {

    private final SimpMessagingTemplate messagingTemplate;
    private final PollRepository pollRepository;

    public RealtimePublisher(
            SimpMessagingTemplate messagingTemplate,
            PollRepository pollRepository
    ) {
        this.messagingTemplate = messagingTemplate;
        this.pollRepository = pollRepository;
    }

    private void publish(Long pollId, String type) {
        Long eventId = pollRepository.findById(pollId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Poll not found"))
                .getEventId();

        Map<String, Object> message = Map.of(
                "type", type,
                "eventId", eventId,
                "pollId", pollId
        );

        messagingTemplate.convertAndSend(
                "/topic/events/" + eventId,
                (Object) message
        );
    }

    public void voteCast(Long pollId) {
        publish(pollId, "VOTE_CAST");
    }

    public void pollStarted(Long pollId) {
        publish(pollId, "POLL_STARTED");
    }

    public void pollClosed(Long pollId) {
        publish(pollId, "POLL_CLOSED");
    }
}
