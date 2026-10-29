
# Ripple — Database Design

## Event Service Database

### Table: events

- id: BIGINT, primary key
- title: VARCHAR(200), not null
- description: TEXT
- join_code: VARCHAR(8), unique, not null
- status: VARCHAR(20), not null
- organizer_id: UUID, not null
- created_at: TIMESTAMPTZ, not null

### Table: sessions

- id: BIGINT, primary key
- event_id: BIGINT, foreign key referencing events(id)
- title: VARCHAR(200), not null
- status: VARCHAR(20), not null
- starts_at: TIMESTAMPTZ
- ends_at: TIMESTAMPTZ

## Relationships

One event can have multiple sessions.

events.id → sessions.event_id

## Business Rules

1. Every event must have a unique join code.
2. An event must have a title and organizer.
3. A session must belong to an existing event.
4. Event statuses: DRAFT, SCHEDULED, LIVE, ENDED, ARCHIVED.
5. A closed event cannot accept new participants.
6. Organizer identity is managed by Identity Service.
