import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { appendTutorApplication, appendParentRegistration } from "../src/services/googleSheets.js";

async function backfill() {
  const [tutors, parents] = await Promise.all([
    prisma.tutorApplication.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.parentRegistration.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  console.log(`Found ${tutors.length} tutor applications, ${parents.length} parent registrations`);

  for (const t of tutors) {
    await appendTutorApplication(t);
    console.log(`Synced tutor: ${t.email}`);
  }

  for (const p of parents) {
    await appendParentRegistration(p);
    console.log(`Synced parent: ${p.parentEmail}`);
  }

  console.log("Done.");
  await prisma.$disconnect();
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
