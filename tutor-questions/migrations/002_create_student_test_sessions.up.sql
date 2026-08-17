-- Migration: 002_create_student_test_sessions
-- Up

CREATE TABLE student_test_sessions (
    id                      TEXT          PRIMARY KEY DEFAULT gen_random_uuid()::text,
    parent_registration_id  TEXT          NOT NULL
                                          REFERENCES "ParentRegistration"(id)
                                          ON DELETE CASCADE,
    student_name            TEXT,
    class_level             TEXT          NOT NULL,
    questions               JSONB         NOT NULL,
    answers                 JSONB,
    marking_status          TEXT          NOT NULL DEFAULT 'PENDING',
    score                   INTEGER,
    total                   INTEGER       NOT NULL,
    marked_at               TIMESTAMPTZ,
    marked_by               TEXT,
    started_at              TIMESTAMPTZ   NOT NULL DEFAULT now(),
    submitted_at            TIMESTAMPTZ
);

CREATE INDEX idx_student_test_sessions_parent_registration_id
    ON student_test_sessions (parent_registration_id);

CREATE INDEX idx_student_test_sessions_marking_status
    ON student_test_sessions (marking_status);
