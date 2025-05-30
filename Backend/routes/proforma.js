import express from 'express';
import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';
import { promises as fs } from 'fs';
import { numberToWords } from '../utils/numberToWords.js'; // Note the .js extension
import { MaterialTest } from '../models/MaterialTest.js';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add a test route to verify the router is working
router.get('/test', (req, res) => {
  res.json({ message: 'Proforma router is working' });
});

router.post('/create', async (req, res) => {
  let browser;
  try {
    const {
      testId,  // Format: ATL/YYYY/MM/T_Count
      materials,
      sgst,
      cgst,
      totalAmount,
      totalTax,
      finalAmount,
      buyer,
      mode,
      hsn,
      materialTestId  // Add this to the request payload
    } = req.body;

    // Parse test ID to generate proforma number
    const testIdParts = testId.split('/');
    if (testIdParts.length !== 4) {
      throw new Error('Invalid test ID format');
    }

    // Extract year, month, and count from test ID
    const [_, year, month, countPart] = testIdParts;
    const count = countPart.replace('T_', ''); // Remove 'T_' prefix from count

    // Generate proforma invoice number
    const invoiceNo = `AVLAB/${year}/${month}/${count}`;

    // Validate required fields
    if (!materials || !Array.isArray(materials)) {
      throw new Error('Materials array is required');
    }

    console.log('Reading template file...');
    const templatePath = path.join(__dirname, '../templates/template2.html');
    const templateContent = await fs.readFile(templatePath, 'utf8');

    // Calculate amounts
    const sgstAmount = (totalAmount * sgst) / 100;
    const cgstAmount = (totalAmount * cgst) / 100;
    const roundingDiff = Math.round(finalAmount) - finalAmount;

    // Generate invoice number with date prefix
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB').split('/').join('');

    // Prepare template data
    const templateData = {
      invoiceno: invoiceNo,
      date: today.toLocaleDateString('en-GB'),
      mode: mode || 'CASH',
      buyer: {
        name: buyer.name || '',
        address: buyer.address || '',
        gstin: buyer.gstin || '',
        pan: buyer.pan || ''
      },
      test: materials.map((item, index) => ({
        srno: index + 1,
        description: item.description,
        hsnsac: hsn || '',
        qty: item.quantity,
        rate: item.rate,
        per: 'unit',
        amount: item.amount
      })),
      hsn: hsn || '',
      sgst: sgst || 0,
      cgst: cgst || 0,
      sgstamt: sgstAmount.toFixed(2),
      cgstamt: cgstAmount.toFixed(2),
      rounding: roundingDiff.toFixed(2),
      total: Math.round(finalAmount).toFixed(2),
      total_amt: totalAmount.toFixed(2),
      totaltax: totalTax.toFixed(2),
      words: numberToWords(Math.round(finalAmount)),
      taxword: numberToWords(totalTax)
    };

    // Compile and generate HTML
    const template = handlebars.compile(templateContent);
    const html = template(templateData);

    // Generate PDF
    console.log('Launching puppeteer...');
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport for better rendering
    await page.setViewport({
      width: 1024,
      height: 1440,
      deviceScaleFactor: 2
    });

    // Set content with proper waiting
    await page.setContent(html, {
      waitUntil: ['networkidle0', 'domcontentloaded']
    });

    // Wait for images to load
    await page.evaluate(async () => {
      const selectors = [
        'img[src*="cloudinary"]',
        'table',
        'body'
      ];
      
      await Promise.all(
        selectors.map(selector =>
          document.querySelector(selector)
            ? Promise.resolve()
            : new Promise(resolve => {
                const observer = new MutationObserver(() => {
                  if (document.querySelector(selector)) {
                    observer.disconnect();
                    resolve();
                  }
                });
                observer.observe(document.body, {
                  childList: true,
                  subtree: true
                });
              })
        )
      );
    });

    // Generate PDF with proper settings
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      preferCSSPageSize: true
    });

    await browser.close();
    browser = null;

    // After generating the PDF, convert it to Base64
    const base64Pdf = pdf.toString('base64');

    // Update the material test document in MongoDB
    const updatedTest = await MaterialTest.findByIdAndUpdate(
      materialTestId,
      {
        $set: {
          proformaStatus: 1,
          status: 'Proforma Generated',
          proformaUrl: base64Pdf
        }
      },
      { new: true }
    );

    if (!updatedTest) {
      throw new Error('Failed to update material test');
    }

    // Verify the update
    const verifiedTest = await MaterialTest.findById(materialTestId);
    if (!verifiedTest.proformaUrl) {
      throw new Error('Failed to store Proforma PDF');
    }

    res.json({ 
      message: 'Proforma generated and stored successfully',
      proformaStatus: updatedTest.proformaStatus,
      status: updatedTest.status
    });

  } catch (error) {
    console.error('Error generating proforma:', error);
    if (browser) {
      await browser.close();
    }
    res.status(500).json({ error: error.message || 'Failed to generate proforma invoice' });
  }
});

// Add this route to handle proforma deletion
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const updatedTest = await MaterialTest.findByIdAndUpdate(
      id,
      {
        $set: {
          proformaStatus: 0,
          status: 'Test Data Entered',
          proformaUrl: null
        },
        $unset: {
          proforma: "" // Remove the proforma Buffer if it exists
        }
      },
      { new: true }
    );

    if (!updatedTest) {
      return res.status(404).json({
        ok: false,
        error: 'Material test not found'
      });
    }

    res.json({
      ok: true,
      message: 'Proforma deleted successfully',
      test: updatedTest
    });

  } catch (error) {
    console.error('Error deleting proforma:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Failed to delete proforma'
    });
  }
});

export default router; 