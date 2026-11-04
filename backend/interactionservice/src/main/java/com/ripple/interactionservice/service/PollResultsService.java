
package com.ripple.interactionservice.service;

import com.ripple.interactionservice.dto.PollResultsResponse;
import com.ripple.interactionservice.entity.Poll;
import com.ripple.interactionservice.repository.PollRepository;
import com.ripple.interactionservice.repository.VoteRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PollResultsService {

    private final PollRepository pollRepository;
    private final VoteRepository voteRepository;

    public PollResultsService(
            PollRepository pollRepository,
            VoteRepository voteRepository
    ) {
        this.pollRepository = pollRepository;
        this.voteRepository = voteRepository;
    }

    @Transactional(readOnly = true)
    public PollResultsResponse getResults(Long pollId) {

        Poll poll = pollRepository.findById(pollId)
            .orElseThrow(() -> new IllegalArgumentException(
                "Poll not found: " + pollId
            ));

        var counts = poll.getOptions().stream()
            .map(option -> new Object[] {
                option.getId(),
                option.getOptionText(),
                voteRepository.countByPollIdAndOptionId(
                    pollId, option.getId()
                )
            })
            .toList();

        long totalVotes = counts.stream()
            .mapToLong(row -> (long) row[2])
            .sum();

        List<PollResultsResponse.OptionResult> results =
            counts.stream()
                .map(row -> {
                    long votes = (long) row[2];

                    double percentage = totalVotes == 0
                        ? 0.0
                        : Math.round(
                            votes * 10000.0 / totalVotes
                          ) / 100.0;

                    return new PollResultsResponse.OptionResult(
                        (Long) row[0],
                        (String) row[1],
                        votes,
                        percentage
                    );
                })
                .toList();

        return new PollResultsResponse(
            poll.getId(),
            poll.getQuestion(),
            poll.getStatus(),
            totalVotes,
            results
        );
    }
}
