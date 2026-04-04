-- Migration: 001_create_test_sessions
-- Down (rollback)

DROP INDEX IF EXISTS idx_test_sessions_tutor_application_id;

DROP TABLE IF EXISTS test_sessions;
