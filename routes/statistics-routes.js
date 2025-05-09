const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/user.js");
const Record = require("../models/record.js");

router.get("/init", async (req, res) => {
  // 要判斷該月份有沒有記帳
  try {
    const userId = req.user._id; // 前端傳來的userId

    // const userId = "6815c5bd9bc92882cefd2306"; // 測試用的userId
    const user = await User.findOne({ _id: userId }).populate("records");

    const recordsDate = await Record.find({ userid: userId }).select("date");

    // 給下拉選擇月份標籤，只有在有該月份的記帳時才提供該月份的標籤(mongoDB內)--------------------
    const uniqueMonths = new Set(); // 利用 Set 特性存放不重複月份

    recordsDate.forEach((record) => {
      const date = new Date(record.date);
      const yearMonth = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      uniqueMonths.add(yearMonth);
    });

    const sortedMonths = Array.from(uniqueMonths).sort();
    // --------------------------------------------------------------------------------------

    // console.log(recordsDate);
    const year = sortedMonths[sortedMonths.length - 1].split("-")[0];
    const month = sortedMonths[sortedMonths.length - 1].split("-")[1];
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
    return sum + (record.isIncome === "income" ? record.amount : 0);
  }, 0);

  const totalExpense = records.reduce((sum, record) => {
    return sum + (record.isIncome === "expense" ? record.amount : 0);
  }, 0);

  // 計算各個類別的總收入和總支出
  const categoryTotals = records.reduce(
    (totals, record) => {
      const category = record.category;
      if (record.isIncome === "income") {
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

  const sorted = Object.entries(categoryTotals.expense).sort(
    (a, b) => b[1] - a[1]
  );

  return {
    dataMonth: `${year}-${String(month).padStart(2, "0")}`,
    data: {
      expense: categoryTotals.expense,
      income: categoryTotals.income,
      totalIncome: totalIncome,
      totalExpense: totalExpense,
      sorted: sorted, // 用來給前端的 高消費類別 跟 圓餅圖
    },
  };
}

module.exports = router;
