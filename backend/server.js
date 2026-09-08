import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import routes from "./routes.js";
import { User } from "./models.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/fake_drug_detection";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5174";

// Uploads directory static serving
const UPLOADS_DIR = path.resolve("uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Security & Parsing Middlewares
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin: [FRONTEND_URL, "http://localhost:5174", "http://localhost:5173", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));
app.use("/uploads", express.static(UPLOADS_DIR));

// Health Check API
app.get("/api/health", (req, res) => {
  res.json({
    status: "HEALTHY",
    service: "Fake Drug Detection Engine API",
    version: "1.0.0",
    database: mongoose.connection.readyState === 1 ? "CONNECTED" : "DISCONNECTED",
    timestamp: new Date().toISOString(),
  });
});

// Mount Central API Routes
app.use("/api", routes);

// Global 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.url}`, code: "NOT_FOUND" });
});

// Global Exception Handler
app.use((err, req, res, next) => {
  console.error("Unhandled API Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error occurred",
    code: err.code || "INTERNAL_SERVER_ERROR",
  });
});

// Initialize & Sync Secure Creator Account from .env
async function initCreatorAccount() {
  try {
    const creatorEmail = (process.env.CREATOR_EMAIL || "sadashivtambole@gmail.com").toLowerCase().trim();
    const creatorPassword = process.env.CREATOR_PASSWORD || "Shiva@123";
    const creatorName = process.env.CREATOR_NAME || "Sadashiv Tambole (Creator)";

    let creator = await User.findOne({
      $or: [{ role: "Creator" }, { email: creatorEmail }],
    });

    if (!creator) {
      console.log("👑 Initializing secure Creator account in MongoDB...");
      creator = new User({
        name: creatorName,
        email: creatorEmail,
        password: creatorPassword, // Hashed automatically by pre-save hook
        role: "Creator",
        accountStatus: "APPROVED",
        company: "DrugChain Network Authority",
        companyCode: "CREATOR-ROOT-001",
      });
      await creator.save();
      console.log(`✅ Creator account initialized successfully: ${creatorEmail}`);
    } else {
      creator.name = creatorName;
      creator.email = creatorEmail;
      creator.role = "Creator";
      creator.accountStatus = "APPROVED";
      await creator.save();
      console.log(`✅ Creator account synchronized: ${creatorEmail}`);
    }
  } catch (err) {
    console.error("⚠️ Creator initialization notice:", err.message);
  }
}

// Start HTTP Server immediately
const server = app.listen(PORT, () => {
  console.log(`🚀 Fake Drug Detection Backend running on port ${PORT}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
});

// Asynchronously connect to MongoDB
mongoose
  .connect(MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.log(`✅ Connected to MongoDB at ${MONGO_URI}`);
    await initCreatorAccount();
  })
  .catch((err) => {
    console.error(`❌ MongoDB connection failure: ${err.message}`);
  });
