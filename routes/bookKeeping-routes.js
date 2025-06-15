const router = require("express").Router();
const BookKeeping = require("../models/bookKeeping.js");
const User = require("../models/user.js");
const passport = require("passport");
const { checkLogin } = require("../middlewares/authMiddleware.js");

router.post("/create", checkLogin, async (req, res) => {
  try {
    const { name, description, date } = req.body;
    console.log("req.user: ", req.user);
    const userid = req.user._id;
    // const userId = '6815c5bd9bc92882cefd2306'; // 測試用
    const user = await User.findById(userid);

    const newBookKeeping = await user.addBookKeeping(name, date, description);
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

router.delete("/delete", checkLogin, async (req, res) => {
  try {
    const { deletedId } = req.body;
    console.log(typeof deletedId);
    // const userId = req.user._id;
    const userId = "6815c5bd9bc92882cefd2306"; // 測試用
    const user = await User.findById(userId);
    const deletedBook = await user.deleteBookKeeping(deletedId);
    return res.status(201).json(deletedBook);
  } catch (e) {
    console.error("Error deleting book keepings:", e);
  }
});
module.exports = router;
