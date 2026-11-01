
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

    public EventController(EventService eventService,
                           EventWriter eventWriter) {
        this.eventService = eventService;
        this.eventWriter = eventWriter;
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

    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEventById(
            @PathVariable Long id) {

        Event event = eventService.getEventById(id);

        EventResponse response = new EventResponse(
                event.getId(),
                event.getTitle(),
                event.getDescription(),
                event.getJoinCode(),
                event.getStatus(),
                event.getOrganizerId(),
                event.getCreatedAt()
        );

        return ResponseEntity.ok(response);
    }


    @PostMapping("/{id}/start")
    public ResponseEntity<EventResponse> startEvent(
            @PathVariable Long id) {

        Event event = eventWriter.startEvent(id);

        return ResponseEntity.ok(toResponse(event));
    }

    @PostMapping("/{id}/end")
    public ResponseEntity<EventResponse> endEvent(
            @PathVariable Long id) {

        Event event = eventWriter.endEvent(id);

        return ResponseEntity.ok(toResponse(event));
    }

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
