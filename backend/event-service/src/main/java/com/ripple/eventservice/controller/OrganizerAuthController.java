
package com.ripple.eventservice.controller;

import com.ripple.eventservice.entity.Organizer;
import com.ripple.eventservice.repository.OrganizerRepository;
import com.ripple.eventservice.service.OrganizerAuthService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class OrganizerAuthController {

    private static final String SESSION_ORGANIZER_ID =
            "ripple.organizerId";

    private final OrganizerAuthService authService;
    private final OrganizerRepository organizerRepository;

    public OrganizerAuthController(
            OrganizerAuthService authService,
            OrganizerRepository organizerRepository
    ) {
        this.authService = authService;
        this.organizerRepository = organizerRepository;
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
        public static OrganizerResponse from(
                Organizer organizer
        ) {
            return new OrganizerResponse(
                    organizer.getId(),
                    organizer.getName(),
                    organizer.getEmail()
            );
        }
    }

    // Register a new organizer.
    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public OrganizerResponse signup(
            @RequestBody SignupRequest request
    ) {
        Organizer organizer = authService.signup(
                request.name(),
                request.email(),
                request.password()
        );

        return OrganizerResponse.from(organizer);
    }

    // Verify credentials and create a server session.
    @PostMapping("/login")
    public OrganizerResponse login(
            @RequestBody LoginRequest request,
            HttpServletRequest servletRequest
    ) {
        Organizer organizer = authService.login(
                request.email(),
                request.password()
        );

        HttpSession session =
                servletRequest.getSession(false);

        if (session == null) {
            session = servletRequest.getSession(true);
        } else {
            servletRequest.changeSessionId();
        }

        session.setAttribute(
                SESSION_ORGANIZER_ID,
                organizer.getId()
        );

        return OrganizerResponse.from(organizer);
    }

    // Return the currently signed-in organizer.
    @GetMapping("/me")
    public OrganizerResponse me(
            HttpServletRequest request
    ) {
        HttpSession session = request.getSession(false);

        if (session == null) {
            throw unauthorized();
        }

        Object value = session.getAttribute(
                SESSION_ORGANIZER_ID
        );

        if (!(value instanceof UUID organizerId)) {
            throw unauthorized();
        }

        Organizer organizer = organizerRepository
                .findById(organizerId)
                .orElseThrow(this::unauthorized);

        return OrganizerResponse.from(organizer);
    }

    // Destroy the current session.
    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(
            HttpServletRequest request
    ) {
        HttpSession session = request.getSession(false);

        if (session != null) {
            session.invalidate();
        }
    }

    private ResponseStatusException unauthorized() {
        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Please sign in"
        );
    }
}
