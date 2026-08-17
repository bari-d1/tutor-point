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
  SS2: { file: "ss2-mathematics.json", perSection: 4 },
  SS3: { file: "ss3-mathematics.json", perSection: 5 }
};

export const TEST_DURATION_MINUTES = 75;

/**
 * The signup form stores "SSS 2" / "SSS 3"; the question bank uses "SS2" / "SS3".
 * Accepts the common ways a class can be written and returns a bank key, or null
 * when we have no bank for that class (JSS, Primary, GCSE, unset).
 */
export function normalizeClassLevel(raw) {
  const s = String(raw ?? "").trim().toUpperCase().replace(/[\s_-]+/g, "");

  if (["SS2", "SSS2", "SENIORSECONDARY2", "YEAR11"].includes(s)) return "SS2";
  if (["SS3", "SSS3", "SENIORSECONDARY3", "YEAR12"].includes(s)) return "SS3";

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

  const { perSection } = CLASS_LEVELS[classLevel];
  const bank = loadBank(classLevel);

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
