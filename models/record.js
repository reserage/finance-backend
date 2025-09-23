const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      require: true,
    },
    //* 這一定是台幣，其他幣種用rate算出
    amount: {
      type: Number,
      require: true,
      min: [0, '不能小於0'],
    },
    note: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    isIncome: {
      type: Boolean,
      default: false,
    },
    userid: {
      // 這個一定要有，用他來區分每個使用者的資料
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      require: true,
    },
    belongBookKeeping: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'bookKeeping',
      require: true,
    },
    currencyCode: {
      type: String,
      default: 'TWD',
    },
    rate: {
      type: Number,
      default: 1,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

recordSchema.virtual('user', {
  ref: 'User',
  localField: 'userid',
  foreignField: '_id',
  justOne: true,
});

recordSchema.virtual('bookKeeping',{
  ref: 'bookKeeping',
  localField: 'belongBookKeeping',
  foreignField: '_id',
});

const Record = mongoose.model('Record', recordSchema);
module.exports = Record;
