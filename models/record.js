const mongoose = require("mongoose");

const recordSchema = new mongoose.Schema({
  category: {
    type: String,
    require: true,
  },
  amount: {
    type: Number,
    require: true,
    min: [0, "不能小於0"],
  },
  note: {
    type: String,
    default: "",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  isIncome: {
    type: String,
    default: "expense",
  },
  userid: { // 這個一定要有，用他來區分每個使用者的資料
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    require: true,
  },
});

const Record = mongoose.model("Record", recordSchema);
module.exports = Record;
