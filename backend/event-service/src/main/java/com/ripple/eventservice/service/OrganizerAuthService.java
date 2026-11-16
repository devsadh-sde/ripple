
package com.ripple.eventservice.service;

import com.ripple.eventservice.entity.Organizer;
import com.ripple.eventservice.repository.OrganizerRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Locale;

@Service
public class OrganizerAuthService {

    private final OrganizerRepository repository;

    private final BCryptPasswordEncoder encoder =
            new BCryptPasswordEncoder(12);

    public OrganizerAuthService(OrganizerRepository repository) {
        this.repository = repository;
    }

    public Organizer signup(
            String name,
            String email,
            String password
    ) {

        if (name == null || name.isBlank()
                || name.trim().length() > 100) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid name");
        }

        String normalizedEmail = normalizeEmail(email);

        if (password == null || password.length() < 12
                || password.length() > 72) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Password must be 12 to 72 characters");
        }

        if (repository.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email already registered");
        }

        Organizer organizer = new Organizer(
                name.trim(),
                normalizedEmail,
                encoder.encode(password)
        );

        try {
            return repository.saveAndFlush(organizer);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email already registered");
        }
    }

    public Organizer login(String email, String password) {

        String normalizedEmail = normalizeEmail(email);

        Organizer organizer = repository
                .findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(this::invalidCredentials);

        // Step 1: Validate the password.
        if (password == null ||
                !encoder.matches(
                        password,
                        organizer.getPasswordHash()
                )) {
            throw invalidCredentials();
        }

        // Step 2: Require email verification before login.
        if (!organizer.isEmailVerified()) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "EMAIL_NOT_VERIFIED"
            );
        }

        // Step 3: Allow the verified organizer to log in.
        return organizer;
    }

    private String normalizeEmail(String email) {

        if (email == null || email.isBlank()
                || email.length() > 255
                || !email.contains("@")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid email");
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }

    private ResponseStatusException invalidCredentials() {

        return new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password"
        );
    }
}
