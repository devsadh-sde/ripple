
package com.ripple.interactionservice.service;

import com.ripple.interactionservice.entity.Poll;
import com.ripple.interactionservice.repository.PollRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PollService {

    private final PollRepository pollRepository;

    public PollService(PollRepository pollRepository) {
        this.pollRepository = pollRepository;
    }

    @Transactional
    public Poll createPoll(
            Long eventId,
            String question,
            List<String> options
    ) {
        if (eventId == null || eventId <= 0) {
            throw new IllegalArgumentException(
                "A valid event ID is required"
            );
        }

        if (question == null || question.isBlank()
                || question.length() > 500) {
            throw new IllegalArgumentException(
                "Question must contain 1 to 500 characters"
            );
        }

        if (options == null
                || options.size() < 2
                || options.size() > 10) {
            throw new IllegalArgumentException(
                "A poll must have between 2 and 10 options"
            );
        }

        Poll poll = new Poll(eventId, question.trim());

        for (String option : options) {
            if (option == null || option.isBlank()
                    || option.length() > 200) {
                throw new IllegalArgumentException(
                    "Each option must contain 1 to 200 characters"
                );
            }

            poll.addOption(option.trim());
        }

        return pollRepository.save(poll);
    }
}
