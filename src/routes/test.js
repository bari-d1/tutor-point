import express from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { prisma } from "../db/prisma.js";

const UNITS = /\b(cm|cm²|cm³|m|km|g|kg|ml|l|litre|litres|liter|liters|mm|km\/h|m\/s|days?|hours?|hrs?|minutes?|mins?|seconds?|secs?|years?|yrs?|months?|weeks?|%|percent|dollars?|\$|euros?|pounds?|naira|°|degrees?)\b/gi;

function stripUnits(s) {
  return s.replace(UNITS, "").replace(/\s+/g, " ").trim();
}

function extractNumber(s) {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return isNaN(n) ? null : n;
}

function parseRange(correct) {
  const m = correct.match(/\(?\s*([\d.\-]+)\s+to\s+([\d.\-]+)\s*\)?/i);
  if (m) return { lo: parseFloat(m[1]), hi: parseFloat(m[2]) };
  return null;
}

// Safely evaluates simple math expressions — only allows: digits, operators, sqrt(), pi, spaces
function safeEval(expr) {
  try {
    const sanitized = expr
      .replace(/sqrt\(([0-9.]+)\)/gi, (_, n) => Math.sqrt(parseFloat(n)))
      .replace(/pi/gi, Math.PI)
      .replace(/[^0-9+\-*/^(). ]/g, "");
    // only proceed if nothing suspicious remains
    if (/[a-zA-Z]/.test(sanitized)) return null;
    const result = Function(`"use strict"; return (${sanitized})`)();
    return typeof result === "number" && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

function matchFreeAnswer(submitted, correct) {
  const s = submitted.trim().toLowerCase();
  const c = correct.trim().toLowerCase();

  if (s === c) return true;

  const sStripped = stripUnits(s);
  const cStripped = stripUnits(c);
  if (sStripped === cStripped) return true;

  const sNum = extractNumber(sStripped);
  const cNum = extractNumber(cStripped);

  if (sNum !== null && cNum !== null && sNum === cNum) return true;

  // Evaluate math expressions (e.g. sqrt(180) → 13.416...)
  const sEvaled = safeEval(sStripped) ?? safeEval(s);

  if (sEvaled !== null) {
    if (cNum !== null && Math.abs(sEvaled - cNum) < 0.01) return true;

    const range = parseRange(c);
    if (range && sEvaled >= range.lo && sEvaled <= range.hi) return true;

    const primaryNum = extractNumber(stripUnits(c.split("(")[0]));
    if (primaryNum !== null && Math.abs(sEvaled - primaryNum) < 0.01) return true;
  }

  if (sNum !== null) {
    const range = parseRange(c);
    if (range && sNum >= range.lo && sNum <= range.hi) return true;

    const primaryNum = extractNumber(stripUnits(c.split("(")[0]));
    if (primaryNum !== null && sNum === primaryNum) return true;
  }

  return false;
}


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

    if (!isTestUser) {
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
    }

    const selected = loadQuestions();

    const session = await prisma.testSession.create({
      data: {
        tutorApplicationId: applicationId,
        testName: String(name).trim(),
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
    const expired = elapsed > 75 * 60 * 1000;

    const questions = session.questions;
    const total = questions.length;
    let score = 0;

    for (const q of questions) {
      const submitted = String(answers[q.id] ?? "").trim().toLowerCase();
      if (!submitted) continue; // unanswered — no score

      if (q.correct) {
        if (submitted === q.correct.toLowerCase()) score++;
      } else if (q.answer) {
        if (matchFreeAnswer(submitted, String(q.answer))) score++;
      }
    }

    const percentage = Math.round((score / total) * 100);
    const passed = percentage >= 60;

    await prisma.testSession.update({
      where: { id: session_id },
      data: { answers, score, total, submittedAt: new Date() },
    });

    return res.json({ ok: true, score, total, percentage, passed, expired });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
