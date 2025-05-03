import mongoose from 'mongoose';

const EmailSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true,
  collection: process.env.EMAIL_COLLECTION_NAME
});

export default mongoose.models.Email || mongoose.model('Email', EmailSchema); 