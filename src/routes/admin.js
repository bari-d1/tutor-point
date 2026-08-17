import express from "express";
import { randomUUID } from "crypto";
import { prisma } from "../db/prisma.js";

const router = express.Router();

function requireToken(req, res, next) {
  const token = process.env.ADMIN_TOKEN;
  const auth  = req.headers["authorization"] ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : req.query.token;

  if (!token || provided !== token) {
    res.set("WWW-Authenticate", 'Bearer realm="TutorPoint Admin"');
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  next();
}

// GET /api/admin/results
router.get("/results", requireToken, async (req, res) => {
  try {
    const sessions = await prisma.testSession.findMany({
      where:   { submittedAt: { not: null } },
      orderBy: { submittedAt: "desc" },
      include: { tutorApplication: { select: { fullName: true, email: true } } },
    });

    const rows = sessions.map((s) => ({
      sessionId:         s.id,
      applicationId:     s.tutorApplicationId,
      applicantName:     s.tutorApplication?.fullName ?? "—",
      testName:          s.testName ?? "—",
      email:             s.tutorApplication?.email ?? "—",
      submittedAt:       s.submittedAt,
      score:             s.score,
      total:             s.total,
      percentage:        s.total ? Math.round((s.score / s.total) * 100) : 0,
      passed:            s.total ? Math.round((s.score / s.total) * 100) >= 60 : false,
      questions:         s.questions,
      answers:           s.answers,
    }));

    return res.json({ ok: true, results: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// GET /api/admin/student-results — every student sitting, newest first.
// Includes the answer key, since this is behind the admin token.
router.get("/student-results", requireToken, async (req, res) => {
  try {
    const sessions = await prisma.studentTestSession.findMany({
      orderBy: [{ submittedAt: "desc" }, { startedAt: "desc" }],
      include: {
        parentRegistration: {
          select: {
            id: true,
            childName: true,
            childClass: true,
            parentName: true,
            parentEmail: true,
            parentPhone: true
          }
        }
      }
    });

    const rows = sessions.map((s) => {
      const answers = s.answers ?? {};
      const answered = s.questions.filter(
        (q) => String(answers[q.id] ?? "").trim() !== ""
      ).length;

      return {
        sessionId: s.id,
        registrationId: s.parentRegistrationId,
        isTestAccount: String(s.parentRegistrationId).startsWith("student-test-"),
        studentName: s.studentName ?? s.parentRegistration?.childName ?? "—",
        childName: s.parentRegistration?.childName ?? "—",
        childClass: s.parentRegistration?.childClass ?? "—",
        parentName: s.parentRegistration?.parentName ?? "—",
        parentEmail: s.parentRegistration?.parentEmail ?? "—",
        parentPhone: s.parentRegistration?.parentPhone ?? "—",
        classLevel: s.classLevel,
        markingStatus: s.markingStatus,
        score: s.score,
        total: s.total,
        answered,
        markedAt: s.markedAt,
        markedBy: s.markedBy,
        startedAt: s.startedAt,
        submittedAt: s.submittedAt,
        questions: s.questions,
        answers
      };
    });

    return res.json({ ok: true, results: rows });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/admin/student-mark — record a hand-marked score.
router.post("/student-mark", requireToken, async (req, res) => {
  try {
    const { sessionId, score, markedBy, reopen } = req.body;

    if (!sessionId) {
      return res.status(400).json({ ok: false, error: "sessionId is required" });
    }

    const session = await prisma.studentTestSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return res.status(404).json({ ok: false, error: "Session not found" });
    }

    // Send it back to the queue without a score.
    if (reopen) {
      const updated = await prisma.studentTestSession.update({
        where: { id: sessionId },
        data: { markingStatus: "PENDING", score: null, markedAt: null, markedBy: null }
      });
      return res.json({ ok: true, markingStatus: updated.markingStatus, score: updated.score });
    }

    const parsed = Number(score);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > session.total) {
      return res.status(400).json({
        ok: false,
        error: `score must be a whole number between 0 and ${session.total}`
      });
    }

    if (!session.submittedAt) {
      return res.status(409).json({ ok: false, error: "This paper has not been submitted yet" });
    }

    const updated = await prisma.studentTestSession.update({
      where: { id: sessionId },
      data: {
        score: parsed,
        markingStatus: "MARKED",
        markedAt: new Date(),
        markedBy: markedBy ? String(markedBy).trim() : null
      }
    });

    return res.json({
      ok: true,
      markingStatus: updated.markingStatus,
      score: updated.score,
      total: updated.total,
      markedAt: updated.markedAt,
      markedBy: updated.markedBy
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/admin/recreate
router.post("/recreate", requireToken, async (req, res) => {
  try {
    const { applicationId, questions, sessionName } = req.body;

    if (!applicationId) return res.status(400).json({ ok: false, error: "applicationId is required" });
    if (!Array.isArray(questions) || !questions.length) return res.status(400).json({ ok: false, error: "questions must be a non-empty array" });

    const application = await prisma.tutorApplication.findUnique({ where: { id: applicationId } });
    if (!application) return res.status(404).json({ ok: false, error: "Application not found" });

    await prisma.testSession.deleteMany({ where: { tutorApplicationId: applicationId, submittedAt: null } });

    const session = await prisma.testSession.create({
      data: { id: `${randomUUID()}_RECREATE`, tutorApplicationId: applicationId, testName: sessionName || application.fullName, questions, total: questions.length },
    });

    return res.json({ ok: true, sessionId: session.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
