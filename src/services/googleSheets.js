import { google } from "googleapis";
import { env } from "../config/env.js";

const auth = new google.auth.GoogleAuth({
  credentials: {
    client_email: env.googleServiceAccountEmail,
    private_key: env.googlePrivateKey.replace(/\\n/g, "\n"),
  },
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

export async function appendTutorApplication(application) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: env.sheetsId,
    range: `${env.tutorTab}!A:Z`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        application.id,
        application.fullName,
        application.email,
        application.phone,
        application.location,
        application.education,
        application.experience,
        application.availability,
        application.hasTablet ? "Yes" : "No",
        application.why,
        application.createdAt.toISOString(),
      ]],
    },
  });
}

export async function appendParentRegistration(parent) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: env.sheetsId,
    range: `${env.parentTab}!A:Z`,
    valueInputOption: "RAW",
    requestBody: {
      values: [[
        parent.id,
        parent.parentName,
        parent.parentEmail,
        parent.parentPhone,
        parent.location,
        parent.childName,
        parent.childClass,
        parent.examType ?? "",
        parent.support ?? "",
        parent.createdAt.toISOString(),
      ]],
    },
  });
}
