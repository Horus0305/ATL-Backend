import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema({
  clientname: {
    type: String,
    required: [true, 'Client name is required'],
    trim: true
  },
  contactno: {
    type: String,
    required: [true, 'Contact number is required'],
    trim: true
  },
  emailid: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  address: {
    type: String,
    required: [true, 'Address is required'],
    trim: true
  }
}, {
  timestamps: true
});

export const Client = mongoose.model('Client', clientSchema); 