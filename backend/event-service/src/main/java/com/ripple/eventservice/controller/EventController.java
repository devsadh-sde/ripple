
package com.ripple.eventservice.controller;

import com.ripple.eventservice.dto.CreateEventRequest;
import com.ripple.eventservice.dto.EventResponse;
import com.ripple.eventservice.entity.Event;
import com.ripple.eventservice.service.EventService;
import com.ripple.eventservice.service.EventWriter;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;
    private final EventWriter eventWriter;

    public EventController(
            EventService eventService,
            EventWriter eventWriter
    ) {
        this.eventService = eventService;
        this.eventWriter = eventWriter;
    }

    // 1. Create an event
    @PostMapping
    public ResponseEntity<EventResponse> createEvent(
            @Valid @RequestBody CreateEventRequest request
    ) {
        Event event = eventService.createEvent(
            request.title(),
            request.description(),
            request.organizerId()
        );

        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(toResponse(event));
    }

    // 2. Get event by ID
    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEventById(
            @PathVariable Long id
    ) {
        Event event = eventService.getEventById(id);

        return ResponseEntity.ok(toResponse(event));
    }

    // 3. Get event by join code
    @GetMapping("/code/{joinCode}")
    public ResponseEntity<EventResponse> getEventByCode(
            @PathVariable String joinCode
    ) {
        Event event = eventService.getEventByJoinCode(joinCode);

        return ResponseEntity.ok(toResponse(event));
    }

    // 4. Start an event
    @PostMapping("/{id}/start")
    public ResponseEntity<EventResponse> startEvent(
            @PathVariable Long id
    ) {
        Event event = eventWriter.startEvent(id);

        return ResponseEntity.ok(toResponse(event));
    }

    // 5. End an event
    @PostMapping("/{id}/end")
    public ResponseEntity<EventResponse> endEvent(
            @PathVariable Long id
    ) {
        Event event = eventWriter.endEvent(id);

        return ResponseEntity.ok(toResponse(event));
    }

    // Convert Event entity to EventResponse DTO
    private EventResponse toResponse(Event event) {
        return new EventResponse(
            event.getId(),
            event.getTitle(),
            event.getDescription(),
            event.getJoinCode(),
            event.getStatus(),
            event.getOrganizerId(),
            event.getCreatedAt()
        );
    }
}
