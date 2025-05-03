import mongoose from 'mongoose';

const FeedbackSchema = new mongoose.Schema({
  happiness: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  feedback: {
    type: String,
    required: true
  },
}, {
  timestamps: true,
  collection: process.env.FEEDBACK_COLLECTION_NAME
});

export default mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema); 