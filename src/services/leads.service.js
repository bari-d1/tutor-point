import { prisma } from "../config/prisma.js";
import { syncLeadToSheets } from "./sync.service.js";
import { LEAD_TYPES } from "../config/constants.js";

export async function createLead({ type, data }) {
  if (!Object.values(LEAD_TYPES).includes(type)) {
    throw new Error("Invalid lead type");
  }

  const lead = await prisma.lead.create({
    data: {
      type,
      ...data
    }
  });

  syncLeadToSheets(lead).catch(() => {});

  return lead;
}
