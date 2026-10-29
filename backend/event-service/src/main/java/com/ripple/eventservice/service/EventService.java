
package com.ripple.eventservice.service;

import com.ripple.eventservice.entity.Event;
import com.ripple.eventservice.repository.EventRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.UUID;

@Service
public class EventService {

    private static final String CHARACTERS =
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private static final SecureRandom RANDOM = new SecureRandom();

    private final EventRepository eventRepository;

    // Constructor Dependency Injection
    public EventService(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    // Create a new event
    @Transactional
    public Event createEvent(
            String title,
            String description,
            UUID organizerId) {

        // Validate event title
        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException(
                    "Event title cannot be empty"
            );
        }

        // Validate title length
        if (title.length() > 200) {
            throw new IllegalArgumentException(
                    "Event title cannot exceed 200 characters"
            );
        }

        // Validate organizer ID
        if (organizerId == null) {
            throw new IllegalArgumentException(
                    "Organizer ID is required"
            );
        }

        // Generate a random 6-character join code
        String joinCode = generateJoinCode();

        // Create Event entity
        Event event = new Event(
                title,
                description,
                joinCode,
                organizerId
        );

        // Persist event in PostgreSQL
        return eventRepository.save(event);
    }

    // Generate a random join code
    private String generateJoinCode() {

        StringBuilder code = new StringBuilder();

        for (int i = 0; i < 6; i++) {

            int index = RANDOM.nextInt(CHARACTERS.length());

            code.append(CHARACTERS.charAt(index));
        }

        return code.toString();
    }
}
