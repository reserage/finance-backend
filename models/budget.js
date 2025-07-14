// 對應某本帳本的所有分類的預算額度

const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema({
  bookkeeping: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "BookKeeping",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  // key是分類的_id, value是預算
  budget: {
    type: Map,
    of: Number,
    default: {},
  },
  // 支出類別的總支出
  totalSpendingByCategory: {
    type: Map,
    of: Number,
    default: {},
  },
  totalIncomeByCategory: {
    type: Map,
    of: Number,
    default: {},
  },
});

const budget = mongoose.model("budget", budgetSchema);
module.exports = budget;
