
package com.ripple.eventservice.security;

import com.ripple.eventservice.controller.CsrfController;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Component
public class CsrfProtectionFilter extends OncePerRequestFilter {

    @Override
    protected boolean shouldNotFilter(
            HttpServletRequest request
    ) {
        String path = request.getServletPath();
        String method = request.getMethod();

        if (!"POST".equalsIgnoreCase(method)) {
            return true;
        }

        boolean eventMutation =
                path.equals("/api/events") ||
                (path.startsWith("/api/events/")
                        && (
                            path.endsWith("/start") ||
                            path.endsWith("/end") ||
                            path.endsWith("/organizer-access")
                        ));

        boolean logout = path.equals("/api/auth/logout");

        return !eventMutation && !logout;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain chain
    ) throws ServletException, IOException {

        HttpSession session = request.getSession(false);

        Object savedToken = session == null
                ? null
                : session.getAttribute(CsrfController.TOKEN_KEY);

        String expected =
                savedToken instanceof String
                        ? (String) savedToken
                        : null;

        String supplied = request.getHeader("X-CSRF-Token");

        if (expected == null ||
                supplied == null ||
                !MessageDigest.isEqual(
                        expected.getBytes(StandardCharsets.UTF_8),
                        supplied.getBytes(StandardCharsets.UTF_8)
                )) {

            response.sendError(
                    HttpServletResponse.SC_FORBIDDEN,
                    "Invalid or missing CSRF token"
            );
            return;
        }

        chain.doFilter(request, response);
    }
}
