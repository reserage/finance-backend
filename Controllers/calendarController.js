const mongoose = require('mongoose');
const CalendarEvent = require('../models/calenderEventModel');
const catchAsync = require('../utils/catchAsync');
const APIFeatures = require('../utils/APIFeatures');
const AppError = require('../utils/appError');
const eventSchedule = require('../events/eventSchedule');

exports.getAllEvents = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('user not logged in', 401));
  }
  const userId = req.user._id;
  const query = req.query;
  const events = CalendarEvent.find({ userId });

  const features = new APIFeatures(events, query)
    .filter()
    .sort()
    .limitFields()
    .paginate();

  const allEvents = await features.query;

  res.status(200).json({
    status: 'success',
    results: allEvents.length,
    data: {
      events: allEvents,
    },
  });
});

exports.createEvent = catchAsync(async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('user not logged in', 401));
  }
  const userId = req.user._id;
  if (
    !req.body.title ||
    !req.body.calendarId ||
    !req.body.start ||
    !req.body.end ||
    req.body.isAllday === undefined ||
    !req.body.category
  ) {
    return next(new AppError('Missing required fields', 400));
  }

  console.log('Creating event with data:', req.body);
  const newEvent = await CalendarEvent.create({ 
    userId,
    title: req.body.title,
    calendarId: req.body.calendarId,
    start: req.body.start,
    end: req.body.end,
    isAllday: req.body.isAllday,
    category: req.body.category,
    location: req.body.location,
    body: req.body.body,
  });

  res.status(201).json({
    status: 'success',
    data: {
      event: newEvent,
    },
  });
});

exports.deleteEvent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid event ID', 400));
  }

  const event = await CalendarEvent.findByIdAndDelete(id);
  if (!event) {
    return next(new AppError('Event not found', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

exports.updateEvent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid event ID', 400));
  }

  const updatedEvent = await CalendarEvent.findByIdAndUpdate(
    id,
    { $set: req.body },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!updatedEvent) {
    return next(new AppError('Event not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      event: updatedEvent,
    },
  });
});

exports.getEvent = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid event ID'), 400);
  }
  const event = await CalendarEvent.findOne({ _id: id });
  if (!event) {
    return next(new AppError('Event not found!', 404));
  }

  return res.status(200).json({
    status: 'success',
    data: {
      event,
    },
  });
});
