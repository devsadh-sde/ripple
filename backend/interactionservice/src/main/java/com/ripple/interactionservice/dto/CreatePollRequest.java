
package com.ripple.interactionservice.dto;

import jakarta.validation.constraints.*;
import java.util.List;

public record CreatePollRequest(

    @NotNull
    @Positive
    Long eventId,

    @NotBlank
    @Size(max = 500)
    String question,

    @NotNull
    @Size(min = 2, max = 10)
    List<@NotBlank @Size(max = 200) String> options

) {}
