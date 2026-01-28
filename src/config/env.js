import dotenv from "dotenv";

dotenv.config();

function required(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: (process.env.NODE_ENV || "development") === "production",
  port: Number(process.env.PORT || 3000),

  databaseUrl: required("DATABASE_URL"),

  // sheetsId: required("GOOGLE_SHEETS_ID"),
  // tutorTab: process.env.TUTOR_SHEET_TAB_NAME || "Tutors",
  // parentTab: process.env.PARENT_SHEET_TAB_NAME || "Parents",

  // googleServiceAccountEmail: required("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
  // googlePrivateKey: required("GOOGLE_PRIVATE_KEY")
};
