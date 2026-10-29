
package com.ripple.eventservice.service;

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

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public Event save(Event event) {
        return eventRepository.saveAndFlush(event);
    }
}
