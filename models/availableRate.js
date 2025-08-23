const mongoose = require('mongoose');

const availableRateSchema = new mongoose.Schema({
  code: [
    {
      type: Object,
      required: true,
    },
  ],
});

module.exports = mongoose.model(
  'AvailableRate',
  availableRateSchema
);
