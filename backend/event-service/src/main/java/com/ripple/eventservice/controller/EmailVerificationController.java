
package com.ripple.eventservice.controller;

import com.ripple.eventservice.service.EmailVerificationService;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class EmailVerificationController {

    private final EmailVerificationService verificationService;

    public EmailVerificationController(
            EmailVerificationService verificationService
    ) {
        this.verificationService = verificationService;
    }

    public record EmailRequest(String email) {}

    public record VerifyRequest(
            String email,
            String code
    ) {}

    public record MessageResponse(String message) {}

    @PostMapping("/send-verification")
    public ResponseEntity<MessageResponse> sendVerification(
            @RequestBody EmailRequest request
    ) {
        verificationService.sendVerificationCode(
                request.email()
        );

        return ResponseEntity.ok(
                new MessageResponse(
                        "Verification code sent to your email"
                )
        );
    }

    @PostMapping("/verify-email")
    public ResponseEntity<MessageResponse> verifyEmail(
            @RequestBody VerifyRequest request
    ) {
        verificationService.verifyCode(
                request.email(),
                request.code()
        );

        return ResponseEntity.ok(
                new MessageResponse(
                        "Email verified successfully"
                )
        );
    }
}
