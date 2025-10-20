const mongoose = require('mongoose');

const citySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    englishName: { type: String },
    country: { type: String, required: true },
    timezone: { type: String, required: true },
    timezoneOffset: { type: Number, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('City', citySchema);
