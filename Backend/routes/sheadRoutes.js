import express from "express";
import { verifyToken } from "../middleware/auth.js";
import { MaterialTest } from "../models/MaterialTest.js";

const router = express.Router();

// GET /sectionhead/stats?department=chemical or mechanical
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res
        .status(400)
        .json({ ok: false, error: "Department is required" });
    }

    // Normalize department string
    const dept =
      department.charAt(0).toUpperCase() + department.slice(1).toLowerCase();

    // Fetch all tests for this department
    const tests = await MaterialTest.find({
      "tests.testType": { $regex: dept, $options: "i" },
    });

    // Count statuses
    let pending = 0,
      inProgress = 0,
      completed = 0;
    tests.forEach((test) => {
      if (test.status === "Completed") completed++;
      else if (
        test.status === "Job Assigned to Testers" ||
        test.status === "Test Values Added" ||
        test.status === "Test Values Approved"
      )
        inProgress++;
      else pending++;
    });

    res.json({
      ok: true,
      stats: {
        pending,
        inProgress,
        completed,
      },
    });
  } catch (error) {
    console.error("Error fetching section head stats:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch stats" });
  }
});

// GET /sectionhead/monthly-stats?department=chemical or mechanical
router.get("/monthly-stats", verifyToken, async (req, res) => {
  try {
    const { department } = req.query;
    if (!department) {
      return res.status(400).json({ ok: false, error: "Department is required" });
    }
    const dept = department.charAt(0).toUpperCase() + department.slice(1).toLowerCase();

    const now = new Date();
    const year = now.getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    // Aggregate by month for the department
    const results = await MaterialTest.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
          "tests.testType": { $regex: dept, $options: "i" }
        }
      },
      {
        $group: {
          _id: { month: { $month: "$createdAt" } },
          count: { $sum: 1 }
        }
      }
    ]);

    // Prepare result for all months
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const data = months.map((month, idx) => ({
      month,
      tests: 0
    }));

    results.forEach((item) => {
      const mIdx = item._id.month - 1;
      data[mIdx].tests = item.count;
    });

    res.json({ ok: true, data });
  } catch (error) {
    console.error("Error fetching monthly stats:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch monthly stats" });
  }
});

// Placeholder for section head routes
router.get("/", verifyToken, (req, res) => {
  res.json({ message: "Section Head routes working" });
});

export default router;
