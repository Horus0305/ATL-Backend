import express from 'express';
import { Equipment } from '../models/Equipment.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Get all equipment
router.get('/', verifyToken, async (req, res) => {
  try {
    const equipment = await Equipment.find();
    res.json({ 
      ok: true,
      equipment: equipment.map(item => ({
        _id: item._id,
        equipment: item.equipment_name,
        range: item.range,
        cno: item.certificate_no,
        cdate: item.caliberation_date,
        ddate: item.due_date,
        cname: item.caliberated_by
      }))
    });
  } catch (error) {
    res.status(500).json({ 
      ok: false,
      error: 'Failed to fetch equipment' 
    });
  }
});

// Create new equipment
router.post('/', verifyToken, async (req, res) => {
  try {
    const equipment = new Equipment({
      equipment_name: req.body.equipment,
      range: req.body.range,
      certificate_no: req.body.cno,
      caliberation_date: req.body.cdate,
      due_date: req.body.ddate,
      caliberated_by: req.body.cname
    });
    await equipment.save();
    res.json({ ok: true, equipment });
  } catch (error) {
    res.status(500).json({ 
      ok: false,
      error: 'Failed to create equipment' 
    });
  }
});

// Update equipment
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const equipment = await Equipment.findByIdAndUpdate(
      req.params.id,
      {
        equipment_name: req.body.equipment,
        range: req.body.range,
        certificate_no: req.body.cno,
        caliberation_date: req.body.cdate,
        due_date: req.body.ddate,
        caliberated_by: req.body.cname
      },
      { new: true }
    );
    res.json({ ok: true, equipment });
  } catch (error) {
    res.status(500).json({ 
      ok: false,
      error: 'Failed to update equipment' 
    });
  }
});

// Get equipment by IDs
router.post('/byIds', verifyToken, async (req, res) => {
  try {
    const { equipmentIds } = req.body;
    if (!equipmentIds || !Array.isArray(equipmentIds)) {
      return res.status(400).json({
        ok: false,
        error: 'Equipment IDs array is required'
      });
    }

    const equipment = await Equipment.find({ _id: { $in: equipmentIds } });
    res.json({
      ok: true,
      equipment: equipment.map(item => ({
        _id: item._id,
        equipment: item.equipment_name,
        range: item.range,
        cno: item.certificate_no,
        cdate: item.caliberation_date,
        ddate: item.due_date,
        cname: item.caliberated_by
      }))
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch equipment'
    });
  }
});

export default router; 