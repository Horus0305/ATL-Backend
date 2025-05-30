import mongoose from "mongoose";
import { hashPassword } from "../utils/auth.js";

const userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: Number,
      required: true,
    },
    notid: String,
    resetOtp: { 
      type: String,
      default: null
    },
    resetOtpExpiry: {
      type: Date,
      default: null
    }
  },
  {
    // Disable version key (__v)
    versionKey: false,
    // Remove createdAt field
    timestamps: false,
  }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    this.password = await hashPassword(this.password);
    next();
  } catch (error) {
    next(error);
  }
});

export const User = mongoose.model("User", userSchema);
