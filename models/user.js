const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const Record = require('./record.js');
const Category = require('./category.js');
const BookKeeping = require('./bookKeeping.js');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    minlength: [2, '用戶名至少需要兩個字'],
    maxLength: [20, '用戶名最長20個字'],
  },
  googleId: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  thumbnail: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  lineId: {
    type: String,
    unique: [true, '此Line帳號已被綁定'],
    sparse: true, // 允許多個 null 值
  },
  lineBindCode: {
    type: String,
  },
  lineBindCodeExpireTime: {
    type: Date,
  },
});

// 跟使用者相關的記帳
userSchema.virtual('records', {
  ref: 'Record',
  localField: '_id',
  foreignField: 'userid',
});

userSchema.methods.getRecords = async function () {
  return await Record.find({ userid: this._id });
};

// 跟使用者相關的記帳分類
userSchema.virtual('categories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'user',
});

userSchema.methods.getCategories = async function () {
  return await Category.find({ user: this._id });
};

userSchema.methods.deleteCategory = async function (categoryId) {
  const deletedCategory = await Category.findByIdAndDelete(categoryId);
  return deletedCategory;
};

// 跟使用者相關的記帳本及其功能
userSchema.virtual('bookKeepings', {
  ref: 'BookKeeping',
  localField: '_id',
  foreignField: 'user',
});

userSchema.methods.getBookKeepingsByYear = async function (year) {
  const yearNum = Number(year);
  const start = new Date(`${yearNum}-01-01`);
  const end = new Date(`${yearNum + 1}-01-01`);
  // console.log("start", start);
  // console.log("end", end);

  const tmp = await BookKeeping.find({
    user: this._id,
    date: { $gte: start, $lt: end },
  }).sort({ isDefault: -1, date: 1 });
  console.log('tmp', tmp);
  return tmp;
};

userSchema.methods.addBookKeeping = async function (
  name,
  date,
  description = ''
) {
  const dateObj = new Date(date);
  // if (isNaN(dateObj.getTime())) {
  //   throw new Error("Invalid date format");
  // }
  console.log('dateObj', dateObj);
  const bookKeeping = new BookKeeping({
    name,
    date: dateObj,
    description,
    user: this._id,
  });
  return await bookKeeping.save();
};

userSchema.methods.deleteBookKeeping = async function (bookId) {
  return await BookKeeping.findByIdAndDelete(bookId);
};

userSchema.methods.createBindLineCode = function () {
  const bindCode = crypto.randomBytes(4).toString('hex');

  this.lineBindCode = crypto
    .createHash('sha256')
    .update(bindCode)
    .digest('hex');

  this.lineBindCodeExpireTime = Date.now() + 10 * 60 * 1000;

  return bindCode;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
