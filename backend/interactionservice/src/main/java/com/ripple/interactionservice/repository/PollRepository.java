package com.ripple.interactionservice.repository;

import com.ripple.interactionservice.entity.Poll;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PollRepository extends JpaRepository<Poll, Long> {

    List<Poll> findByEventId(Long eventId);

    List<Poll> findByEventIdAndStatus(
        Long eventId,
        String status
    );
}
