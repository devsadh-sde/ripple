
package com.ripple.interactionservice.controller;

import com.ripple.interactionservice.dto.PollResultsResponse;
import com.ripple.interactionservice.service.PollResultsService;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/polls")
public class PollResultsController {

    private final PollResultsService resultsService;

    public PollResultsController(
            PollResultsService resultsService
    ) {
        this.resultsService = resultsService;
    }

    @GetMapping("/{pollId}/results")
    public PollResultsResponse getResults(
            @PathVariable Long pollId
    ) {
        return resultsService.getResults(pollId);
    }
}
