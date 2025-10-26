const City = require('../models/cityModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

exports.getCities = catchAsync(async (req, res) => {
  const { page = 1 } = req.query;
  const userId = req.user._id;
  const filter = {};
  const sort = {};
  filter.userId = userId;
  sort.isVisible = -1;
  sort.updatedAt = 1;

  const cities = await City.find(filter).sort(sort);

  res.status(200).json({
    status: 'success',
    results: cities.length,
    data: {
      cities,
    },
  });
});

exports.addCity = catchAsync(async (req, res, next) => {
  const { name, country, timezone, timezoneOffset, isVisible } = req.body;
  const userId = req.user._id;

  if (!name || !country || !timezone) {
    return next(new AppError('請提供完整的城市資訊', 400));
  }

  const existingCity = await City.findOne({ name, country, timezone, userId });
  if (existingCity) {
    return next(new AppError('該城市已存在', 400));
  }

  const newCity = await City.create({
    name,
    country,
    timezone,
    timezoneOffset,
    userId,
    isVisible,
  });

  res.status(201).json({
    status: 'success',
    data: {
      city: newCity,
    },
  });
});

exports.deleteCity = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const city = await City.findOneAndDelete({ _id: id, userId });
  if (!city) {
    return next(new AppError('找不到該城市', 404));
  }
  res.status(204).json({ status: 'success', data: null });
});

exports.updateCity = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user._id;

  const updateFields = {};
  const allowedFields = [
    'name',
    'englishName',
    'country',
    'timezone',
    'timezoneOffset',
    'isVisible',
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined && req.body[field] !== null) {
      updateFields[field] = req.body[field];
    }
  });

  const city = await City.findOneAndUpdate({ _id: id, userId }, updateFields, {
    new: true,
    runValidators: true,
  });

  if (!city) {
    return next(new AppError('找不到該城市', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      city,
    },
  });
});
