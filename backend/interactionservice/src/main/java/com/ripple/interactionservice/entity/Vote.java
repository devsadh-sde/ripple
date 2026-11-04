
package com.ripple.interactionservice.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "votes")
public class Vote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "poll_id", nullable = false)
    private Long pollId;

    @Column(name = "option_id", nullable = false)
    private Long optionId;

    @Column(name = "participant_id", nullable = false)
    private UUID participantId;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    protected Vote() {
    }

    public Vote(
            Long pollId,
            Long optionId,
            UUID participantId
    ) {
        this.pollId = pollId;
        this.optionId = optionId;
        this.participantId = participantId;
        this.createdAt = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getPollId() {
        return pollId;
    }

    public Long getOptionId() {
        return optionId;
    }

    public UUID getParticipantId() {
        return participantId;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }
}
