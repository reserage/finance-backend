const mongoose = require('mongoose');

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    englishName: { type: String },
    country: { type: String, required: true },
    englishCountryName: { type: String },
    isVisible: { type: Boolean, default: false },
    timezone: { type: String, required: true },
    timezoneOffset: { type: Number },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isDefault: {type: Boolean, default: false},
  },
  { timestamps: true }
);

module.exports = mongoose.model('City', citySchema);
