/**
 * Recreate a test session from a JSON file of questions.
 *
 * Usage:
 *   node scripts/local/recreate-test.js <application_id> <questions.json>
 *
 * Example:
 *   node scripts/local/recreate-test.js test-dev-entry-001 scripts/local/my-questions.json
 *
 * The JSON file should be an array of question objects, e.g.:
 * [
 *   {
 *     "id": "WAEC_2019_16",
 *     "source": "WAEC",
 *     "question": "What is 2 + 2?",
 *     "optionA": "3", "optionB": "4", "optionC": "5", "optionD": "6",
 *     "correct": "B",
 *     "topic": "Arithmetic"
 *   }
 * ]
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const [,, applicationId, questionsFile] = process.argv;

if (!applicationId || !questionsFile) {
  console.error("Usage: node scripts/local/recreate-test.js <application_id> <questions.json>");
  process.exit(1);
}

const questions = JSON.parse(readFileSync(questionsFile, "utf8"));

if (!Array.isArray(questions) || questions.length === 0) {
  console.error("questions.json must be a non-empty array");
  process.exit(1);
}

const application = await prisma.tutorApplication.findUnique({
  where: { id: applicationId },
});

if (!application) {
  console.error(`No application found with id: ${applicationId}`);
  process.exit(1);
}

// Delete any existing unsubmitted sessions for this application
const deleted = await prisma.testSession.deleteMany({
  where: { tutorApplicationId: applicationId, submittedAt: null },
});

if (deleted.count > 0) {
  console.log(`Deleted ${deleted.count} existing unsubmitted session(s)`);
}

const session = await prisma.testSession.create({
  data: {
    tutorApplicationId: applicationId,
    testName: application.testName ?? application.fullName,
    questions,
    total: questions.length,
  },
});

await prisma.$disconnect();

console.log(`\nTest session created!`);
console.log(`Session ID : ${session.id}`);
console.log(`Questions  : ${questions.length}`);
console.log(`\nTest URL:`);
console.log(`http://localhost:3000/test.html?tutor_application_id=${applicationId}`);
