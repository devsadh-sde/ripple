
package com.ripple.eventservice.service;

import com.ripple.eventservice.entity.Event;
import com.ripple.eventservice.repository.EventRepository;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class OrganizerAccess {

    private static final String SESSION_ORGANIZER_ID =
            "ripple.organizerId";

    private final EventRepository eventRepository;

    public OrganizerAccess(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    // Get the organizer from the authenticated server session.
    public UUID requireOrganizer(HttpServletRequest request) {
        HttpSession session = request.getSession(false);

        if (session == null) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please sign in first"
            );
        }

        Object value = session.getAttribute(
                SESSION_ORGANIZER_ID
        );

        if (!(value instanceof UUID organizerId)) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Please sign in first"
            );
        }

        return organizerId;
    }

    // Verify the signed-in organizer matches a requested ID.
    public void requireSameOrganizer(
            HttpServletRequest request,
            UUID requestedOrganizerId
    ) {
        UUID signedInId = requireOrganizer(request);

        if (!signedInId.equals(requestedOrganizerId)) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You cannot access another organizer's data"
            );
        }
    }

    // Verify ownership of an existing event.
    public void requireEventOwner(
            HttpServletRequest request,
            Long eventId
    ) {
        UUID signedInId = requireOrganizer(request);

        Event event = eventRepository.findById(eventId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Event not found"
                        )
                );

        if (!signedInId.equals(event.getOrganizerId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You do not own this event"
            );
        }
    }
}
