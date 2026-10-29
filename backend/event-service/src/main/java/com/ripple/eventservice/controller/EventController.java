
package com.ripple.eventservice.controller;

import com.ripple.eventservice.dto.CreateEventRequest;
import com.ripple.eventservice.dto.EventResponse;
import com.ripple.eventservice.entity.Event;
import com.ripple.eventservice.service.EventService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    @PostMapping
    public ResponseEntity<EventResponse> createEvent(
            @Valid @RequestBody CreateEventRequest request) {

        Event event = eventService.createEvent(
                request.title(),
                request.description(),
                request.organizerId()
        );

        EventResponse response = new EventResponse(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getJoinCode(),
                event.getStatus(),
                event.getOrganizerId(),
                event.getCreatedAt()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }
}
