const express = require('express');
const router = express.Router();
const exchangeRateController = require('../Controllers/exchangeRateController');

router.get('/available', exchangeRateController.getAllAvailableCurrencies);

router.get('/popular', exchangeRateController.getPopularExchangeRates);

//* 取得 台幣 對應 country 國家的匯率
router.get(
  '/TWD/:country',
  exchangeRateController.countryToCurrencyCode,
  exchangeRateController.checkAndRefreshRateData,
  exchangeRateController.getAllExchangeRates
);

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
