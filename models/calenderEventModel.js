const mongoose = require('mongoose');
const eventSchedule = require('../events/eventSchedule');

const calendarEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '需要使用者ID'],
    },
    title: {
      type: String,
      required: [true, '需要標題'],
    },
    calendarId: {
      type: String,
      required: [true, '需要行事曆分類'],
    },
    start: {
      type: Date,
      required: [true, '需要開始時間'],
    },
    end: {
      type: Date,
      required: [true, '需要結束時間'],
    },
    isAllday: {
      type: Boolean,
      required: [true, '需要是否為全天事件'],
    },
    category: {
      type: String,
      required: [true, '需要分類'],
      enum: ['allday', 'time'],
    },
    body: {
      type: String,
    },
    location: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    isnotified: {
      type: Boolean,
      default: false,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

calendarEventSchema.virtual('user', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true,
});

calendarEventSchema.post('findOneAndUpdate', async function (doc, next) {
  if (!doc) return;

  await doc.populate({ path: 'user', select: 'lineId' });
  if (!doc.user.lineId) return;

  eventSchedule.emit('eventChanged', doc);
  next();
});

calendarEventSchema.post('save', async function (doc, next) {
  if (!doc) return;

  await doc.populate({ path: 'user', select: 'lineId' });
  if (!doc.user.lineId) return;

  eventSchedule.emit('eventChanged', doc);
  next();
});

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
module.exports = CalendarEvent;
