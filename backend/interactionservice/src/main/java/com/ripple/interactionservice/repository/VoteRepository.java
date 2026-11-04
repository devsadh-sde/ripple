
package com.ripple.interactionservice.repository;

import com.ripple.interactionservice.entity.Vote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface VoteRepository
        extends JpaRepository<Vote, Long> {

    boolean existsByPollIdAndParticipantId(
        Long pollId,
        UUID participantId
    );

    long countByPollIdAndOptionId(
        Long pollId,
        Long optionId
    );
}
