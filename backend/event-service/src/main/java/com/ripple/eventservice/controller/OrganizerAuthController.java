
package com.ripple.eventservice.controller;

import com.ripple.eventservice.entity.Organizer;
import com.ripple.eventservice.service.OrganizerAuthService;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class OrganizerAuthController {

    private final OrganizerAuthService authService;

    public OrganizerAuthController(
            OrganizerAuthService authService
    ) {
        this.authService = authService;
    }

    public record SignupRequest(
            String name,
            String email,
            String password
    ) {}

    public record LoginRequest(
            String email,
            String password
    ) {}

    public record OrganizerResponse(
            UUID id,
            String name,
            String email
    ) {
        public static OrganizerResponse from(Organizer organizer) {
            return new OrganizerResponse(
                    organizer.getId(),
                    organizer.getName(),
                    organizer.getEmail()
            );
        }
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public OrganizerResponse signup(
            @RequestBody SignupRequest request
    ) {
        return OrganizerResponse.from(
                authService.signup(
                        request.name(),
                        request.email(),
                        request.password()
                )
        );
    }

    @PostMapping("/login")
    public OrganizerResponse login(
            @RequestBody LoginRequest request
    ) {
        return OrganizerResponse.from(
                authService.login(
                        request.email(),
                        request.password()
                )
        );
    }
}
