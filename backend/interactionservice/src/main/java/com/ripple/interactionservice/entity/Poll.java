
package com.ripple.interactionservice.entity;

import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "polls")
public class Poll {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "event_id", nullable = false)
    private Long eventId;

    @Column(nullable = false, length = 500)
    private String question;

    @Column(nullable = false, length = 20)
    private String status = "DRAFT";

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @OneToMany(
        mappedBy = "poll",
        cascade = CascadeType.ALL,
        orphanRemoval = true
    )
    private List<PollOption> options = new ArrayList<>();

    protected Poll() {
    }

    public Poll(Long eventId, String question) {
        this.eventId = eventId;
        this.question = question;
        this.createdAt = OffsetDateTime.now();
    }

    public void addOption(String text) {
        PollOption option = new PollOption(this, text);
        options.add(option);
    }

    public Long getId() {
        return id;
    }

    public Long getEventId() {
        return eventId;
    }

    public String getQuestion() {
        return question;
    }

    public String getStatus() {
        return status;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public List<PollOption> getOptions() {
        return options;
    }

    public void start() {
        if (!"DRAFT".equals(status)) {
            throw new IllegalStateException(
                "Only DRAFT polls can be started"
            );
        }

        status = "LIVE";
    }

    public void close() {
        if (!"LIVE".equals(status)) {
            throw new IllegalStateException(
                "Only LIVE polls can be closed"
            );
        }

        status = "CLOSED";
    }

}
