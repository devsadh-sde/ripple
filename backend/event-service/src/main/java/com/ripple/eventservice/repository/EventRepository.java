
package com.ripple.eventservice.repository;

import com.ripple.eventservice.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EventRepository
        extends JpaRepository<Event, Long> {

    Optional<Event> findByJoinCode(String joinCode);

    boolean existsByJoinCode(String joinCode);
}
