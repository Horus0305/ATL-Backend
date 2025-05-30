import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { User } from "../models/User.js";
import { hashPassword } from "../utils/crypto.js";
import { MaterialTest } from "../models/MaterialTest.js";
import { sendWelcomeEmail } from "../utils/emailService.js";
import { getRoleText } from "../utils/auth.js";
import { Client } from "../models/Client.js";

const router = express.Router();

// Placeholder for admin routes
router.get("/", verifyToken, (req, res) => {
  res.json({ message: "Admin routes working" });
});

// Get all users
router.get("/users", verifyToken, async (req, res) => {
  try {
    const users = await User.find({}, "-password");
    res.json({ users, ok: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users", ok: false });
  }
});

// Add update user route
router.put("/users/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { firstname, lastname, email, username, role, password } = req.body;

    console.log("Update request received:", {
      id,
      firstname,
      lastname,
      email,
      username,
      role,
      hasPassword: !!password,
    });

    // Check if username already exists (except for current user)
    if (username) {
      const existingUser = await User.findOne({
        username,
        _id: { $ne: id },
      });

      if (existingUser) {
        return res.status(400).json({
          error: "Username already exists",
          ok: false,
        });
      }
    }

    // Prepare update data
    const updateData = {};

    // Only include fields that are actually provided
    if (firstname) updateData.firstname = firstname;
    if (lastname) updateData.lastname = lastname;
    if (email) updateData.email = email;
    if (username) updateData.username = username;
    if (role !== undefined) updateData.role = parseInt(role);
    if (password) {
      updateData.password = hashPassword(password);
    }

    console.log("Update data being sent to MongoDB:", updateData);

    // Update user with runValidators and new options
    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
      context: "query",
    }).select("-password");

    if (!updatedUser) {
      return res.status(404).json({
        error: "User not found",
        ok: false,
      });
    }

    console.log("Updated user:", updatedUser);

    res.json({
      user: updatedUser,
      message: "User updated successfully",
      ok: true,
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      error: error.message || "Failed to update user",
      ok: false,
    });
  }
});

