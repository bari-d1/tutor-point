import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const questionsDir = join(__dirname, "../../student-questions");

/**
 * How many questions to draw from each section, per class level.
 * Sampling per section (rather than at random across the whole bank) keeps every
 * sitting representative of the syllabus instead of clustering on one topic.
 */
export const CLASS_LEVELS = {
  SS2: { file: "ss2-mathematics.json", perSection: 4, durationMinutes: 75 },
  SS3: { file: "ss3-mathematics.json", perSection: 5, durationMinutes: 75 },
  // A real past paper — served whole and in order rather than sampled.
  Y10: { file: "y10-mathematics.json", wholePaper: true, durationMinutes: 60 }
};

export const TEST_DURATION_MINUTES = 75;

export function getDurationMinutes(classLevel) {
  return CLASS_LEVELS[classLevel]?.durationMinutes ?? TEST_DURATION_MINUTES;
}

/**
 * The signup form stores "SSS 2" / "SSS 3"; the question bank uses "SS2" / "SS3".
 * Accepts the common ways a class can be written and returns a bank key, or null
 * when we have no bank for that class (JSS, Primary, GCSE, unset).
 */
export function normalizeClassLevel(raw) {
  const s = String(raw ?? "").trim().toUpperCase().replace(/[\s_-]+/g, "");

  if (["SS2", "SSS2", "SENIORSECONDARY2"].includes(s)) return "SS2";
  if (["SS3", "SSS3", "SENIORSECONDARY3"].includes(s)) return "SS3";
  // SS1 sits the Y10 paper — same stage of the syllabus.
  if (["SS1", "SSS1", "SENIORSECONDARY1", "Y10", "YEAR10", "4THYEAR", "FOURTHYEAR", "GCSE"].includes(s)) {
    return "Y10";
  }

  return null;
}

export function isSupportedClassLevel(raw) {
  return normalizeClassLevel(raw) !== null;
}

let cache = {};

function loadBank(classLevel) {
  if (!cache[classLevel]) {
    const { file } = CLASS_LEVELS[classLevel];
    cache[classLevel] = JSON.parse(readFileSync(join(questionsDir, file), "utf8"));
  }
  return cache[classLevel];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Builds one paper: `perSection` random questions from every section, ordered by
 * section so the paper reads like the printed sheet. Sections holding fewer than
 * `perSection` questions simply contribute all of theirs.
 */
export function buildStudentPaper(rawClassLevel) {
  const classLevel = normalizeClassLevel(rawClassLevel);
  if (!classLevel) {
    throw new Error(`No question bank for class: ${rawClassLevel}`);
  }

  const { perSection, wholePaper } = CLASS_LEVELS[classLevel];
  const bank = loadBank(classLevel);

  // A past paper is sat as printed: every question, in order.
  if (wholePaper) {
    return bank.map((q, i) => ({ ...q, sourceNumber: q.sourceNumber ?? q.number, number: i + 1 }));
  }

  const sections = [];
  const bySection = new Map();
  for (const q of bank) {
    if (!bySection.has(q.section)) {
      bySection.set(q.section, []);
      sections.push(q.section);
    }
    bySection.get(q.section).push(q);
  }

  const paper = [];
  for (const section of sections) {
    paper.push(...shuffle(bySection.get(section)).slice(0, perSection));
  }

  // Renumber 1..n for display; keep the original sheet number as sourceNumber.
  return paper.map((q, i) => ({ ...q, sourceNumber: q.number, number: i + 1 }));
}

/** Strips the answer key before questions are sent to the browser. */
export function stripAnswers(questions) {
  return questions.map(({ answer, ...rest }) => rest);
}
