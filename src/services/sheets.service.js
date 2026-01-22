import { env } from "../config/env.js";
import { getSheetsClient } from "../config/googleAuth.js";

function leadToRow(lead) {
  if (lead.type === "TUTOR") {
    return [
      new Date(lead.createdAt).toISOString(),
      lead.fullName,
      lead.email,
      lead.phone || "",
      lead.location || "",
      lead.subject || "",
      lead.availability || "",
      lead.isNYSC ? "Yes" : "No",
      lead.message || ""
    ];
  }

  return [
    new Date(lead.createdAt).toISOString(),
    lead.fullName,
    lead.email,
    lead.phone || "",
    lead.location || "",
    lead.subject || "",
    lead.studentYear || "",
    lead.goals || "",
    lead.message || ""
  ];
}

function getRangeForLeadType(type) {
  const tab = type === "TUTOR" ? env.tutorTab : env.parentTab;
  return `${tab}!A:Z`;
}

export async function appendLeadRow(lead) {
  const sheets = getSheetsClient();
  const range = getRangeForLeadType(lead.type);
  const values = [leadToRow(lead)];

  await sheets.spreadsheets.values.append({
    spreadsheetId: env.sheetsId,
    range,
    valueInputOption: "USER_ENTERED",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values }
  });
}
