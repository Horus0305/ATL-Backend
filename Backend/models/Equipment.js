import mongoose from 'mongoose';

const equipmentSchema = new mongoose.Schema({
  equipment_name: String,
  range: String,
  certificate_no: String,
  caliberation_date: Date,
  due_date: Date,
  caliberated_by: String
}, {
  versionKey: false,
  timestamps: false
});

export const Equipment = mongoose.model('Equipments', equipmentSchema); 