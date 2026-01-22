import { createLead } from "../services/leads.service.js";
import { validateTutorLead, validateParentLead } from "../validators/leads.validators.js";
import { LEAD_TYPES } from "../config/constants.js";

export async function createTutorLead(req, res) {
  const { ok, data, errors } = validateTutorLead(req.body);
  if (!ok) return res.status(400).json({ ok: false, errors });

  try {
    const lead = await createLead({
      type: LEAD_TYPES.TUTOR,
      data
    });

    return res.status(201).json({ ok: true, leadId: lead.id });
  } catch {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}

export async function createParentLead(req, res) {
  const { ok, data, errors } = validateParentLead(req.body);
  if (!ok) return res.status(400).json({ ok: false, errors });

  try {
    const lead = await createLead({
      type: LEAD_TYPES.PARENT,
      data
    });

    return res.status(201).json({ ok: true, leadId: lead.id });
  } catch {
    return res.status(500).json({ ok: false, message: "Server error" });
  }
}
