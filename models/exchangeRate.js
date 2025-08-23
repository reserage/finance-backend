const mongoose = require('mongoose');

const exchangeRatesSchema = new mongoose.Schema({
  time_last_update: {
    type: Date,
  },
  time_next_update: {
    type: Date,
  },
  base_code: {
    type: String,
    required: [true, '至少需要一個基礎貨幣代碼'],
  },
  conversion_rates: {
    type: Object,
    required: [
      true,
      '至少需要一個多個貨幣對應特定貨幣的匯率',
    ],
  },
  //! 只有用frankfurter API 的document才有這個
  ratesDate: {
    type: Date,
  },
});

module.exports = mongoose.model(
  'ExchangeRates',
  exchangeRatesSchema
);