// Create new user
router.post("/users", verifyToken, async (req, res) => {
  try {
    const { firstname, lastname, email, username, password, role } = req.body;

    // Validate required fields
    if (
      !firstname ||
      !lastname ||
      !email ||
      !username ||
      !password ||
      role === undefined
    ) {
      return res.status(400).json({
        error: "All fields are required",
        ok: false,
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res.status(400).json({
        error:
          existingUser.username === username
            ? "Username already exists"
            : "Email already exists",
        ok: false,
      });
    }

    // Create new user
    const newUser = new User({
      firstname,
      lastname,
      email,
      username,
      password,
      role: parseInt(role),
    });

    await newUser.save();

    // Send welcome email with credentials
    try {
      await sendWelcomeEmail(email, {
        firstname,
        lastname,
        username,
        password, // This is the original unhashed password
        roleText: getRoleText(parseInt(role)),
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the request if email fails, just log it
    }

    // Remove password from response
    const userResponse = newUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      user: userResponse,
      message: "User created successfully",
      ok: true,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      error: error.message || "Failed to create user",
      ok: false,
    });
  }
});

// Get all tests
router.get("/tests", verifyToken, async (req, res) => {
  try {
    console.log("Fetching tests from database...");
    const tests = await MaterialTest.find({})
      .select("-ror -proforma")
      .sort({ date: -1 });

    res.json({ tests, ok: true });
  } catch (error) {
    console.error("Error fetching tests:", error);
    res.status(500).json({
      error: "Failed to fetch tests",
      ok: false,
    });
  }
});

// Get single test details by ID
router.get("/tests/:testId", verifyToken, async (req, res) => {
  try {
    console.log("Fetching test details for ID:", req.params.testId);

    const test = await MaterialTest.findById(req.params.testId)
      .select("-ror -proforma")
      .populate("clientId", "clientname emailid contactno address");

    if (!test) {
      return res.status(404).json({
        error: "Test not found",
        ok: false,
      });
    }

    // Transform the data to match the expected format
    const transformedTest = {
      ...test.toObject(),
      testId: test.testId,
      clientname: test.clientId?.clientname,
      emailid: test.clientId?.emailid,
      contactno: test.clientId?.contactno,
      address: test.clientId?.address,
      tests:
        test.tests?.map((t) => ({
          atlId: t.atlId,
          date: t.date,
          material: t.material,
          materialId: t.materialId,
          quantity: t.quantity,
          testType: t.testType,
          tests: t.tests,
          reporturl: t.reporturl,
        })) || [],
    };

    console.log("Transformed test data:", transformedTest);

    res.json({
      test: transformedTest,
      ok: true,
    });
  } catch (error) {
    console.error("Error fetching test details:", error);
    res.status(500).json({
      error: "Failed to fetch test details",
      ok: false,
    });
  }
});

// Get superadmin dashboard stats
router.get("/stats", verifyToken, async (req, res) => {
  try {
    // Get total clients count from Client model
    const totalClients = await Client.countDocuments();

    // Get total tests count
    const totalTests = await MaterialTest.countDocuments();

    // Define the ordered list of statuses
    const statusOrder = [
      "Test Data Entered",
      "ROR Generated",
      "Proforma Generated",
      "ROR and Proforma Mailed to Client",
      "Job Card Created",
      "Job Card Sent for Approval",
      "Job Assigned to Testers",
      "Test Values Added",
      "Test Values Approved",
      "Test Values Rejected",
      "Report Generated",
      "Report Sent for Approval",
      "Report Approved",
      "Report Rejected",
      "Report Mailed to Client",
      "Completed",
    ];

    // Get test status counts
    const statuses = await MaterialTest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Find the index boundaries
    const pendingEndIdx = statusOrder.indexOf("Job Card Created");
    const completedIdx = statusOrder.indexOf("Completed");

    // Prepare sets for quick lookup
    const pendingSet = new Set(statusOrder.slice(0, pendingEndIdx + 1));
    const completedSet = new Set(["Completed"]);
    const inProgressSet = new Set(
      statusOrder.slice(pendingEndIdx + 1, completedIdx)
    );

    // Transform status counts into the required format
    const statusCounts = {
      Pending: 0,
      "In Progress": 0,
      Completed: 0,
    };

    statuses.forEach((status) => {
      if (pendingSet.has(status._id)) {
        statusCounts.Pending += status.count;
      } else if (inProgressSet.has(status._id)) {
        statusCounts["In Progress"] += status.count;
      } else if (completedSet.has(status._id)) {
        statusCounts.Completed += status.count;
      }
    });

    res.json({
      ok: true,
      stats: {
        totalClients,
        totalTests,
        statuses: statusCounts,
      },
    });
  } catch (error) {
    console.error("Error fetching superadmin stats:", error);
    res.status(500).json({
      error: "Failed to fetch superadmin stats",
      ok: false,
    });
  }
});

// Get monthly chemical and mechanical test counts for the current year
router.get("/test-type-monthly-stats", verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    // Aggregate by month and testType (from tests array)
    const results = await MaterialTest.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
        },
      },
      { $unwind: "$tests" },
      {
        $group: {
          _id: {
            month: { $month: "$createdAt" },
            testType: "$tests.testType",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Prepare result for all months
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    const data = months.map((month, idx) => ({
      month,
      chemical: 0,
      mechanical: 0,
    }));

    results.forEach((item) => {
      const mIdx = item._id.month - 1;
      let type = "";
      if (
        item._id.testType &&
        item._id.testType.toLowerCase().includes("chemical")
      ) {
        type = "chemical";
      } else if (
        item._id.testType &&
        item._id.testType.toLowerCase().includes("mechanical")
      ) {
        type = "mechanical";
      }
      if (type) {
        data[mIdx][type] += item.count;
      }
    });

    res.json({ ok: true, data });
  } catch (error) {
    console.error("Error fetching monthly test type stats:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch monthly test type stats" });
  }
});

export default router;
