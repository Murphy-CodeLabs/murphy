import mongoose from 'mongoose';

const ComponentCopySchema = new mongoose.Schema({
  componentName: {
    type: String,
    required: true,
    unique: true
  },
  copyCount: {
    type: Number,
    default: 0
  }
}, {
    timestamps: true,
    collection: process.env.COPY_COMMAND_TRACK_COLLECTION_NAME
  }
);

export default mongoose.models.ComponentCopy || mongoose.model('ComponentCopy', ComponentCopySchema); 