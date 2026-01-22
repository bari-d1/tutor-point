import { prisma } from "../config/prisma.js";
import { appendLeadRow } from "./sheets.service.js";
import { SHEET_SYNC_STATUS } from "../config/constants.js";

export async function syncLeadToSheets(lead) {
  try {
    await appendLeadRow(lead);

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        sheetSyncStatus: SHEET_SYNC_STATUS.SUCCESS,
        sheetSyncedAt: new Date(),
        sheetLastError: null
      }
    });
  } catch (err) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        sheetSyncStatus: SHEET_SYNC_STATUS.FAILED,
        sheetLastError: String(err?.message || err)
      }
    });

    throw err;
  }
}
