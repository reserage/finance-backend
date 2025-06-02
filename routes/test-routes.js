const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const mongoose = require("mongoose");
const Record = require("../models/record.js");
const BookKeeping = require("../models/bookKeeping.js");

router.get("/getRecords", async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id })
      .populate("records")
      .exec();
    const records = user.records;
    records.sort((a, b) => new Date(b.date) - new Date(a.date)); // 按日期降序排列
    // console.log("records:", records);
    res.json({ message: "取得資料成功", records });
    return;
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: "取得資料失敗" });
  }
});

router.post("/addRecord", async (req, res) => {
  try {
    const { category, amount, note, date, isIncome } = req.body;
    const userid = req.user._id;
    console.log("user", req.body);
    console.log("userid", req.user);
    const newRecord = new Record({
      category,
      amount,
      note,
      date,
      isIncome,
      userid: new mongoose.Types.ObjectId(userid), // 確保userid是ObjectId類型
    });

    const savedRecord = await newRecord.save();
    return res.json({ message: "新增成功", savedRecord });
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: "新增失敗" });
  }
});

router.delete("/deleteRecord/:recordId", async (req, res) => {
  try {
    const { recordId } = req.params;
    const deletedRecord = await Record.findByIdAndDelete(recordId);
    console.log("deletedRecord:", deletedRecord);
    return res.json({});
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: "刪除失敗" });
  }
});

router.get("/getRecordsByBook", async (req, res) => {
  try {
    // 記得加入使用者
    const { bookId } = req.query;
    console.log(bookId);
    const book = await BookKeeping.findById(bookId).populate("record");
    console.log(book); // 這裡就是 Record 的完整陣列物件
    return res.status(200).json({
      records: book.record,
    });
  } catch(e) {
    console.log(e);
  }
});

module.exports = router;
