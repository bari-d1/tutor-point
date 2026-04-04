-- Migration: 001_create_test_sessions
-- Up

CREATE TABLE test_sessions (
    id                     UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_application_id   TEXT          NOT NULL
                                         REFERENCES "TutorApplication"(id)
                                         ON DELETE CASCADE,
    questions              JSONB         NOT NULL,
    answers                JSONB,
    score                  INTEGER,
    total                  INTEGER       NOT NULL DEFAULT 40,
    started_at             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    submitted_at           TIMESTAMPTZ
);

CREATE INDEX idx_test_sessions_tutor_application_id
    ON test_sessions (tutor_application_id);
