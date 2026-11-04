
package com.ripple.eventservice.service;

import java.util.Optional;

import com.ripple.eventservice.entity.Event;
import com.ripple.eventservice.repository.EventRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventWriter {

    private final EventRepository eventRepository;

    public EventWriter(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    // 1. Save a new event
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Event save(Event event) {
        return eventRepository.saveAndFlush(event);
    }

    // 2. Find an event by its ID
    @Transactional(readOnly = true)
    public Optional<Event> findById(Long id) {
        return eventRepository.findById(id);
    }

    // 3. Find an event using its join code
    @Transactional(readOnly = true)
    public Optional<Event> findByJoinCode(String joinCode) {
        return eventRepository.findByJoinCode(joinCode);
    }

    // 4. Start an event: DRAFT -> LIVE
    @Transactional
    public Event startEvent(Long id) {

        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Event not found: " + id
                ));

        event.start();

        return eventRepository.saveAndFlush(event);
    }

    // 5. End an event: LIVE -> ENDED
    @Transactional
    public Event endEvent(Long id) {

        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Event not found: " + id
                ));

        event.end();

        return eventRepository.saveAndFlush(event);
    }
}
