
package com.ripple.interactionservice.security;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

@Service
public class PollAuthorizationService {

    private final RestClient eventServiceClient;

    public PollAuthorizationService(
            @Value("${ripple.event-service.url:http://localhost:8081}")
            String eventServiceUrl
    ) {
        this.eventServiceClient = RestClient.builder()
                .baseUrl(eventServiceUrl)
                .build();
    }

    public void requireEventOwner(
            Long eventId,
            HttpServletRequest request
    ) {
        String cookie = request.getHeader(HttpHeaders.COOKIE);
        String csrfToken = request.getHeader("X-CSRF-Token");

        if (cookie == null || cookie.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Organizer login required"
            );
        }

        if (csrfToken == null || csrfToken.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "CSRF token required"
            );
        }

        try {
            eventServiceClient.post()
                    .uri(
                            "/api/events/{id}/organizer-access",
                            eventId
                    )
                    .header(HttpHeaders.COOKIE, cookie)
                    .header("X-CSRF-Token", csrfToken)
                    .retrieve()
                    .onStatus(
                            HttpStatusCode::isError,
                            (req, response) -> {
                                throw new ResponseStatusException(
                                        response.getStatusCode(),
                                        "Event authorization failed"
                                );
                            }
                    )
                    .toBodilessEntity();

        } catch (ResponseStatusException e) {
            throw e;

        } catch (ResourceAccessException e) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_GATEWAY,
                    "Cannot reach Event Service",
                    e
            );
        }
    }
}
