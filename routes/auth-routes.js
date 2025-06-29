require("dotenv").config(); // 這行程式碼會讀取.env檔案中的環境變數
const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const Category = require("../models/category.js");
const bcrypt = require("bcrypt");
const session = require("express-session");
const passport = require("passport");
const saltRounds = 10; // 加密強度，越大越安全，但速度越慢

// 註冊
router.post("/register", async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const foundUser = await User.findOne({ email });
    if (foundUser) {
      return res.status(400).json({
        message: "Email已存在，請使用其他email",
        registrationSuccess: false,
      });
    }
    let hashValue = await bcrypt.hash(password, saltRounds);
    let newUser = new User({
      name: username,
      password: hashValue,
      email,
    });
    let savedUser = await newUser.save();

    // --------------------將預設的類別存入資料庫--------------------
    let defaultIncomeCategory = ["薪水", "投資"];
    let defaultExpenseCategory = ["餐飲", "交通", "娛樂", "其他"];

    for (const income of defaultIncomeCategory.reverse()) {
      const category = new Category({
        name: income,
        isIncome: true,
        user: savedUser._id,
      });
      await category.save();
    }

    for (const expense of defaultExpenseCategory.reverse()) {
      const category = new Category({
        name: expense,
        isIncome: false,
        user: savedUser._id,
      });
      await category.save();
    }
    // ------------------------------------------------------------
    setDefaultBook(savedUser._id);

    return res.json({ message: "註冊成功", registrationSuccess: true });
  } catch (e) {
    return res
      .status(500)
      .send({ message: "註冊失敗", e, registrationSuccess: false });
  }
});

// 登入
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      // 登入失敗，info.message 就是你在 LocalStrategy 傳的 message
      return res.status(401).json({ success: false, message: info.message });
    }

    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.json({ success: true, user });
    });
  })(req, res, next);
});

router.post("/logout", (req, res) => {
  req.logOut((err) => {
    if (err) return res.send(err);
    console.log("登出成功");
    return res.status(200).send({ message: "成功登出" });
  });
});

router.post("/checkSession", (req, res) => {
  console.log(req.session);
});

router.get("/checkLogin", (req, res) => {
  if (req.isAuthenticated()) {
    console.log("已登入");
    res.json({ message: "已登入", user: req.user, isAuthenticated: true });
  } else {
    console.log("未登入");
    res.status(401).json({ error: "未登入", isAuthenticated: false });
  }
});

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

router.get(
  "/google/redirect",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_API_URL}/auth/login`,
  }),
  (req, res) => {
    res.redirect(process.env.FRONTEND_API_URL); // 登入成功後，導向前端的網址
  }
);

router.post("/text", (req, res) => {
  const userId = "68345103df36477c4405fba3"; // 測試用的(陳彥志小弟)
  setDefaultBook(userId);
  return res.status(200).json({ message: "預設記帳本完成" });
});

async function setDefaultBook(userId) {
  try {
    const user = await User.findOne({ _id: userId });
    const years = [2024, 2025]; // 用於設定有預設記帳本的年齡
    const bookInfo = [
      {
        name: "1月記帳本",
        description: "這是一個範例視圖，您可以在此處添加任何內容。",
      },
      {
        name: "2月記帳本",
        description: "這是一個範例視圖，您可以在此處添加任何內容。",
      },
      {
        name: "3月記帳本",
        description: "這是一個範例視圖，您可以在此處添加任何內容。",
      },
      {
        name: "4月記帳本",
        description: "這是一個範例視圖，您可以在此處添加任何內容。",
      },
      {
        name: "5月記帳本",
        description: "這是一個範例視圖，您可以在此處添加任何內容。",
      },
      {
        name: "6月記帳本",
        description: "這是一個範例視圖，您可以在此處添加任何內容。",
      },
      {
        name: "7月記帳本",
        description: "這是一個範例視圖，您可以在此處添加任何內容。",
      },
      {
        name: "8月記帳本",
        description: "這是一個範例視圖，您可以在此處添加任何內容。",
      },
      {
        name: "9月記帳本",
        description: "這是一個範例視圖，您可以在此處添加任何內容。",
      },
      {
        name: "10月記帳本",
        description: "這是一個範例視圖，您可以在此處添加任何內容。",
      },
      {
        name: "11月記帳本",
        description: "這是一個範例視圖，您可以在此處添加任何內容。",
      },
      {
        name: "12月記帳本",
        description: "這是一個範例視圖，您可以在此處添加任何內容。",
      },
    ];

    for (const year of years) {
      // 由於forEach不會等待async完成，所以使用for...of
      for (let i = 0; i < bookInfo.length; i++) {
        const book = bookInfo[i];
        try {
          const newBook = await user.addBookKeeping(
            book.name,
            `${year}-${String(i + 1).padStart(2, "0")}-01`, // 2024-01-01, 2024-02-01, ...
            book.description
          );
          console.log("newBook: ", newBook);
        } catch (e) {
          console.log(e);
        }
      }
    }
  } catch (e) {
    console.log("error in serDefaultBook function: ", e);
  }
}

module.exports = router;
