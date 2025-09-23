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
    isNotified: {
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

//* query middleware
calendarEventSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate(); // 取得更新物件
  const updatedFields = {};

  const event = await this.model.findOne(this.getQuery()); // 取得目前 document

  Object.keys(update.$set || {}).forEach((key) => {
    const newVal = update.$set[key];
    const oldVal = event[key];

    if (oldVal instanceof Date) {
      if (new Date(newVal).getTime() !== oldVal.getTime()) {
        updatedFields[key] = newVal;
      }
    } else if (newVal !== oldVal) {
      updatedFields[key] = newVal;
    }
  });

  this.setUpdate({ $set: updatedFields });
  next();
});

//info 只有在更新start或end時，才把isNotified設為false
calendarEventSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  console.log('update', update);
  if (!(update.$set.start || update.$set.start)) {
    console.log('dd');
    return next();
  }
  update.$set.isNotified = false;
  next();
});

//info 在更新事件後，刪除就排程後 重新排程
calendarEventSchema.post('findOneAndUpdate', async function (doc, next) {
  if (!doc) return;
  //! 什麼時候不需要重新排程？ → 已經提醒過的事件()
  if (doc.isNotified) return next();

  //! 取消排程
  eventSchedule.emit('eventDeleted', doc._id);

  await doc.populate({ path: 'user', select: 'lineId' });
  if (!doc.user.lineId) return;

  eventSchedule.emit('eventChanged', doc);
  next();
});

calendarEventSchema.post('save', async function (doc, next) {
  if (!doc) return;
  if (doc.isNotified) return;
  //! 取消排程
  eventSchedule.emit('eventDeleted', doc._id);

  await doc.populate({ path: 'user', select: 'lineId' });
  if (!doc.user.lineId) return;

  eventSchedule.emit('eventChanged', doc);
  next();
});

const CalendarEvent = mongoose.model('CalendarEvent', calendarEventSchema);
module.exports = CalendarEvent;
