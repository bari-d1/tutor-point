/**
 * Creates (or refreshes) the SS2 and SS3 student test accounts and prints their links.
 *
 *   npm run student:test-accounts
 *   npm run student:test-accounts -- --base https://www.tutorpoint.ng
 *   npm run student:test-accounts -- --clean     # also delete their past sittings
 *
 * Their ids start with "student-test-", which the /api/students routes treat as dev
 * accounts: unlimited re-sits, and a freshly drawn paper every time.
 */
import "dotenv/config";
import { prisma } from "../../src/db/prisma.js";
import { env } from "../../src/config/env.js";

const ACCOUNTS = [
  {
    id: "student-test-ss2",
    childName: "SS2 Test Student",
    childClass: "SSS 2",
    parentName: "TutorPoint QA",
    parentEmail: "qa+ss2@tutorpoint.ng"
  },
  {
    id: "student-test-ss3",
    childName: "SS3 Test Student",
    childClass: "SSS 3",
    parentName: "TutorPoint QA",
    parentEmail: "qa+ss3@tutorpoint.ng"
  },
  {
    id: "student-test-y10",
    childName: "Y10 Test Student",
    childClass: "Year 10",
    parentName: "TutorPoint QA",
    parentEmail: "qa+y10@tutorpoint.ng"
  }
];

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function main() {
  const baseUrl = arg("--base", env.siteUrl).replace(/\/$/, "");
  const clean = process.argv.includes("--clean");

  for (const a of ACCOUNTS) {
    await prisma.parentRegistration.upsert({
      where: { id: a.id },
      update: { childName: a.childName, childClass: a.childClass },
      create: {
        id: a.id,
        parentName: a.parentName,
        parentEmail: a.parentEmail,
        parentPhone: "00000000000",
        location: "Test",
        childName: a.childName,
        childClass: a.childClass
      }
    });
  }

  if (clean) {
    const del = await prisma.studentTestSession.deleteMany({
      where: { parentRegistrationId: { in: ACCOUNTS.map((a) => a.id) } }
    });
    console.log(`Deleted ${del.count} previous test sitting(s).\n`);
  }

  console.log("Student test accounts ready — password is TEST_PASSWORD from .env\n");

  for (const a of ACCOUNTS) {
    const sittings = await prisma.studentTestSession.count({
      where: { parentRegistrationId: a.id }
    });
    console.log(`${a.childClass}  (${a.childName})`);
    console.log(`  ${baseUrl}/student-test.html?registration_id=${a.id}`);
    console.log(`  past sittings on record: ${sittings}\n`);
  }

  console.log("These accounts allow unlimited re-sits and draw a new paper each time.");
  console.log("Their submissions DO land in the marking queue — run with --clean to clear them.");

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
