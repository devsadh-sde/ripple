
package com.ripple.eventservice.service;

import com.ripple.eventservice.entity.Event;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.UUID;

@Service
public class EventService {

    private static final String CHARACTERS =
            "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private static final SecureRandom RANDOM =
            new SecureRandom();

    private static final int MAX_ATTEMPTS = 5;

    private final EventWriter eventWriter;

    public EventService(EventWriter eventWriter) {
        this.eventWriter = eventWriter;
    }

    // 1. Create a new event
    public Event createEvent(
            String title,
            String description,
            UUID organizerId
    ) {

        if (title == null || title.isBlank()) {
            throw new IllegalArgumentException(
                    "Event title cannot be empty"
            );
        }

        if (title.length() > 200) {
            throw new IllegalArgumentException(
                    "Event title cannot exceed 200 characters"
            );
        }

        if (organizerId == null) {
            throw new IllegalArgumentException(
                    "Organizer ID is required"
            );
        }

        for (int attempt = 1;
             attempt <= MAX_ATTEMPTS;
             attempt++) {

            String joinCode = generateJoinCode();

            Event event = new Event(
                    title,
                    description,
                    joinCode,
                    organizerId
            );

            try {
                return eventWriter.save(event);

            } catch (DataIntegrityViolationException exception) {

                if (!isJoinCodeCollision(exception)) {
                    throw exception;
                }

                if (attempt == MAX_ATTEMPTS) {
                    throw new IllegalStateException(
                            "Could not generate a unique event code",
                            exception
                    );
                }
            }
        }

        throw new IllegalStateException(
                "Unable to create event"
        );
    }

    // 2. Check for duplicate join-code constraint
    private boolean isJoinCodeCollision(
            DataIntegrityViolationException exception
    ) {

        Throwable current = exception;

        while (current != null) {

            if (current instanceof
                    org.postgresql.util.PSQLException sqlException) {

                var serverError =
                        sqlException.getServerErrorMessage();

                return "23505".equals(
                        sqlException.getSQLState()
                )
                && serverError != null
                && "events_join_code_key".equals(
                        serverError.getConstraint()
                );
            }

            current = current.getCause();
        }

        return false;
    }

    // 3. Generate a random six-character join code
    private String generateJoinCode() {

        StringBuilder code = new StringBuilder();

        for (int i = 0; i < 6; i++) {

            int index = RANDOM.nextInt(
                    CHARACTERS.length()
            );

            code.append(
                    CHARACTERS.charAt(index)
            );
        }

        return code.toString();
    }

    // 4. Retrieve an event by ID
    public Event getEventById(Long id) {

        if (id == null || id <= 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Event ID must be positive"
            );
        }

        return eventWriter.findById(id)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Event not found with ID: " + id
                        )
                );
    }

    // 5. Retrieve an event using its join code
    public Event getEventByJoinCode(String joinCode) {

        if (joinCode == null ||
                !joinCode.matches("(?i)[A-Z0-9]{6}")) {

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid event code"
            );
        }

        String normalizedCode =
                joinCode.toUpperCase(Locale.ROOT);

        return eventWriter.findByJoinCode(normalizedCode)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Event not found for code: "
                                        + normalizedCode
                        )
                );
    }
}
