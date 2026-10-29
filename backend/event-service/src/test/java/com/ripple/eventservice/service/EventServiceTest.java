
package com.ripple.eventservice.service;

import com.ripple.eventservice.entity.Event;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;

import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EventServiceTest {

    @Mock
    private EventWriter eventWriter;

    @InjectMocks
    private EventService eventService;

    @Test
    void shouldCreateEventSuccessfully() {

        UUID organizerId = UUID.randomUUID();

        when(eventWriter.save(any(Event.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        Event event = eventService.createEvent(
                "Java Conference",
                "Learning Microservices",
                organizerId
        );

        assertNotNull(event);
        assertEquals("Java Conference", event.getTitle());
        assertEquals("Learning Microservices", event.getDescription());
        assertEquals("DRAFT", event.getStatus());
        assertEquals(organizerId, event.getOrganizerId());
        assertNotNull(event.getCreatedAt());
        assertNotNull(event.getJoinCode());
        assertEquals(6, event.getJoinCode().length());

        verify(eventWriter, times(1))
                .save(any(Event.class));
    }

    @Test
    void shouldRejectBlankTitle() {

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> eventService.createEvent(
                        "   ",
                        "Description",
                        UUID.randomUUID()
                )
        );

        assertEquals(
                "Event title cannot be empty",
                exception.getMessage()
        );

        verifyNoInteractions(eventWriter);
    }

    @Test
    void shouldRejectNullOrganizerId() {

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> eventService.createEvent(
                        "Java Conference",
                        "Description",
                        null
                )
        );

        assertEquals(
                "Organizer ID is required",
                exception.getMessage()
        );

        verifyNoInteractions(eventWriter);
    }

    @Test
    void shouldRejectTitleLongerThan200Characters() {

        String longTitle = "A".repeat(201);

        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> eventService.createEvent(
                        longTitle,
                        "Description",
                        UUID.randomUUID()
                )
        );

        assertEquals(
                "Event title cannot exceed 200 characters",
                exception.getMessage()
        );

        verifyNoInteractions(eventWriter);
    }
}
