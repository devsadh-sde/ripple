
package com.ripple.eventservice.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class CsrfController {

    public static final String TOKEN_KEY = "ripple.csrfToken";

    public record CsrfResponse(String token) {}

    @GetMapping("/csrf")
    public CsrfResponse getCsrfToken(HttpServletRequest request) {

        HttpSession session = request.getSession(false);

        if (session == null ||
                !(session.getAttribute("ripple.organizerId")
                        instanceof UUID)) {

            throw new ResponseStatusException(
                    HttpStatus.UNAUTHORIZED,
                    "Organizer login required"
            );
        }

        String token = (String) session.getAttribute(TOKEN_KEY);

        if (token == null) {
            token = UUID.randomUUID().toString();
            session.setAttribute(TOKEN_KEY, token);
        }

        return new CsrfResponse(token);
    }
}
