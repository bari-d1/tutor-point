/**
 * Generates a CSV of student test links, one row per parent registration.
 *
 *   npm run student:links                       # all registrations
 *   npm run student:links -- --supported        # only classes that have a bank
 *   npm run student:links -- --base https://www.tutorpoint.ng
 *
 * Writes to student-test-links.csv in the project root.
 */
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../src/db/prisma.js";
import { env } from "../src/config/env.js";
import { normalizeClassLevel } from "../src/services/studentQuestions.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outFile = path.join(__dirname, "..", "student-test-links.csv");

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

/** Quotes a CSV field only when it needs it, and escapes embedded quotes. */
function csvField(value) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const baseUrl = arg("--base", env.siteUrl).replace(/\/$/, "");
  const supportedOnly = process.argv.includes("--supported");

  const registrations = await prisma.parentRegistration.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      studentTestSessions: {
        select: { submittedAt: true, markingStatus: true },
        orderBy: { startedAt: "desc" }
      }
    }
  });

  const rows = [];
  const skipped = [];

  for (const r of registrations) {
    const classLevel = normalizeClassLevel(r.childClass);

    if (supportedOnly && !classLevel) {
      skipped.push(`${r.childName} (${r.childClass || "no class"})`);
      continue;
    }

    const latest = r.studentTestSessions[0];
    const status = !latest
      ? "NOT STARTED"
      : latest.submittedAt
        ? `SUBMITTED — ${latest.markingStatus}`
        : "IN PROGRESS";

    rows.push([
      r.childName,
      r.childClass,
      classLevel ?? "NO BANK",
      r.parentName,
      r.parentEmail,
      r.parentPhone,
      classLevel ? `${baseUrl}/student-test.html?registration_id=${r.id}` : "",
      status
    ]);
  }

  const header = [
    "Student Name",
    "Class",
    "Test Level",
    "Parent Name",
    "Parent Email",
    "Parent Phone",
    "Test Link",
    "Status"
  ];

  const csv = [header, ...rows].map((row) => row.map(csvField).join(",")).join("\n") + "\n";
  await fs.writeFile(outFile, csv, "utf8");

  const withLink = rows.filter((r) => r[6]).length;
  console.log(`Registrations found: ${registrations.length}`);
  console.log(`Rows written:        ${rows.length}`);
  console.log(`With a test link:    ${withLink}`);
  console.log(`No bank for class:   ${rows.length - withLink}`);
  if (skipped.length) console.log(`Skipped (--supported): ${skipped.length}`);
  console.log(`\nWritten to ${outFile}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
