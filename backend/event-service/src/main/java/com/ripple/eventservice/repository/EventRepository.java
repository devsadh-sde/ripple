
package com.ripple.eventservice.repository;

import com.ripple.eventservice.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

import java.util.Optional;

public interface EventRepository
        extends JpaRepository<Event, Long> {

    Optional<Event> findByJoinCode(String joinCode);
    List<Event> findByOrganizerId(UUID organizerId);

    boolean existsByJoinCode(String joinCode);
}
