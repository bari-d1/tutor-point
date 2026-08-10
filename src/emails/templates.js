const BRAND_BLACK = "#2A2A2A";
const BRAND_YELLOW = "#FFEB3C";
const BG_PALE = "#FEFBDD";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function firstName(fullName) {
  return String(fullName ?? "").trim().split(/\s+/)[0] || "there";
}

/**
 * Wraps body content in a table-based shell that renders consistently
 * across email clients (no external CSS, inline styles only).
 */
function layout({ heading, bodyHtml, siteUrl }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_PALE};font-family:Helvetica,Arial,sans-serif;color:${BRAND_BLACK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BG_PALE};padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:${BRAND_BLACK};padding:20px 28px;">
              <span style="color:${BRAND_YELLOW};font-size:20px;font-weight:bold;letter-spacing:0.5px;">TutorPoint</span>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:${BRAND_BLACK};">${escapeHtml(heading)}</h1>
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#6b6b6b;">
                You received this email because you signed up on
                <a href="${escapeHtml(siteUrl)}" style="color:${BRAND_BLACK};">TutorPoint</a>.
                If this wasn't you, please ignore this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function paragraph(text) {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${BRAND_BLACK};">${text}</p>`;
}

function detailsTable(rows) {
  const cells = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:6px 12px 6px 0;font-size:14px;color:#6b6b6b;vertical-align:top;">${escapeHtml(label)}</td>
          <td style="padding:6px 0;font-size:14px;color:${BRAND_BLACK};">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 18px;background-color:${BG_PALE};border-radius:12px;padding:12px 16px;width:100%;">${cells}</table>`;
}

export function parentWelcomeEmail({ parent, siteUrl }) {
  const name = firstName(parent.parentName);

  const bodyHtml = [
    paragraph(`Hi ${escapeHtml(name)}, thanks for registering ${escapeHtml(parent.childName)} for the TutorPoint maths bootcamp.`),
    paragraph("Here's what we have on file:"),
    detailsTable([
      ["Parent", parent.parentName],
      ["Child", parent.childName],
      ["Class", parent.childClass],
      ["Exam", parent.examType],
      ["Location", parent.location],
      ["Phone", parent.parentPhone]
    ]),
    paragraph("<strong>What happens next</strong>"),
    paragraph(
      "1. We'll reach out to you if your child is selected for this free cohort as limited spaces are available.on WhatsApp or by phone to confirm your preferred lesson times.<br />" +
        "2. Your child takes a short maths assessment so we know exactly where to start.<br />" +
        "3. Targeted online lessons begin, then we re-test after two weeks to measure progress."
    ),
    paragraph("If any of the details above look wrong, just reply to this email and we'll fix them.")
  ].join("");

  const text = [
    `Hi ${name},`,
    "",
    `Thanks for registering ${parent.childName} for the TutorPoint maths bootcamp.`,
    "",
    "Details we have on file:",
    `- Parent: ${parent.parentName}`,
    `- Child: ${parent.childName}`,
    `- Class: ${parent.childClass}`,
    parent.examType ? `- Exam: ${parent.examType}` : null,
    `- Location: ${parent.location}`,
    `- Phone: ${parent.parentPhone}`,
    "",
    "What happens next:",
    "1. We'll reach out on WhatsApp or by phone to confirm your preferred lesson times.",
    "2. Your child takes a short maths assessment so we know where to start.",
    "3. Targeted online lessons begin, then we re-test after two weeks to measure progress.",
    "",
    "If any details look wrong, reply to this email and we'll fix them.",
    "",
    "— TutorPoint"
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    subject: "You're registered — welcome to TutorPoint",
    html: layout({ heading: "Registration received", bodyHtml, siteUrl }),
    text
  };
}

export function tutorWelcomeEmail({ application, siteUrl }) {
  const name = firstName(application.fullName);

  const bodyHtml = [
    paragraph(`Hi ${escapeHtml(name)}, thanks for applying to tutor with TutorPoint. We've received your application.`),
    paragraph("Here's what we have on file:"),
    detailsTable([
      ["Name", application.fullName],
      ["Email", application.email],
      ["Phone", application.phone],
      ["Location", application.location],
      ["Availability", application.availability],
      ["Has a tablet", application.hasTablet ? "Yes" : "No"]
    ]),
    paragraph("<strong>What happens next</strong>"),
    paragraph(
      "1. Our team reviews your application.<br />" +
        "2. If you're shortlisted, we'll email you a link and password for the TutorPoint maths assessment.<br />" +
        "3. Pass the assessment and we'll set you up with your first students."
    ),
    paragraph("Keep an eye on this inbox — the assessment link comes to this address. If any details above look wrong, just reply and we'll update them.")
  ].join("");

  const text = [
    `Hi ${name},`,
    "",
    "Thanks for applying to tutor with TutorPoint. We've received your application.",
    "",
    "Details we have on file:",
    `- Name: ${application.fullName}`,
    `- Email: ${application.email}`,
    `- Phone: ${application.phone}`,
    `- Location: ${application.location}`,
    `- Availability: ${application.availability}`,
    `- Has a tablet: ${application.hasTablet ? "Yes" : "No"}`,
    "",
    "What happens next:",
    "1. Our team reviews your application.",
    "2. If you're shortlisted, we'll email you a link and password for the TutorPoint maths assessment.",
    "3. Pass the assessment and we'll set you up with your first students.",
    "",
    "Keep an eye on this inbox — the assessment link comes to this address.",
    "",
    "— TutorPoint"
  ].join("\n");

  return {
    subject: "We've received your TutorPoint tutor application",
    html: layout({ heading: "Application received", bodyHtml, siteUrl }),
    text
  };
}
