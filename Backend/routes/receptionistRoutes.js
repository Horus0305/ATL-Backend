import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { Client } from '../models/Client.js';
import { TestNablScope } from '../models/TestNablScope.js';
import { sendDocumentsEmail } from '../utils/emailService.js';
import { MaterialTest } from '../models/MaterialTest.js';

const router = express.Router();

// Placeholder for receptionist routes
router.get('/', verifyToken, (req, res) => {
  res.json({ message: 'Receptionist routes working' });
});

// Get all clients
router.get('/clients', verifyToken, async (req, res) => {
  try {
    const clients = await Client.find({});
    res.json({ clients, ok: true });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ 
      error: 'Failed to fetch clients',
      ok: false 
    });
  }
});

// Delete a client
router.delete('/clients/:id', verifyToken, async (req, res) => {
  try {
    const client = await Client.findByIdAndDelete(req.params.id);
    if (!client) {
      return res.status(404).json({ 
        error: 'Client not found',
        ok: false 
      });
    }
    res.json({ 
      message: 'Client deleted successfully',
      ok: true 
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({ 
      error: 'Failed to delete client',
      ok: false 
    });
  }
});

// Create a new client
router.post('/clients', verifyToken, async (req, res) => {
  try {
    const { clientname, contactno, emailid, address } = req.body;
    
    // Basic validation
    if (!clientname || !contactno || !emailid || !address) {
      return res.status(400).json({
        error: 'All fields are required',
        ok: false
      });
    }

    const newClient = new Client({
      clientname,
      contactno,
      emailid,
      address,
      createdAt: new Date() // Explicitly set createdAt
    });

    await newClient.save();
    
    res.json({
      message: 'Client created successfully',
      client: newClient,
      ok: true
    });
  } catch (error) {
    // Handle duplicate key error
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      const fieldName = field === 'emailid' ? 'email address' : field;
      return res.status(409).json({
        error: `A client with this ${fieldName} already exists`,
        field: field,
        ok: false
      });
    }

    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(422).json({
        error: messages.join(', '),
        ok: false
      });
    }

    // Handle other errors
    res.status(500).json({
      error: 'Failed to create client',
      ok: false
    });
  }
});

// Update a client
router.put('/clients/:id', verifyToken, async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!client) {
      return res.status(404).json({ 
        error: 'Client not found',
        ok: false 
      });
    }
    res.json({ 
      message: 'Client updated successfully',
      client,
      ok: true 
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({ 
      error: 'Failed to update client',
      ok: false 
    });
  }
});

// Add this endpoint to get test scope data
router.get('/test-scope', verifyToken, async (req, res) => {
  try {
    const testScope = await TestNablScope.find({}, 'material_tested group parameters test_method');
    res.json({ 
      testScope,
      ok: true 
    });
  } catch (error) {
    console.error('Error fetching test scope:', error);
    res.status(500).json({ 
      error: 'Failed to fetch test scope data',
      ok: false 
    });
  }
});

// Update the send-documents route
router.post('/send-documents/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { ccEmails = [] } = req.body; // Extract CC emails from request body

    // Get test details from database
    const test = await MaterialTest.findById(id);
    if (!test) {
      return res.status(404).json({
        ok: false,
        error: 'Test not found'
      });
    }

    // Check if both documents exist
    if (!test.rorUrl || !test.proformaUrl) {
      return res.status(400).json({
        ok: false,
        error: 'Both ROR and Proforma must be generated before sending email'
      });
    }

    // Send email with documents and CC
    await sendDocumentsEmail({
      to: test.emailId,
      cc: ccEmails, // Add the CC emails
      clientName: test.clientName,
      testId: test.testId,
      rorPdf: test.rorUrl,
      proformaPdf: test.proformaUrl
    });

    // Update test status
    const updatedTest = await MaterialTest.findByIdAndUpdate(
      id,
      {
        $set: {
          status: 'ROR and Proforma Mailed to Client'
        }
      },
      { new: true }
    );

    res.json({
      ok: true,
      message: 'Documents sent successfully',
      test: updatedTest
    });

  } catch (error) {
    console.error('Error sending documents:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Failed to send documents'
    });
  }
});

// Get dashboard stats for receptionist
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

    console.log('Calculating stats for:', {
      currentDate: currentDate.toISOString(),
      firstDayOfMonth: firstDayOfMonth.toISOString()
    });

    // Get new clients added this month
    const newClientsThisMonth = await Client.countDocuments({
      createdAt: { $gte: firstDayOfMonth }
    });

    console.log('New clients this month:', newClientsThisMonth);

    // Get all tests from this month
    const testsThisMonth = await MaterialTest.find({
      createdAt: { $gte: firstDayOfMonth }
    });

    // Count documents generated (ROR and proforma)
    const documentsGenerated = testsThisMonth.reduce((acc, test) => {
      if (test.rorUrl) acc++;
      if (test.proformaUrl) acc++;
      return acc;
    }, 0);

    // Count pending documents
    const pendingDocuments = testsThisMonth.reduce((acc, test) => {
      if (!test.rorUrl || !test.proformaUrl) acc++;
      return acc;
    }, 0);

    // Count emails sent
    const emailsSent = testsThisMonth.filter(test => test.status === 'ROR and Proforma Mailed to Client').length;

    // Get data for pie chart
    const total = testsThisMonth.length;
    const documentsSent = emailsSent;
    const docsGenerated = documentsGenerated;
    const pending = pendingDocuments;

    // Calculate weeks properly
    const weeksInMonth = [];
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    
    // Define week ranges
    const weekRanges = [
      { start: 1, end: 7 },
      { start: 8, end: 14 },
      { start: 15, end: 21 },
      { start: 22, end: daysInMonth }
    ];

    for (let i = 0; i < weekRanges.length; i++) {
      const weekStart = new Date(firstDayOfMonth);
      weekStart.setDate(weekRanges[i].start);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(firstDayOfMonth);
      weekEnd.setDate(Math.min(weekRanges[i].end, currentDate.getDate()));
      weekEnd.setHours(23, 59, 59, 999);

      console.log(`Calculating Week ${i + 1}:`, {
        start: weekStart.toISOString(),
        end: weekEnd.toISOString()
      });

      const newClients = await Client.countDocuments({
        createdAt: {
          $gte: weekStart,
          $lte: weekEnd
        }
      });

      console.log(`Week ${i + 1} new clients:`, newClients);

      const activeClients = await MaterialTest.distinct('clientName', {
        createdAt: {
          $gte: weekStart,
          $lte: weekEnd
        }
      }).then(clients => clients.length);

      weeksInMonth.push({
        week: `Week ${i + 1}`,
        newClients,
        activeClients
      });
    }

    console.log('Final weeks data:', weeksInMonth);

    // Get data for radial chart
    const rorGenerated = testsThisMonth.filter(test => test.rorUrl).length;
    const proformaGenerated = testsThisMonth.filter(test => test.proformaUrl).length;

    res.json({
      ok: true,
      stats: {
        newClientsThisMonth,
        documentsGenerated,
        pendingDocuments,
        emailsSent,
        total,
        documentsSent,
        docsGenerated,
        pending,
        weeksInMonth,
        rorGenerated,
        proformaGenerated
      }
    });
  } catch (error) {
    console.error('Error getting receptionist stats:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to get receptionist stats'
    });
  }
});

export default router; 