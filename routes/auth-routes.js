require('dotenv').config(); // 這行程式碼會讀取.env檔案中的環境變數
const express = require('express');
const router = express.Router();
const User = require('../models/user.js');
const Category = require('../models/category.js');
const defaultItem = require('../utils/defaultItem.js');
const bcrypt = require('bcrypt');
const session = require('express-session');
const passport = require('passport');
const saltRounds = 10; // 加密強度，越大越安全，但速度越慢

// 註冊
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    const foundUser = await User.findOne({ email });
    if (foundUser) {
      return res.status(400).json({
        message: 'Email已存在，請使用其他email',
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

    await defaultItem.createDefaultCategories(savedUser._id);
    await defaultItem.createDefaultBooks(savedUser._id);
    await defaultItem.getDefaultCities(savedUser._id);

    return res.json({ message: '註冊成功', registrationSuccess: true });
  } catch (e) {
    return res
      .status(500)
      .send({ message: '註冊失敗', e, registrationSuccess: false });
  }
});

// 登入
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      // 登入失敗，info.message 就是你在 LocalStrategy 傳的 message
      return res.status(401).json({ success: false, message: info.message });
    }

    req.logIn(user, async (err) => {
      if (err) return next(err);

      await defaultItem.ensureCurrentYearBooks(user._id);

      return res.json({ success: true, user });
    });
  })(req, res, next);
});

router.post('/logout', (req, res) => {
  req.logOut((err) => {
    if (err) return res.send(err);

    // 清除session
    req.session.destroy((err) => {
      if (err) return res.status(500).send({ error: '登出失敗', err });
      console.log('Session已清除');
      // 清除cookie
      res.clearCookie('finance-session-id', {
        path: '/',
      });
      console.log('Cookie已清除');
      console.log('登出成功');
      return res.status(200).send({ message: '成功登出' });
    });
  });
});

router.get('/checkSession', (req, res) => {
  console.log(req.session);
});

router.get('/checkLogin', (req, res) => {
  if (req.isAuthenticated()) {
    console.log('已登入');
    res.json({ message: '已登入', user: req.user, isAuthenticated: true });
  } else {
    console.log('未登入');
    res.status(401).json({ error: '未登入', isAuthenticated: false });
  }
});

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })
);

router.get(
  '/google/redirect',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_API_URL}/auth/login`,
  }),
  async (req, res) => {
    await defaultItem.ensureCurrentYearBooks(req.user._id);
    res.redirect(process.env.FRONTEND_API_URL); // 登入成功後，導向前端的網址
  }
);

module.exports = router;
