import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { validateEnv } from "./config/env.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import testerRoutes from "./routes/testerRoutes.js";
import receptionistRoutes from "./routes/receptionistRoutes.js";
import sheadRoutes from "./routes/sheadRoutes.js";
import equipmentRoutes from "./routes/equipmentRoutes.js";
import materialTestRoutes from "./routes/materialTest.js";
import rorRoutes from "./routes/ror.js";
import proformaRoutes from './routes/proforma.js';

// Validate environment variables
validateEnv();

// Add this near the top after dotenv.config()
if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
  console.warn("⚠️ Email credentials not found in environment variables");
  console.log("Available env vars:", Object.keys(process.env));
} else {
  console.log("📧 Email configuration found:", {
    user: process.env.EMAIL_USER,
    hasPassword: !!process.env.EMAIL_APP_PASSWORD,
    passwordLength: process.env.EMAIL_APP_PASSWORD.length,
  });
}

// Log Novu key for debugging
console.log('NOVU_SECRET_KEY in server.js:', process.env.NOVU_SECRET_KEY ? 'Key exists' : 'Key missing');

// const PORT = process.env.PORT || 5000;

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tester", testerRoutes);
app.use("/api/receptionist", receptionistRoutes);
app.use("/api/sectionhead", sheadRoutes);
app.use("/api/equipment", equipmentRoutes);
app.use("/api/material-test", materialTestRoutes);
app.use("/api/ror", rorRoutes);
app.use('/api/proforma', proformaRoutes);

// Basic home route
app.get("/", (req, res) => {
  res.send("hello");
});

// Test route
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working!" });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    ok: false,
    error: err.message || "Something broke!",
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.DATABASE_URL)
  .then(() => {
    console.log("Connected to MongoDB successfully");
    
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });
