const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/user.js");
const Record = require("../models/record.js");

// 給下拉選擇月份標籤，只有在有該月份的記帳時才提供該月份的標籤(mongoDB內)
router.get("/selectedDate", async (req, res) => {
  // 要判斷該月份有沒有記帳
  try {
    const userId = "6815c5bd9bc92882cefd2306";
    const user = await User.findOne({ _id: userId }).populate("records");

    const recordsDate = await Record.find({ userid: userId }).select("date");
    
    // 利用 Set 特性存放不重複月份
    const uniqueMonths = new Set();

    recordsDate.forEach((record) => {
      const date = new Date(record.date);
      const yearMonth = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      uniqueMonths.add(yearMonth);
    });

    const sortedMonths = Array.from(uniqueMonths).sort();

    // console.log(recordsDate);
    res.json({ months: sortedMonths });
    return;
  } catch (e) {
    console.log(e);
    return;
  }
});

module.exports = router;
