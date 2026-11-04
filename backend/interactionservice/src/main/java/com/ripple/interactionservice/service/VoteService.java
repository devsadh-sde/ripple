
package com.ripple.interactionservice.service;

import com.ripple.interactionservice.entity.Poll;
import com.ripple.interactionservice.entity.Vote;
import com.ripple.interactionservice.repository.PollRepository;
import com.ripple.interactionservice.repository.VoteRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class VoteService {

    private final VoteRepository voteRepository;
    private final PollRepository pollRepository;

    public VoteService(
            VoteRepository voteRepository,
            PollRepository pollRepository
    ) {
        this.voteRepository = voteRepository;
        this.pollRepository = pollRepository;
    }

    @Transactional
    public Vote castVote(
            Long pollId,
            Long optionId,
            UUID participantId
    ) {
        if (pollId == null || optionId == null
                || participantId == null) {
            throw new IllegalArgumentException(
                "Poll, option and participant are required"
            );
        }

        // Lock the poll row to coordinate voting and closing
        Poll poll = pollRepository.findByIdForUpdate(pollId)
            .orElseThrow(() -> new IllegalArgumentException(
                "Poll not found: " + pollId
            ));

        if (!"LIVE".equals(poll.getStatus())) {
            throw new IllegalStateException(
                "Voting is allowed only for LIVE polls"
            );
        }

        boolean validOption = poll.getOptions()
            .stream()
            .anyMatch(option -> option.getId().equals(optionId));

        if (!validOption) {
            throw new IllegalArgumentException(
                "Option does not belong to this poll"
            );
        }

        if (voteRepository.existsByPollIdAndParticipantId(
                pollId, participantId)) {
            throw new IllegalStateException(
                "Participant has already voted"
            );
        }

        Vote vote = new Vote(
            pollId,
            optionId,
            participantId
        );

        return voteRepository.saveAndFlush(vote);
    }
}
