const router = require("express").Router();
const BookKeeping = require("../models/bookKeeping.js");
const User = require("../models/user.js");
const passport = require("passport");
const { checkLogin } = require("../middlewares/authMiddleware.js");
const bookKeepingController = require("../Controllers/bookKeepingController.js");

router.post("/create", checkLogin, async (req, res) => {
  try {
    const { name, description, date } = req.body;
    console.log("req.user: ", req.user);
    const userid = req.user._id;
    // const userId = '6815c5bd9bc92882cefd2306'; // 測試用

    const newBookKeeping = new BookKeeping({
      name,
      description,
      date: date ? new Date(date) : new Date(), // 如果沒有提供日期，則使用當前日期
      user: userid,
      isDefault: false,
      record: [],
    });
    newBookKeeping.save();
    console.log(newBookKeeping);
    return res.status(201).json({
      message: "記帳本建立成功",
      bookKeeping: newBookKeeping,
    });
  } catch (error) {
    console.error("Error creating book keeping:", error);
    return res.status(500).json({ message: "伺服器錯誤", error });
  }
});

router.get("/getbookKeepings", checkLogin, async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const userId = req.user._id;
    // const userId = "6815c5bd9bc92882cefd2306"; // 測試用
    const user = await User.findById(userId);
    // console.log(user);
    // console.log(year);

    const gotBookKeeping = await user.getBookKeepingsByYear(year);
    // console.log("gotBookKeeping", gotBookKeeping);
    return res.status(200).json({ gotBookKeeping });
  } catch (e) {
    console.error("Error getting book keepings:", e);
    return res.status(500).json({ message: "伺服器錯誤", error: e });
  }
});

//*
router.delete("/delete/:deletedId", checkLogin, bookKeepingController.deleteBookKeeping);

router.patch("/edit", checkLogin, async (req, res) => {
  try {
    const { bookId, name, description } = req.body;
    const updatedBookKeeping = await BookKeeping.findByIdAndUpdate(
      bookId,
      {
        name,
        description,
      },
      { new: true, runValidators: true }
    );
    if (!updatedBookKeeping) {
      return res.status(404).json({ message: "記帳本未找到" });
    }
    return res.status(200).json({
      message: "記帳本更新成功",
      bookKeeping: updatedBookKeeping,
    });
  } catch (error) {
    console.error("Error updating book keeping:", error);
    return res
      .status(500)
      .json({ message: "伺服器錯誤", error: error.message });
  }
});

module.exports = router;
