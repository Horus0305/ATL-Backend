import express from "express";
import { MaterialTest } from "../models/MaterialTest.js";
import puppeteer from "puppeteer";
import handlebars from "handlebars";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import fetch from "node-fetch";

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Add this after creating the router but before the routes
handlebars.registerHelper("add", function (value1, value2) {
  return value1 + value2;
});

router.post("/generate/:id", async (req, res) => {
  let browser = null;
  try {
    const { id } = req.params;
    const formData = req.body;

    console.log("Received form data:", formData);

    // Validate required fields
    if (!formData || !formData.testRemarks) {
      throw new Error("Invalid form data");
    }

    // Get test details from database
    const test = await MaterialTest.findById(id);
    if (!test) {
      throw new Error("Test not found");
    }

    // Update test with completion date
    test.completionDate = formData.completionDate;
    await test.save();

    // Generate ROR number using test ID
    const testIdParts = test.testId.split("/");
    const [_, year, month, countPart] = testIdParts;
    const count = countPart.replace("T_", "");
    const rorNo = `ROR/${year}/${month}/${count}`;

    console.log("Reading template file...");
    const templatePath = path.join(__dirname, "../templates/ror.html");
    const templateContent = await fs.readFile(templatePath, "utf8");

    // Prepare template data
    const templateData = {
      rorNo,
      date: new Date().toLocaleDateString("en-GB"),
      customerName: formData.customerName,
      projectName: formData.projectName,
      siteAddress: formData.siteAddress,
      billingAddress: formData.billingAddress,
      emailId: formData.emailId,
      contactNo: formData.contactNo,
      tests: formData.testRemarks.map((test, index) => ({
        id: index + 1,
        material: test.material || "",
        quantity: test.quantity || "",
        test: test.tests?.map((t) => t.test).join(", ") || "",
        materialId: test.materialId || "",
        atlId: test.atlId || "",
        standard: test.tests?.map((t) => t.standard).join(", ") || "",
        remarks: test.remarks || "",
      })),
      requirements: test.requirements || {
        testMethods: "N/A",
        laboratoryCapability: "N/A",
        appropriateTestMethods: "N/A",
        decisionRule: "N/A",
        externalProvider: "N/A",
      },
      daysRequired: formData.daysRequired || "N/A",
    };

    // Compile and generate HTML
    const template = handlebars.compile(templateContent);
    const html = template(templateData);

    // Generate PDF
    console.log("Launching puppeteer...");
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: 1024,
      height: 1440,
      deviceScaleFactor: 2,
    });

    await page.setContent(html, {
      waitUntil: ["networkidle0", "domcontentloaded"],
    });

    // Generate PDF
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    });

    await browser.close();
    browser = null;

    // Convert PDF to Base64
    const base64Pdf = pdf.toString("base64");

    // Update the material test document
    const updatedTest = await MaterialTest.findByIdAndUpdate(
      id,
      {
        $set: {
          rorStatus: 1,
          status: "ROR Generated",
          rorUrl: base64Pdf,
        },
      },
      { new: true }
    );

    if (!updatedTest) {
      throw new Error("Failed to update material test");
    }

    // --- Novu Notification Trigger (using fetch) ---
    const novuApiKey = process.env.NOVU_SECRET_KEY;
    console.log('Novu API Key:', novuApiKey);
    if (!novuApiKey) {
      console.error('NOVU_SECRET_KEY is not defined in environment variables');
    } else {
      try {
        // Determine which section heads to notify
        const CHEMICAL_ID = 'b29cf231-04c1-4708-ad5a-8a61965a5ddc';
        const MECHANICAL_ID = '653d04d1-9661-4924-82d3-72d5e0e58cbe';
        const testTypes = (updatedTest.tests || []).map(t => (t.testType || '').toLowerCase());
        const notifyChemical = testTypes.some(type => type.includes('chemical'));
        const notifyMechanical = testTypes.some(type => type.includes('mechanical'));
        const subscriberIds = [];
        if (notifyChemical) subscriberIds.push(CHEMICAL_ID);
        if (notifyMechanical) subscriberIds.push(MECHANICAL_ID);

        // Trigger notification for each relevant section head
        await Promise.all(subscriberIds.map(async (subscriberId) => {
          const response = await fetch("https://api.novu.co/v1/events/trigger", {
            method: "POST",
            headers: {
              "Authorization": `ApiKey ${novuApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              name: "avant-notification",
              to: [{ subscriberId }],
              payload: { id: updatedTest._id.toString() }
            })
          });
          const data = await response.json();
          if (!response.ok) {
            console.error('Novu API error:', data);
          } else {
            console.log('Novu notification sent:', data);
          }
        }));
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // Don't throw the error, just log it and continue
      }
    }
    // --- End Novu Notification Trigger ---

    // Verify the update
    const verifiedTest = await MaterialTest.findById(id);
    if (!verifiedTest.rorUrl) {
      throw new Error("Failed to store ROR PDF");
    }

    res.json({
      message: "ROR generated successfully",
      rorStatus: updatedTest.rorStatus,
      status: updatedTest.status,
    });
  } catch (error) {
    console.error("Error generating ROR:", error);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({ error: error.message || "Failed to generate ROR" });
  }
});

// Add route to handle ROR deletion
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const updatedTest = await MaterialTest.findByIdAndUpdate(
      id,
      {
        $set: {
          rorStatus: 0,
          status: "Test Data Entered",
          rorUrl: null,
        },
      },
      { new: true }
    );

    if (!updatedTest) {
      return res.status(404).json({
        ok: false,
        error: "Material test not found",
      });
    }

    res.json({
      ok: true,
      message: "ROR deleted successfully",
      test: updatedTest,
    });
  } catch (error) {
    console.error("Error deleting ROR:", error);
    res.status(500).json({
      ok: false,
      error: error.message || "Failed to delete ROR",
    });
  }
});

export default router;
