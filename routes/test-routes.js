const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const mongoose = require("mongoose");
const Record = require("../models/record.js");

router.get("/getRecords", async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id })
      .populate("records")
      .exec();
    res.json({ message: "取得資料成功", records: user.records.reverse() });
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

module.exports = router;
