
# Ripple — Microservices Architecture

## Services

### API Gateway
Routes client requests to backend services.

### Identity Service
Manages authentication, users, and permissions.

### Event Service
Manages events, sessions, join codes, and guest participation.

### Interaction Service
Manages live polls, voting, questions, and WebSocket updates.

### Analytics Service
Processes engagement events and generates reports.

## Architecture Principles
- Each service owns its business logic.
- Services are independently deployable.
- Each service owns its data and schema.
- Services communicate through REST and asynchronous events.
- PostgreSQL is the primary persistent database.
- Redis and Kafka will be introduced when needed.
