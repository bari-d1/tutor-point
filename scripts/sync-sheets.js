import "dotenv/config";
import { prisma } from "../src/db/prisma.js";
import { appendTutorApplication, appendParentRegistration } from "../src/services/googleSheets.js";
import { google } from "googleapis";
import { env } from "../src/config/env.js";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.googleServiceAccountEmail,
    private_key: env.googlePrivateKey.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

async function getSheetIds(tab) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: env.sheetsId,
    range: `${tab}!A2:A`, // column A = ID, skip header row
  });
  const rows = res.data.values ?? [];
  return new Set(rows.map((r) => r[0]).filter(Boolean));
}

async function sync() {
  const [tutorSheetIds, parentSheetIds, tutors, parents] = await Promise.all([
    getSheetIds(env.tutorTab),
    getSheetIds(env.parentTab),
    prisma.tutorApplication.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.parentRegistration.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const missedTutors = tutors.filter((t) => !tutorSheetIds.has(t.id));
  const missedParents = parents.filter((p) => !parentSheetIds.has(p.id));

  console.log(`Tutors   — DB: ${tutors.length}, Sheet: ${tutorSheetIds.size}, Missing: ${missedTutors.length}`);
  console.log(`Parents  — DB: ${parents.length}, Sheet: ${parentSheetIds.size}, Missing: ${missedParents.length}`);

  for (const t of missedTutors) {
    await appendTutorApplication(t);
    console.log(`Appended tutor: ${t.email}`);
  }

  for (const p of missedParents) {
    await appendParentRegistration(p);
    console.log(`Appended parent: ${p.parentEmail}`);
  }

  if (missedTutors.length === 0 && missedParents.length === 0) {
    console.log("Sheet is already up to date.");
  } else {
    console.log("Done.");
  }

  await prisma.$disconnect();
}

sync().catch((err) => {
  console.error(err);
  process.exit(1);
});
