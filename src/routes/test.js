import express from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { prisma } from "../db/prisma.js";


const router = express.Router();

const __dirname = dirname(fileURLToPath(import.meta.url));
const extractedDir = join(__dirname, "../../tutor-questions/extracted");

function loadAndSample(source, n) {
  const data = JSON.parse(
    readFileSync(join(extractedDir, `${source}_extracted.json`), "utf8")
  );
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [data[i], data[j]] = [data[j], data[i]];
  }
  return data.slice(0, n);
}

function loadQuestions() {
  return [
    ...loadAndSample("waec", 10),
    ...loadAndSample("jamb", 10),
    ...loadAndSample("neco", 10),
    ...loadAndSample("igcse", 10),
  ];
}

// POST /api/tutors/test/start/:applicationId
router.post("/start/:applicationId", async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { name, password } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ ok: false, error: "Name is required" });
    }

    if (!password || !String(password).trim()) {
      return res.status(400).json({ ok: false, error: "Password is required" });
    }

    const testPassword = process.env.TEST_PASSWORD;
    if (!testPassword) {
      return res.status(500).json({ ok: false, error: "Test password not configured" });
    }

    if (String(password).trim().toLowerCase() !== testPassword.toLowerCase()) {
      return res.status(401).json({ ok: false, error: "Incorrect password" });
    }

    const application = await prisma.tutorApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return res.status(404).json({ ok: false, error: "Application not found", redirect404: true });
    }

    await prisma.tutorApplication.update({
      where: { id: applicationId },
      data: { testName: String(name).trim() },
    });

    const TEST_USER_ID = "test-dev-entry-001";
    const isTestUser = applicationId === TEST_USER_ID;

    // Block if already submitted (unless test user)
    if (!isTestUser) {
      const submitted = await prisma.testSession.findFirst({
        where: { tutorApplicationId: applicationId, submittedAt: { not: null } },
      });
      if (submitted) {
        return res.status(409).json({ ok: false, error: "You have already completed this test." });
      }
    }

    const existing = await prisma.testSession.findFirst({
      where: { tutorApplicationId: applicationId, submittedAt: null },
    });

    if (existing) {
      const { questions } = existing;
      return res.json({
        ok: true,
        sessionId: existing.id,
        questions: questions.map(({ correct, answer, ...q }) => q),
      });
    }

    const selected = loadQuestions();

    const session = await prisma.testSession.create({
      data: {
        tutorApplicationId: applicationId,
        questions: selected,
        total: selected.length,
      },
    });

    return res.status(201).json({
      ok: true,
      sessionId: session.id,
      questions: selected.map(({ correct, answer, ...q }) => q),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/tutors/test/submit
router.post("/submit", async (req, res) => {
  try {
    const { session_id, answers } = req.body;

    if (!session_id) {
      return res.status(400).json({ ok: false, error: "session_id is required" });
    }

    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return res.status(400).json({ ok: false, error: "answers must be an object" });
    }

    const session = await prisma.testSession.findUnique({
      where: { id: session_id },
    });

    if (!session) {
      return res.status(404).json({ ok: false, error: "Session not found" });
    }

    if (session.submittedAt) {
      return res.status(409).json({ ok: false, error: "Test already submitted" });
    }

    const elapsed = Date.now() - new Date(session.startedAt).getTime();
    if (elapsed > 75 * 60 * 1000) {
      return res.status(410).json({ ok: false, error: "Session expired — 75 minute limit exceeded" });
    }

    const questions = session.questions;
    const total = questions.length;
    let score = 0;

    for (const q of questions) {
      const submitted = String(answers[q.id] ?? "").trim().toLowerCase();
      if (!submitted) continue; // unanswered — no score

      if (q.correct) {
        // MCQ — exact letter match
        if (submitted === q.correct.toLowerCase()) score++;
      } else if (q.answer) {
        // Free answer — case-insensitive trimmed string match
        if (submitted === String(q.answer).trim().toLowerCase()) score++;
      }
    }

    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= 60;

    await prisma.testSession.update({
      where: { id: session_id },
      data: { answers, score, total, submittedAt: new Date() },
    });

    return res.json({ ok: true, score, total, percentage, passed });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
