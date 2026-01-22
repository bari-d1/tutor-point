import { Router } from "express";
import leadsRoutes from "./leads.routes.js";

const router = Router();

router.use("/leads", leadsRoutes);

export default router;
