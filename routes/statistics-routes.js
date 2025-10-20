const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/user.js');
const Record = require('../models/record.js');
const BookKeeping = require('../models/bookKeeping.js');
const Budget = require('../models/budget.js');
const Category = require('../models/category.js');

router.get('/init', async (req, res) => {
  // 要判斷該月份有沒有記帳
  try {
    const userId = req.user._id; // 前端傳來的userId

    // const userId = "6815c5bd9bc92882cefd2306"; // 測試用的userId
    const user = await User.findOne({ _id: userId }).populate('records');

    const recordsDate = await Record.find({ userid: userId }).select('date');

    // 給下拉選擇月份標籤，只有在有該月份的記帳時才提供該月份的標籤(mongoDB內)--------------------
    const uniqueMonths = new Set(); // 利用 Set 特性存放不重複月份

    recordsDate.forEach((record) => {
      const date = new Date(record.date);
      const yearMonth = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}`;
      uniqueMonths.add(yearMonth);
    });

    const sortedMonths = Array.from(uniqueMonths).sort();
    // --------------------------------------------------------------------------------------

    // console.log(recordsDate);
    const year = sortedMonths[sortedMonths.length - 1].split('-')[0];
    const month = sortedMonths[sortedMonths.length - 1].split('-')[1];
    const allData = await getAllDataByMonth(year, month, userId);

    res.json({ months: sortedMonths, allData });
    return;
  } catch (e) {
    console.log(e);
    return;
  }
});

async function getAllDataByMonth(year, month, userId) {
  // 用來獲取該月份前端所需要的的全部資料
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1); // 下個月的第一天

  const records = await Record.find({
    userid: userId,
    date: { $gte: startDate, $lt: endDate },
  });

  // 計算總收入和總支出
  const totalIncome = records.reduce((sum, record) => {
    return sum + (record.isIncome === true ? record.amount : 0);
  }, 0);

  const totalExpense = records.reduce((sum, record) => {
    return sum + (record.isIncome === false ? record.amount : 0);
  }, 0);

  // 計算各個類別的總收入和總支出
  const categoryTotals = records.reduce(
    (totals, record) => {
      const category = record.category;
      if (record.isIncome === 'income') {
        if (!totals.income[category]) {
          totals.income[category] = 0;
        }
        totals.income[category] += record.amount;
      } else {
        if (!totals.expense[category]) {
          totals.expense[category] = 0;
        }
        totals.expense[category] += record.amount;
      }
      return totals;
    },
    { expense: {}, income: {} }
  );
  // 理想格式: {expense: {food: 100, transport: 200}, income: {salary: 5000, bonus: 1000}}

  const sorted = Object.entries(categoryTotals.expense)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  //*  --------------- 預算對比部分 ------------------
  //* 抓取該日期的 bookKeeping
  const bookKeeping = await BookKeeping.findOne({
    user: userId,
    date: new Date(`${year}-${month}-01`),
    isDefault: { $ne: false },
  });
  //* 藉由 bookKeeping 抓屬於他的 budget
  const budgetDocument = await Budget.findOne({
    user: userId,
    bookkeeping: bookKeeping ? bookKeeping._id : null,
  });

  //* 組合預算資料
  const categoryIds = Array.from(budgetDocument.budget.keys());

  // 一次查出所有分類
  const categories = await Category.find({ _id: { $in: categoryIds } }).select(
    'name'
  );
  const categoryMap = new Map(
    categories.map((c) => [c._id.toString(), c.name])
  );

  // 組合結果
  const result = categoryIds.map((categoryId) => ({
    categoryId,
    categoryName: categoryMap.get(categoryId.toString()) || '未知分類',
    budget: budgetDocument.budget.get(categoryId) || 0,
    total: budgetDocument.totalsByCategory.get(categoryId) || 0,
  }));

  return {
    dataMonth: `${year}-${String(month).padStart(2, '0')}`,
    data: {
      expense: categoryTotals.expense,
      income: categoryTotals.income,
      totalIncome: totalIncome,
      totalExpense: totalExpense,
      sorted: sorted, // 用來給前端的 高消費類別 跟 圓餅圖
      budget: result,
    },
  };
}

router.get('/', async (req, res) => {
  try {
    const userId = req.user._id;
    // const userId = "6815c5bd9bc92882cefd2306"; // 測試用的userId
    const { selectedDate } = req.query;

    const year = selectedDate.split('-')[0];
    const month = selectedDate.split('-')[1];
    const allData = await getAllDataByMonth(year, month, userId);

    res.json(allData);
    return;
  } catch (e) {
    console.log(e);
    return;
  }
});

// 專門給折線圖的資料
router.get('/line', async (req, res) => {
  try {
    const userId = req.user._id;
    // const userId = "6815c5bd9bc92882cefd2306"; // 測試用的userId
    const { selectedDate, spendingTrendRadio } = req.query;

    const year = selectedDate.split('-')[0];
    const month = selectedDate.split('-')[1];
    if (spendingTrendRadio === 'month') {
      const results = await getMonthlyWeeklyTotalByUser(userId, year, month);

      res.json(results);
      return;
    } else if (spendingTrendRadio === 'year') {
      const results = await getMonthlyExpenseByUser(userId, year);
      res.json(results);
      return;
    }

    return;
  } catch (e) {
    console.log(e);
    return;
  }
});

//! 計算某使用者在指定年月中，每一週的「支出總額」，並輸出週標籤與金額列表。
//! 每週開始日是「星期日」
const getMonthlyWeeklyTotalByUser = async (userId, targetYear, targetMonth) => {
  const start = new Date(
    `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`
  );
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const result = await Record.aggregate([
    {
      $match: {
        userid: new mongoose.Types.ObjectId(userId),
        date: {
          $gte: start,
          $lt: end,
        },
        isIncome: false,
      },
    },
    {
      $addFields: {
        year: { $year: '$date' },
        month: { $month: '$date' },
        weekOfMonth: {
          $ceil: {
            $divide: [
              {
                $add: [
                  { $dayOfMonth: '$date' },
                  {
                    $subtract: [
                      {
                        $dayOfWeek: {
                          $dateTrunc: { date: '$date', unit: 'month' },
                        },
                      },
                      1,
                    ],
                  },
                ],
              },
              7,
            ],
          },
        },
      },
    },
    {
      $group: {
        _id: {
          year: '$year',
          month: '$month',
          week: '$weekOfMonth',
        },
        totalAmount: { $sum: '$amount' },
      },
    },
    {
      $project: {
        _id: 0,
        week: {
          $concat: [
            { $toString: '$_id.year' },
            '-',
            {
              $toString: {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' },
                ],
              },
            },
            '-W',
            { $toString: '$_id.week' },
          ],
        },
        totalAmount: 1,
      },
    },
    {
      $sort: { week: 1 },
    },
  ]);

  return result;
};

const getMonthlyExpenseByUser = async (userId, targetYear) => {
  const start = new Date(`${targetYear}-01-01`);
  const end = new Date(`${targetYear + 1}-01-01`);

  const result = await Record.aggregate([
    {
      $match: {
        userid: new mongoose.Types.ObjectId(userId),
        isIncome: false, // 只抓支出
        date: {
          $gte: start,
          $lt: end,
        },
      },
    },
    {
      $group: {
        _id: { year: { $year: '$date' }, month: { $month: '$date' } },
        totalAmount: { $sum: '$amount' },
      },
    },
    {
      $project: {
        _id: 0,
        month: {
          $concat: [
            { $toString: '$_id.year' },
            '-',
            {
              $cond: [
                { $lt: ['$_id.month', 10] },
                { $concat: ['0', { $toString: '$_id.month' }] },
                { $toString: '$_id.month' },
              ],
            },
          ],
        },
        totalAmount: 1,
      },
    },
    {
      $sort: { month: 1 },
    },
  ]);

  return result;
};

module.exports = router;
