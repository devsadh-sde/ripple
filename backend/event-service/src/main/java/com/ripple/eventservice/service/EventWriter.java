
package com.ripple.eventservice.service;

import com.ripple.eventservice.entity.Event;
import com.ripple.eventservice.repository.EventRepository;

import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventWriter {

    private final EventRepository eventRepository;

    public EventWriter(EventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Event save(Event event) {
        return eventRepository.saveAndFlush(event);
    }

    @Transactional(readOnly = true)
    public Optional<Event> findById(Long id) {
        return eventRepository.findById(id);
    }

    @Transactional
    public Event startEvent(Long id) {
        Event event = eventRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Event not found: " + id
                ));

        event.start();
        return eventRepository.saveAndFlush(event);
    }

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
