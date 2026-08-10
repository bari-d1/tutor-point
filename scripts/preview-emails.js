/**
 * Renders the signup emails to HTML files you can open in a browser.
 * No API key needed and nothing is sent — this only renders templates.
 *
 *   npm run email:preview          # write files + open them
 *   npm run email:preview -- --no-open
 */
import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import { env } from "../src/config/env.js";
import { parentWelcomeEmail, tutorWelcomeEmail } from "../src/emails/templates.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", ".email-previews");

// Representative sample data — mirrors what the signup forms submit.
const sampleParent = {
  parentName: "Amaka Okafor",
  parentEmail: "amaka@example.com",
  parentPhone: "0803 123 4567",
  location: "Lekki, Lagos",
  childName: "Chidi",
  childClass: "JSS 2",
  examType: "WAEC",
  support: "Struggling with algebra"
};

const sampleTutor = {
  fullName: "Tunde Bello",
  email: "tunde@example.com",
  phone: "0807 765 4321",
  location: "Abuja",
  education: "BSc Mathematics, University of Ibadan",
  experience: "3 years teaching JSS and SSS maths",
  availability: "Weekday evenings, Saturday mornings",
  hasTablet: true,
  why: "I want to help more students enjoy maths."
};

async function main() {
  const shouldOpen = !process.argv.includes("--no-open");

  const parent = parentWelcomeEmail({ parent: sampleParent, siteUrl: env.siteUrl });
  const tutor = tutorWelcomeEmail({ application: sampleTutor, siteUrl: env.siteUrl });

  await fs.mkdir(outDir, { recursive: true });

  const files = [
    ["parent-welcome.html", parent.html],
    ["parent-welcome.txt", parent.text],
    ["tutor-welcome.html", tutor.html],
    ["tutor-welcome.txt", tutor.text]
  ];

  for (const [name, content] of files) {
    await fs.writeFile(path.join(outDir, name), content, "utf8");
  }

  console.log(`From:     ${env.emailFrom}`);
  console.log(`Reply-To: ${env.emailReplyTo || "(none)"}`);
  console.log("");
  console.log(`Parent  — ${parent.subject}`);
  console.log(`Tutor   — ${tutor.subject}`);
  console.log("");
  console.log("Written to .email-previews/:");
  for (const [name] of files) console.log(`  ${name}`);

  if (shouldOpen && process.platform === "darwin") {
    exec(`open "${path.join(outDir, "parent-welcome.html")}" "${path.join(outDir, "tutor-welcome.html")}"`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
