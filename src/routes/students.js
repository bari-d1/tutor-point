import express from "express";
import { prisma } from "../db/prisma.js";
import {
  buildStudentPaper,
  normalizeClassLevel,
  stripAnswers,
  getDurationMinutes,
  CLASS_LEVELS
} from "../services/studentQuestions.service.js";

const router = express.Router();

/**
 * Dev/QA accounts. Registrations whose id starts with this prefix can sit the test
 * as often as you like and always get a freshly drawn paper — the same escape hatch
 * the tutor test has via test-dev-entry-001. Create them with:
 *   npm run student:test-accounts
 */
const TEST_REGISTRATION_PREFIX = "student-test-";

function isTestAccount(registrationId) {
  return String(registrationId).startsWith(TEST_REGISTRATION_PREFIX);
}

/**
 * Password gate, using the same shared TEST_PASSWORD as the tutor test.
 */
function checkPassword(supplied) {
  const expected = process.env.TEST_PASSWORD;
  if (!expected) {
    return { ok: false, status: 500, error: "Test password not configured" };
  }

  if (!supplied || !String(supplied).trim()) {
    return { ok: false, status: 400, error: "Password is required" };
  }
  if (String(supplied).trim().toLowerCase() !== expected.toLowerCase()) {
    return { ok: false, status: 401, error: "Incorrect password" };
  }
  return { ok: true };
}

// GET /api/students/test/:registrationId — who is this link for, and can they sit it?
router.get("/test/:registrationId", async (req, res) => {
  try {
    const registration = await prisma.parentRegistration.findUnique({
      where: { id: req.params.registrationId },
      select: { id: true, childName: true, childClass: true }
    });

    if (!registration) {
      return res.status(404).json({ ok: false, error: "Test link not found", redirect404: true });
    }

    const classLevel = normalizeClassLevel(registration.childClass);

    const submitted = await prisma.studentTestSession.findFirst({
      where: { parentRegistrationId: registration.id, submittedAt: { not: null } },
      select: { id: true, submittedAt: true }
    });

    return res.json({
      ok: true,
      childName: registration.childName,
      childClass: registration.childClass,
      classLevel,
      supported: Boolean(classLevel),
      passwordRequired: true,
      alreadySubmitted: isTestAccount(registration.id) ? false : Boolean(submitted),
      testAccount: isTestAccount(registration.id),
      durationMinutes: getDurationMinutes(classLevel)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/students/test/start/:registrationId
router.post("/test/start/:registrationId", async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { name, password } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, error: "Name is required" });
    }

    const gate = checkPassword(password);
    if (!gate.ok) {
      return res.status(gate.status).json({ ok: false, error: gate.error });
    }

    const registration = await prisma.parentRegistration.findUnique({
      where: { id: registrationId }
    });

    if (!registration) {
      return res.status(404).json({ ok: false, error: "Test link not found", redirect404: true });
    }

    const classLevel = normalizeClassLevel(registration.childClass);
    if (!classLevel) {
      return res.status(409).json({
        ok: false,
        error: `There is no test available for ${registration.childClass || "this class"} yet.`,
        unsupportedClass: true
      });
    }

    // Test accounts skip both guards below, so they always get a fresh paper.
    if (!isTestAccount(registrationId)) {
      // One sitting per registration.
      const submitted = await prisma.studentTestSession.findFirst({
        where: { parentRegistrationId: registrationId, submittedAt: { not: null } }
      });
      if (submitted) {
        return res.status(409).json({ ok: false, error: "You have already completed this test." });
      }

      // Resume an unfinished sitting rather than handing out a fresh paper.
      const existing = await prisma.studentTestSession.findFirst({
        where: { parentRegistrationId: registrationId, submittedAt: null }
      });

      if (existing) {
        return res.json({
          ok: true,
          sessionId: existing.id,
          resumed: true,
          classLevel: existing.classLevel,
          durationMinutes: getDurationMinutes(existing.classLevel),
          startedAt: existing.startedAt,
          questions: stripAnswers(existing.questions)
        });
      }
    }

    const paper = buildStudentPaper(classLevel);

    const session = await prisma.studentTestSession.create({
      data: {
        parentRegistrationId: registrationId,
        studentName: String(name).trim(),
        classLevel,
        questions: paper,
        total: paper.length
      }
    });

    return res.status(201).json({
      ok: true,
      sessionId: session.id,
      resumed: false,
      classLevel,
      durationMinutes: getDurationMinutes(classLevel),
      startedAt: session.startedAt,
      questions: stripAnswers(paper)
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/students/test/submit — stores the work; marking happens by hand.
router.post("/test/submit", async (req, res) => {
  try {
    const { session_id, answers } = req.body;

    if (!session_id) {
      return res.status(400).json({ ok: false, error: "session_id is required" });
    }
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return res.status(400).json({ ok: false, error: "answers must be an object" });
    }

    const session = await prisma.studentTestSession.findUnique({
      where: { id: session_id }
    });

    if (!session) {
      return res.status(404).json({ ok: false, error: "Session not found" });
    }
    if (session.submittedAt) {
      return res.status(409).json({ ok: false, error: "Test already submitted" });
    }

    const elapsedMs = Date.now() - new Date(session.startedAt).getTime();
    const expired = elapsedMs > getDurationMinutes(session.classLevel) * 60 * 1000;

    const questions = session.questions;
    const answered = questions.filter((q) => String(answers[q.id] ?? "").trim()).length;

    await prisma.studentTestSession.update({
      where: { id: session_id },
      data: {
        answers,
        submittedAt: new Date(),
        markingStatus: "PENDING"
      }
    });

    // No score is returned — a tutor marks the paper.
    return res.json({
      ok: true,
      submitted: true,
      total: questions.length,
      answered,
      expired,
      markingStatus: "PENDING",
      message:
        "Your work has been submitted. A member of the TutorPoint team will mark it and get back to you."
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// GET /api/students/test/levels — which class levels have a bank (for admin/debug)
router.get("/test-levels", (req, res) => {
  return res.json({
    ok: true,
    levels: Object.entries(CLASS_LEVELS).map(([level, cfg]) => ({
      level,
      perSection: cfg.perSection ?? null,
      wholePaper: Boolean(cfg.wholePaper),
      durationMinutes: cfg.durationMinutes,
      file: cfg.file
    }))
  });
});

export default router;
