import { google } from "googleapis";
import { env } from "./env.js";

function getPrivateKey() {
  // Fix \n in env var
  return env.googlePrivateKey.replace(/\\n/g, "\n");
}

export function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: env.googleServiceAccountEmail,
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return google.sheets({ version: "v4", auth });
}
