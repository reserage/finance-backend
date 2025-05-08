const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
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
    return res.json({ message: "註冊成功", registrationSuccess: true });
  } catch (e) {
    return res
      .status(500)
      .send({ message: "註冊失敗", e, registrationSuccess: false });
  }
});

// 登入
router.post("/login", passport.authenticate("local", {}), (req, res) => {
  console.log("登入成功");
  console.log(req.user);
  return res.status(200).send({ message: "登入成功", user: req.user });
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
    failureRedirect: "http://localhost:8080/auth/login",
  }),
  (req, res) => {
    res.redirect("http://localhost:8080/"); // 登入成功後，導向前端的網址
  }
);

module.exports = router;
