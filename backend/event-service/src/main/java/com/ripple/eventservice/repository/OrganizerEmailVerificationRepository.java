
package com.ripple.eventservice.repository;

import com.ripple.eventservice.entity.OrganizerEmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface OrganizerEmailVerificationRepository
        extends JpaRepository<OrganizerEmailVerification, UUID> {

    List<OrganizerEmailVerification>
        findByOrganizerIdOrderByCreatedAtDesc(UUID organizerId);

    void deleteByOrganizerId(UUID organizerId);
}
