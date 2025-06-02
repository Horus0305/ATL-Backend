// import materialTestRoutes from './routes/materialTest.js';

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { connectToDatabase } from "./utils/db.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import testerRoutes from "./routes/testerRoutes.js";
import receptionistRoutes from "./routes/receptionistRoutes.js";
import sheadRoutes from "./routes/sheadRoutes.js";
import equipmentRoutes from "./routes/equipmentRoutes.js";
import materialTestRoutes from "./routes/materialTest.js";
import rorRoutes from "./routes/ror.js";
import proformaRoutes from './routes/proforma.js';

// Ensure MongoDB connection before handling any requests
await connectToDatabase();

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5174",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
  res.send("Backend is running!");
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

export default app;
