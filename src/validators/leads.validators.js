import { sanitizeText, sanitizeEmail, sanitizePhone } from "../utils/sanitize.js";

function baseValidate(body) {
  const fullName = sanitizeText(body.fullName);
  const email = sanitizeEmail(body.email);
  const phone = sanitizePhone(body.phone);

  const errors = {};
  if (!fullName) errors.fullName = "Full name is required";
  if (!email) errors.email = "Valid email is required";

  return { fullName, email, phone, errors };
}

export function validateTutorLead(body) {
  const { fullName, email, phone, errors } = baseValidate(body);

  const location = sanitizeText(body.location);
  const subject = sanitizeText(body.subject);
  const availability = sanitizeText(body.availability);
  const message = sanitizeText(body.message);
  const isNYSC = body.isNYSC === true || body.isNYSC === "true";

  if (!phone) errors.phone = "Phone is required for tutors";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: { fullName, email, phone, location, subject, availability, message, isNYSC }
  };
}

export function validateParentLead(body) {
  const { fullName, email, phone, errors } = baseValidate(body);

  const location = sanitizeText(body.location);
  const subject = sanitizeText(body.subject);
  const studentYear = sanitizeText(body.studentYear);
  const goals = sanitizeText(body.goals);
  const message = sanitizeText(body.message);

  if (!phone) errors.phone = "Phone is required for parents";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    data: { fullName, email, phone, location, subject, studentYear, goals, message }
  };
}
