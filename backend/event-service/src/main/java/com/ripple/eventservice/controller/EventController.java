
package com.ripple.eventservice.controller;

import java.util.List;
import java.util.UUID;

import com.ripple.eventservice.dto.CreateEventRequest;
import com.ripple.eventservice.dto.EventResponse;
import com.ripple.eventservice.entity.Event;
import com.ripple.eventservice.service.EventService;
import com.ripple.eventservice.service.EventWriter;
import com.ripple.eventservice.service.OrganizerAccess;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService eventService;
    private final EventWriter eventWriter;
    private final OrganizerAccess organizerAccess;

    public EventController(
            EventService eventService,
            EventWriter eventWriter,
            OrganizerAccess organizerAccess
    ) {
        this.eventService = eventService;
        this.eventWriter = eventWriter;
        this.organizerAccess = organizerAccess;
    }

    // 1. Create an event - authenticated organizers only
    @PostMapping
    public ResponseEntity<EventResponse> createEvent(
            @Valid @RequestBody CreateEventRequest requestBody,
            HttpServletRequest request
    ) {
        organizerAccess.requireSameOrganizer(
                request,
                requestBody.organizerId()
        );

        Event event = eventService.createEvent(
                requestBody.title(),
                requestBody.description(),
                requestBody.organizerId()
        );

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(toResponse(event));
    }

    // 2. Get event by ID - public for audience joining
    @GetMapping("/{id}")
    public ResponseEntity<EventResponse> getEventById(
            @PathVariable Long id
    ) {
        Event event = eventService.getEventById(id);

        return ResponseEntity.ok(toResponse(event));
    }

    // 3. Get event by join code - public
    @GetMapping("/code/{joinCode}")
    public ResponseEntity<EventResponse> getEventByCode(
            @PathVariable String joinCode
    ) {
        Event event = eventService.getEventByJoinCode(joinCode);

        return ResponseEntity.ok(toResponse(event));
    }

    // 4. Start an event - owner only
    @PostMapping("/{id}/start")
    public ResponseEntity<EventResponse> startEvent(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        organizerAccess.requireEventOwner(request, id);

        Event event = eventWriter.startEvent(id);

        return ResponseEntity.ok(toResponse(event));
    }

    // 5. End an event - owner only
    @PostMapping("/{id}/end")
    public ResponseEntity<EventResponse> endEvent(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        organizerAccess.requireEventOwner(request, id);

        Event event = eventWriter.endEvent(id);

        return ResponseEntity.ok(toResponse(event));
    }

    // 6. Get organizer's events - owner only
    @GetMapping("/organizer/{organizerId}")
    public List<EventResponse> getOrganizerEvents(
            @PathVariable UUID organizerId,
            HttpServletRequest request
    ) {
        organizerAccess.requireSameOrganizer(
                request,
                organizerId
        );

        return eventService
                .getEventsByOrganizerId(organizerId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // Used by Interaction Service to verify the event owner.    
    @PostMapping("/{id}/organizer-access")
    public ResponseEntity<Void> verifyOrganizerAccess(
            @PathVariable Long id,
            HttpServletRequest request
    ) {
        organizerAccess.requireEventOwner(request, id);

        return ResponseEntity.noContent().build();
    }

    // Convert Event entity to DTO
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
