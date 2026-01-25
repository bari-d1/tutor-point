import express from "express";
import { prisma } from "../db/prisma.js";

const router = express.Router();

router.post("/apply", async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      location,
      education,
      experience,
      availability,
      hasTablet,
      why,
    } = req.body;

    // Basic validation
    const required = { fullName, email, phone, location, education, experience, availability, hasTablet, why };
    for (const [k, v] of Object.entries(required)) {
      if (v === undefined || v === null || String(v).trim() === "") {
        return res.status(400).json({ ok: false, error: `${k} is required` });
      }
    }

    // Word limit validation for "why" (max 500 words)
    const whyWordCount = String(why).trim().split(/\s+/).length;

    if (whyWordCount > 500) {
    return res.status(400).json({
        ok: false,
        error: "Why statement must be 500 words or fewer",
    });
    }


    // Convert "Yes"/"No" to boolean
    const hasTabletBool = String(hasTablet).toLowerCase() === "yes";

    // Optional: prevent duplicate applications by email
    const existing = await prisma.tutorApplication.findFirst({
      where: { email: String(email).toLowerCase() },
    });

    if (existing) {
      return res.status(409).json({
        ok: false,
        error: "An application with this email already exists.",
      });
    }

    const application = await prisma.tutorApplication.create({
      data: {
        fullName: String(fullName).trim(),
        email: String(email).trim().toLowerCase(),
        phone: String(phone).trim(),
        location: String(location).trim(),
        education: String(education).trim(),
        experience: String(experience).trim(),
        availability: String(availability).trim(),
        hasTablet: hasTabletBool,
        why: String(why).trim(),
      },
    });

    return res.status(201).json({ ok: true, applicationId: application.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

export default router;
