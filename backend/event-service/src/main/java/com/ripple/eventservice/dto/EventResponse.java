
package com.ripple.eventservice.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EventResponse(
        Long id,
        String title,
        String description,
        String joinCode,
        String status,
        UUID organizerId,
        OffsetDateTime createdAt
) {}
