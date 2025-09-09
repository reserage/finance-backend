const express = require('express');
const router = express.Router();
const exchangeRateController = require('../Controllers/exchangeRateController');

router.get('/available', exchangeRateController.getAllAvailableCurrencies);

router.get('/popular', exchangeRateController.getPopularExchangeRates);

router.get(
  '/:currency',
  exchangeRateController.checkAndRefreshRateData,
  exchangeRateController.getAllExchangeRates
);

router.get(
  '/:currency/:convertCurrency',
  exchangeRateController.checkAndRefreshRateData,
  exchangeRateController.convertCurrency
);

module.exports = router;
