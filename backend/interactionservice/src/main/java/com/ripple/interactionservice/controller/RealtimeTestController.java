
package com.ripple.interactionservice.controller;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/realtime")
public class RealtimeTestController {

    private final SimpMessagingTemplate messagingTemplate;

    public RealtimeTestController(
            SimpMessagingTemplate messagingTemplate
    ) {
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping("/test/{eventId}")
    public Map<String, Object> sendTest(
            @PathVariable Long eventId
    ) {
        Map<String, Object> payload = Map.of(
                "type", "TEST_MESSAGE",
                "eventId", eventId,
                "message", "Ripple realtime connection works!"
        );

        messagingTemplate.convertAndSend(
                "/topic/events/" + eventId,
                (Object) payload
        );

        return Map.of(
                "status", "sent",
                "eventId", eventId
        );
    }
}
