import express from 'express';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Placeholder for tester routes
router.get('/', verifyToken, (req, res) => {
  res.json({ message: 'Tester routes working' });
});

export default router; 