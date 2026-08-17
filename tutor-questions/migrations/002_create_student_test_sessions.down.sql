-- Migration: 002_create_student_test_sessions
-- Down (rollback)

DROP INDEX IF EXISTS idx_student_test_sessions_marking_status;
DROP INDEX IF EXISTS idx_student_test_sessions_parent_registration_id;

DROP TABLE IF EXISTS student_test_sessions;
