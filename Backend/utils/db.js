import mongoose from "mongoose";

let isConnected = false;

export async function connectToDatabase() {
  if (isConnected) return;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable not set");
  }
  await mongoose.connect(process.env.DATABASE_URL, {
    // Add any mongoose options here if needed
  });
  isConnected = true;
  console.log("Connected to MongoDB successfully");
} 