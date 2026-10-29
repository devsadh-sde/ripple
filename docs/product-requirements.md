
# Ripple — Product Requirements Document

## Product Overview
Ripple is a real-time audience engagement platform for conferences,
lectures, workshops, and corporate events.

## Business Problem
Event organizers need an interactive way to collect audience responses, manage questions, and measure engagement.

## MVP Features
1. Organizer authentication
2. Event creation and management
3. Session creation and management
4. Unique event join codes
5. Guest participation
6. Single-choice live polling
7. Duplicate vote prevention
8. Real-time poll results using WebSockets
9. Basic presenter dashboard

## Primary Users
- Organizer
- Presenter
- Participant

## First User Story
As a participant, I want to join an event using a code
so that I can interact without creating an account.

## Acceptance Criteria
- Valid event code allows joining.
- Invalid event code returns an error.
- Closed events cannot accept new participants.
- Guest participation is supported.
- Joining an event does not require registration.

## Initial Technical Architecture
- Frontend: React + TypeScript
- Backend: Java 21 + Spring Boot Microservices
- API Gateway: Spring Cloud Gateway
- Database: PostgreSQL
- Real-Time: WebSockets
- Containerization: Docker
- Orchestration: Kubernetes
- Cloud: AWS
