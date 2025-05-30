import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { hashPassword, verifyPassword } from "../utils/auth.js";
import { sendOTPEmail } from "../utils/emailService.js";
import { OTP } from "../models/OTP.js";

const router = express.Router();

// Handle both GET and POST for debugging
router.get("/login", (req, res) => {
  res.json({
    message: "Login endpoint is working but requires a POST request",
  });
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login attempt for username:", username);

    // Try to find user by username or email
    const user = await User.findOne({
      $or: [{ username: username }, { email: username }],
    }).select("+password");

    if (!user) {
      console.log("User not found");
      return res.status(401).json({
        error: "Invalid username or password",
        ok: false,
      });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    console.log("Password valid:", isValidPassword);

    if (!isValidPassword) {
      return res.status(401).json({
        error: "Invalid username or password",
        ok: false,
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        username: user.username,
        role: user.role,
      },
      process.env.SECRET_KEY,
      { expiresIn: "24h" }
    );

    return res.json({
      ok: true,
      token,
      username: user.username,
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      role: user.role,
      _id: user._id,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      error: "Login failed",
      details: error.message,
      ok: false,
    });
  }
});

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Remove any existing manual hashing here if present
    const user = new User({ email, password }); // Password should be plain text here
    await user.save(); // Let the model's pre-save hook handle hashing
    // ... rest of the code
  } catch (error) {
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Check if email exists
router.post("/check-email", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Checking email:", email);

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "Email not registered in our system",
      });
    }

    return res.json({
      ok: true,
      message: "Email found",
    });
  } catch (error) {
    console.error("Check email error:", error);
    return res.status(500).json({
      ok: false,
      error: "Internal server error while checking email",
    });
  }
});

// Send OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;
    console.log("Received OTP request for email:", email);

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log("User not found for email:", email);
      return res.status(404).json({
        error: 'User not found',
        ok: false
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    console.log("Generated OTP for user:", otp);
    
    // Set OTP expiry to 10 minutes from now
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

    // Save OTP and expiry to user document
    user.resetOtp = otp;
    user.resetOtpExpiry = otpExpiry;
    await user.save();

    // Send OTP via email
    await sendOTPEmail(email, otp);
    
    res.json({
      message: 'OTP sent successfully',
      ok: true
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      error: error.message || 'Failed to send OTP',
      ok: false
    });
  }
});

// Verify OTP
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        error: 'Email and OTP are required',
        ok: false
      });
    }

    // Find user with the given email and OTP
    const user = await User.findOne({ 
      email, 
      resetOtp: otp,
      resetOtpExpiry: { $gt: new Date() } // Check if OTP hasn't expired
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired OTP',
        ok: false
      });
    }

    // OTP is valid
    res.json({
      message: 'OTP verified successfully',
      ok: true
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      error: 'Failed to verify OTP',
      ok: false
    });
  }
});

// For password update
router.post('/update-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    
    console.log("Received password update request:", {
      email: email,
      otpProvided: !!otp,
      passwordProvided: !!newPassword
    });

    // Improved validation
    if (!email || !otp || !newPassword) {
      const missingFields = [];
      if (!email) missingFields.push('email');
      if (!otp) missingFields.push('otp');
      if (!newPassword) missingFields.push('password');
      
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(', ')}`,
        ok: false
      });
    }

    // Find user with the given email and OTP
    const user = await User.findOne({ 
      email, 
      resetOtp: otp,
      resetOtpExpiry: { $gt: new Date() }
    });

    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired OTP',
        ok: false
      });
    }

    // Update password
    user.password = newPassword; // The pre-save hook will hash it
    user.resetOtp = null;
    user.resetOtpExpiry = null;
    await user.save();

    res.json({
      message: 'Password updated successfully',
      ok: true
    });

  } catch (error) {
    console.error('Password update error:', error);
    res.status(500).json({
      error: error.message || 'Failed to update password',
      ok: false
    });
  }
});

export default router;
