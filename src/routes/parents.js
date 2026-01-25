import express from "express";
import { prisma } from "../db/prisma.js";

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const {
      parentName,
      parentEmail,
      parentPhone,
      location,
      childName,
      childClass,
      examType,
      support,
    } = req.body;

    // required fields
    const required = {
      parentName,
      parentEmail,
      parentPhone,
      location,
      childName,
      childClass,
    };

    for (const [k, v] of Object.entries(required)) {
      if (v === undefined || v === null || String(v).trim() === "") {
        return res.status(400).json({ ok: false, error: `${k} is required` });
      }
    }

    const email = String(parentEmail).trim().toLowerCase();

    const parent = await prisma.parentRegistration.create({
      data: {
        parentName: String(parentName).trim(),
        parentEmail: email,
        parentPhone: String(parentPhone).trim(),
        location: String(location).trim(),
        childName: String(childName).trim(),
        childClass: String(childClass).trim(),
        examType: examType ? String(examType).trim() : null,
        support: support ? String(support).trim() : null,
      },
    });

    return res.status(201).json({ ok: true, parentId: parent.id, redirectTo: "/"});
  } catch (err) {
    if (err?.code === "P2002") {
      return res.status(409).json({
        ok: false,
        error: "A registration with this email already exists.",
      });
    }

    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
