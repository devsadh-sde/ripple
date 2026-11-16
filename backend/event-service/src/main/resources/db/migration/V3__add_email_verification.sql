
ALTER TABLE organizers
ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE organizer_email_verifications (
    id UUID PRIMARY KEY,
    organizer_id UUID NOT NULL
        REFERENCES organizers(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_verification_organizer
ON organizer_email_verifications(organizer_id);
