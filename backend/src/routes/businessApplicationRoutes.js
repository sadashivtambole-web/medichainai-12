import express from "express";
import { verifyToken, requireRole } from "../../middleware.js";
import {
  approveApplication,
  rejectApplication,
  resendApplicationEmail,
  getApplications,
} from "../controllers/businessApplicationController.js";

const router = express.Router();

// All routes require authentication & Admin / Creator role
router.use(verifyToken, requireRole("Creator", "Admin"));

router.get("/", getApplications);
router.patch("/:id/approve", approveApplication);
router.patch("/:id/reject", rejectApplication);
router.post("/:id/resend-email", resendApplicationEmail);

export default router;
