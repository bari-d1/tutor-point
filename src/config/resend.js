import { Resend } from "resend";
import { env } from "./env.js";

let client = null;

export function isEmailEnabled() {
  return Boolean(env.resendApiKey);
}

export function getResendClient() {
  if (!isEmailEnabled()) {
    throw new Error("RESEND_API_KEY is not set");
  }

  if (!client) {
    client = new Resend(env.resendApiKey);
  }

  return client;
}
