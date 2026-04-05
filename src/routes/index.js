import { Router } from "express";
import tutorsRouter from "./tutor.js";
import parentRouter from "./parents.js";
import testRouter from "./test.js";
import adminRouter from "./admin.js";

const router = Router();

router.use("/tutors", tutorsRouter);
router.use("/parents", parentRouter);
router.use("/tutors/test", testRouter);
router.use("/admin", adminRouter);

export default router;
