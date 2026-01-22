import { Router } from "express";
import { createTutorLead, createParentLead } from "../controllers/leads.controller.js";

const router = Router();

router.post("/tutor", createTutorLead);
router.post("/parent", createParentLead);

export default router;
