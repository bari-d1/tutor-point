import { Router } from "express";
import tutorsRouter from "./tutor.js";
import parentRouter from "./parents.js";

const router = Router();

router.use("/tutors", tutorsRouter);
router.use("/parents", parentRouter);

export default router;
