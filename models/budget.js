// 對應某本帳本的所有分類的預算額度

const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    bookkeeping: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BookKeeping',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // key是分類的_id, value是預算
    budget: {
      type: Map,
      of: Number,
      default: {},
    },
    //* 存放各類別記帳的總金額
    totalsByCategory: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

budgetSchema.virtual('usedPercentageByCategory').get(function () {
  const result = {};
  for (const [categoryId, total] of this.totalsByCategory) {
    const budgetAmount = this.budget.get(categoryId) || 0;
    result[categoryId] = budgetAmount > 0 ? (total / budgetAmount) * 100 : 0;
  }
  return result;
});

budgetSchema.methods.getCategoriesOverThreshold = function (threshold = 80) {
  const result = [];
  for (const [categoryId, total] of this.totalsByCategory) {
    const budgetAmount = this.budget.get(categoryId) || 0;
    const percent = budgetAmount > 0 ? (total / budgetAmount) * 100 : 0;

    if (percent >= threshold) {
      result.push({ categoryId, percent, total, budget: budgetAmount });
    }
  }
  return result;
};

const budget = mongoose.model('budget', budgetSchema);
module.exports = budget;
