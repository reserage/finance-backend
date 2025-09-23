const mongoose = require('mongoose');

const DailySummaryLogSchema = mongoose.Schema({
  user: { type: mongoose.Types.ObjectId, ref: 'User', require: true },
  date: { type: Date, require: true },
  isSent: { type: Boolean, default: false },
});

const DailySummaryLog = mongoose.model(
  'DailySummaryLog',
  DailySummaryLogSchema
);
module.exports = DailySummaryLog;
