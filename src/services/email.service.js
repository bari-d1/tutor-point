import { getResendClient, isEmailEnabled } from "../config/resend.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { parentWelcomeEmail, tutorWelcomeEmail } from "../emails/templates.js";

async function send({ to, subject, html, text }) {
  if (!isEmailEnabled()) {
    logger.warn("Email skipped (RESEND_API_KEY not set):", subject, "->", to);
    return null;
  }

  const resend = getResendClient();

  const { data, error } = await resend.emails.send({
    from: env.emailFrom,
    to: [to],
    subject,
    html,
    text,
    ...(env.emailReplyTo ? { replyTo: env.emailReplyTo } : {})
  });

  // The SDK returns errors in the payload rather than throwing.
  if (error) {
    throw new Error(error.message || JSON.stringify(error));
  }

  logger.info("Email sent:", subject, "->", to, data?.id ? `(${data.id})` : "");
  return data;
}

export async function sendParentWelcomeEmail(parent) {
  const { subject, html, text } = parentWelcomeEmail({ parent, siteUrl: env.siteUrl });
  return send({ to: parent.parentEmail, subject, html, text });
}

export async function sendTutorWelcomeEmail(application) {
  const { subject, html, text } = tutorWelcomeEmail({ application, siteUrl: env.siteUrl });
  return send({ to: application.email, subject, html, text });
}
