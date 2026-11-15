
package com.ripple.eventservice.repository;

import com.ripple.eventservice.entity.Organizer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface OrganizerRepository
        extends JpaRepository<Organizer, UUID> {

    Optional<Organizer> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);
}
