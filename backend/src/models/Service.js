const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  provider: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['plumbing', 'electrical', 'cleaning', 'tutoring', 'beauty', 'fitness', 'other']
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  priceType: {
    type: String,
    enum: ['fixed', 'hourly', 'package'],
    default: 'fixed'
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  images: [{
    type: String
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String
  },
  tags: [String],
  availability: {
    Monday: { start: String, end: String, available: Boolean },
    Tuesday: { start: String, end: String, available: Boolean },
    Wednesday: { start: String, end: String, available: Boolean },
    Thursday: { start: String, end: String, available: Boolean },
    Friday: { start: String, end: String, available: Boolean },
    Saturday: { start: String, end: String, available: Boolean },
    Sunday: { start: String, end: String, available: Boolean }
  }
}, {
  timestamps: true
});

serviceSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Service', serviceSchema);