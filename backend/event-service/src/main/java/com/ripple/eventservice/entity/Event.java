
package com.ripple.eventservice.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "events")
public class Event {

    public Event(String title, String description,
                String joinCode, UUID organizerId) {
        this.title = title;
        this.description = description;
        this.joinCode = joinCode;
        this.organizerId = organizerId;
        this.status = "DRAFT";
        this.createdAt = OffsetDateTime.now();
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "join_code", nullable = false,
            unique = true, length = 8)
    private String joinCode;

    @Column(nullable = false, length = 20)
    private String status;

    @Column(name = "organizer_id", nullable = false)
    private UUID organizerId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public Event() {
    }

    public Long getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public String getJoinCode() {
        return joinCode;
    }

    public String getStatus() {
        return status;
    }

    public UUID getOrganizerId() {
        return organizerId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void start() {
        if (!"DRAFT".equals(this.status)) {
            throw new IllegalStateException(
                    "Only DRAFT events can be started"
            );
        }

        this.status = "LIVE";
    }

    public void end() {
        if (!"LIVE".equals(this.status)) {
            throw new IllegalStateException(
                    "Only LIVE events can be ended"
            );
        }

        this.status = "ENDED";
    }

}
