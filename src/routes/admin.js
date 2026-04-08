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
