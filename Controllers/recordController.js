const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

//* 判斷是否是外幣，如果是則要將amount轉換成台幣 並 賦值到req.body.amount中
exports.convertForeignToTWD = (req, res, next) => {
  console.log('走過路過不要錯過 ');
  const { amount, currencyCode, rate } = req.body;

  if (currencyCode === 'TWD') {
    return next();
  }

  const convertedAmount = amount / rate;
  req.body.amount = convertedAmount;
  console.log('到下一個中介了');
  return next();
};
