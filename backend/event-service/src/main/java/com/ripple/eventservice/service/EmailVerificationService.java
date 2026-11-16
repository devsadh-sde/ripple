
package com.ripple.eventservice.service;

import com.ripple.eventservice.entity.Organizer;
import com.ripple.eventservice.entity.OrganizerEmailVerification;
import com.ripple.eventservice.repository.OrganizerEmailVerificationRepository;
import com.ripple.eventservice.repository.OrganizerRepository;

import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

@Service
public class EmailVerificationService {

    private static final Duration OTP_EXPIRY =
            Duration.ofMinutes(10);

    private static final Duration RESEND_COOLDOWN =
            Duration.ofSeconds(60);

    private static final int MAX_ATTEMPTS = 5;

    private final OrganizerRepository organizerRepository;
    private final OrganizerEmailVerificationRepository verificationRepository;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    private final BCryptPasswordEncoder encoder =
            new BCryptPasswordEncoder(12);

    private final SecureRandom random = new SecureRandom();

    @Value("${ripple.mail.from:}")
    private String fromAddress;

    public EmailVerificationService(
            OrganizerRepository organizerRepository,
            OrganizerEmailVerificationRepository verificationRepository,
            ObjectProvider<JavaMailSender> mailSenderProvider
    ) {
        this.organizerRepository = organizerRepository;
        this.verificationRepository = verificationRepository;
        this.mailSenderProvider = mailSenderProvider;
    }

    @Transactional
    public void sendVerificationCode(String email) {
        String normalizedEmail = normalizeEmail(email);

        Organizer organizer = organizerRepository
                .findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Account not found"
                ));

        if (organizer.isEmailVerified()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already verified"
            );
        }

        List<OrganizerEmailVerification> previousCodes =
                verificationRepository
                        .findByOrganizerIdOrderByCreatedAtDesc(
                                organizer.getId()
                        );

        if (!previousCodes.isEmpty()) {
            Instant mostRecent =
                    previousCodes.get(0).getCreatedAt();

            if (Instant.now().isBefore(
                    mostRecent.plus(RESEND_COOLDOWN)
            )) {
                throw new ResponseStatusException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "Please wait 60 seconds before requesting another code"
                );
            }
        }

        JavaMailSender mailSender =
                mailSenderProvider.getIfAvailable();

        if (mailSender == null || fromAddress.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Email delivery is not configured"
            );
        }

        String code = String.format(
                Locale.ROOT,
                "%06d",
                random.nextInt(1_000_000)
        );

        verificationRepository.deleteByOrganizerId(
                organizer.getId()
        );

        OrganizerEmailVerification verification =
                new OrganizerEmailVerification(
                        organizer,
                        encoder.encode(code),
                        Instant.now().plus(OTP_EXPIRY)
                );

        verificationRepository.saveAndFlush(verification);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(organizer.getEmail());
        message.setSubject("Ripple - Verify your email");
        message.setText(
                "Hello " + organizer.getName() + ",\n\n" +
                "Your Ripple verification code is:\n\n" +
                code + "\n\n" +
                "This code expires in 10 minutes.\n" +
                "Do not share this code with anyone.\n\n" +
                "If you did not request this code, " +
                "you can ignore this email.\n\n" +
                "Ripple Team"
        );

        try {
            mailSender.send(message);
        } catch (Exception ex) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Unable to send verification email",
                    ex
            );
        }
    }

    @Transactional(
            noRollbackFor = ResponseStatusException.class
    )
    public void verifyCode(String email, String code) {
        String normalizedEmail = normalizeEmail(email);

        if (code == null ||
                !code.matches("\\d{6}")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Enter a valid six-digit verification code"
            );
        }

        Organizer organizer = organizerRepository
                .findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(this::invalidCode);

        if (organizer.isEmailVerified()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Email is already verified"
            );
        }

        List<OrganizerEmailVerification> codes =
                verificationRepository
                        .findByOrganizerIdOrderByCreatedAtDesc(
                                organizer.getId()
                        );

        if (codes.isEmpty()) {
            throw invalidCode();
        }

        OrganizerEmailVerification verification =
                codes.get(0);

        if (verification.isExpired()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Code expired. Request a new code."
            );
        }

        if (verification.hasTooManyAttempts()) {
            throw new ResponseStatusException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "Too many attempts. Request a new code."
            );
        }

        if (!encoder.matches(
                code,
                verification.getCodeHash()
        )) {
            verification.incrementAttempts();

            verificationRepository.saveAndFlush(
                    verification
            );

            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid verification code"
            );
        }

        organizer.verifyEmail();
        organizerRepository.save(organizer);

        verificationRepository.deleteByOrganizerId(
                organizer.getId()
        );
    }

    private String normalizeEmail(String email) {
        if (email == null ||
                email.isBlank() ||
                email.length() > 255 ||
                !email.contains("@")) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid email"
            );
        }

        return email.trim().toLowerCase(Locale.ROOT);
    }

    private ResponseStatusException invalidCode() {
        return new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Invalid verification code"
        );
    }
}
