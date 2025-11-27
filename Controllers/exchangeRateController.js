const dotenv = require('dotenv');
dotenv.config({ path: '../.env' }); // 載入環境變數
const axios = require('axios');
const ExchangeRate = require('../models/exchangeRate');
const AvailableRate = require('../models/availableRate');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

//* 一天取一次匯率
//* 這個API是免費的，限制每月只能取1500次
exports.getAllExchangeRates = catchAsync(async (req, res, next) => {
  if (req.exchangeRate) {
    return res.status(200).json({
      status: 'success',
      data: {
        currency: req.exchangeRate.base_code,

        time_last_update: req.exchangeRate.time_last_update
          ? new Date(req.exchangeRate.time_last_update)
          : null,
        time_next_update: req.exchangeRate.time_next_update
          ? new Date(req.exchangeRate.time_next_update)
          : null,
        ratesDate: req.exchangeRate.ratesDate || null,
        rates: req.exchangeRate.conversion_rates,
      },
    });
  } else {
    next(new AppError('No exchange rate data found', 404));
  }
});

exports.checkAndRefreshRateData = catchAsync(async (req, res, next) => {
  const currency = req.params.currency || 'TWD';
  let { date } = req.query;
  date = date ? taiwanDateToUTC(date) : new Date();

  //* 1.) 查詢有沒有符合的document(exchangeRate API的document)
  let exchangeRate = await ExchangeRate.findOne({
    base_code: currency,
    time_last_update: {
      $lte: date,
    },
    time_next_update: {
      $gt: date,
    },
  });

  // //* 是否是今天日期才能決定要不要到API抓最新資料
  if (!exchangeRate && isTodayUTC(date)) {
    exchangeRate = await fetchAndSaveExchangeRates(currency);
  } else if (!exchangeRate) {
    return res
      .status(404)
      .json({ message: 'No exchange rate found for the given date' });
  }
  //* 4.) 將資料存入req中
  req.exchangeRate = exchangeRate;
  return next();
});

exports.convertCurrency = catchAsync(async (req, res, next) => {
  console.log('確認');
  const { currency, convertCurrency } = req.params;
  const amount = req.query.amount * 1;

  if (!amount) {
    return next(new AppError('Please provide an amount to convert', 400));
  }

  if (req.exchangeRate) {
    const rate = req.exchangeRate.conversion_rates[convertCurrency];
    if (!rate) {
      console.log('沒有匯率資料');
      return next(
        new AppError('Exchange rate not found for the specified currency.', 500)
      );
    }
    const convertedAmount = amount * rate;
    return res.status(200).json({
      status: 'success',
      data: {
        from: currency,
        to: convertCurrency,
        amount,
        convertedAmount,
        rate,
      },
    });
  } else {
    console.log('沒有匯率資料');
    return next(new AppError('No exchange rate data found', 404));
  }
});

exports.getAllAvailableCurrencies = catchAsync(async (req, res, next) => {
  const code = await AvailableRate.find({});
  if (code.length === 0) {
    return next(new AppError('No available currencies found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      code: code[0].code,
    },
  });
});

exports.getPopularExchangeRates = catchAsync(async (req, res, next) => {
  const rates = (await AvailableRate.find({}))[0];
  if (!rates) {
    return next(new AppError('No available currencies found', 404));
  }

  let popularRates = rates.code.filter((item) => {
    return item.chineseName;
  });

  return res.status(200).json({
    status: 'success',
    data: {
      code: popularRates,
    },
  });
});

exports.countryToCurrencyCode = async (req, res, next) => {
  const { country } = req.params;
  const response = await axios.get(
    `https://restcountries.com/v3.1/name/${country}`
  );

  req.currencyCode = response.data[0].currencies
    ? Object.keys(response.data[0].currencies)[0]
    : null;

  return next();
};

const fetchAndSaveExchangeRates = async (currency, date) => {
  const exchangeRateApiUrl = `https://v6.exchangerate-api.com/v6/${process.env.EXCHANGE_API_KEY}/latest/${currency}`;

  try {
    const response = await axios.get(exchangeRateApiUrl);
    //* 存進DB中
    const exchangeRate = await ExchangeRate.create({
      base_code: response.data.base_code || response.data.base,
      time_last_update: response.data.time_last_update_unix * 1000 || undefined,
      time_next_update: response.data.time_next_update_unix * 1000 || undefined,
      conversion_rates: response.data.conversion_rates || response.data.rates,
      ratesDate: date ? new Date(date) : undefined,
    });

    return exchangeRate;
  } catch (err) {
    if (err.name === 'AxiosError') {
      throw new AppError(
        'Unable to retrieve exchange rate data. Please check the currency code or try again later.',
        500
      );
    }
  }
};

function isTodayUTC(dateUTC) {
  const now = new Date(); // 當前時間（本地時區）
  const nowUTC = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const targetUTC = new Date(
    Date.UTC(
      dateUTC.getUTCFullYear(),
      dateUTC.getUTCMonth(),
      dateUTC.getUTCDate()
    )
  );

  return nowUTC.getTime() === targetUTC.getTime();
}

function taiwanDateToUTC(taiwanDateStr) {
  // 明確指定台灣時區 +08:00
  const now = new Date();
  const [year, month, day] = taiwanDateStr.split('-').map(Number);

  // 用今天的時分秒，但套用台灣時區
  const utcDate = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      now.getHours() - 8,
      now.getMinutes(),
      now.getSeconds()
    )
  );

  return utcDate;
}

function taiwanDayRangeToUTC(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);

  const startUTC = new Date(Date.UTC(year, month - 1, day, 0, 0, 8));
  const endUTC = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  return { startUTC, endUTC };
}
