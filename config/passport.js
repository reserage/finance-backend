require('dotenv').config(); // 這行程式碼會讀取.env檔案中的環境變數
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20');
const User = require('../models/user');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const Category = require('../models/category');
const BookKeeping = require('../models/bookKeeping');
const defaultItem = require('../utils/defaultItem');

passport.serializeUser((user, done) => {
  console.log('Serialize使用者');
  done(null, user._id); // 將mongoDB的id，存在session內
});

passport.deserializeUser(async (_id, done) => {
  let foundUser = await User.findOne({ _id }).exec();
  done(null, foundUser); // 將資料庫的資料，放在req.user內
});

// google登入?和註冊策略
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:
        process.env.GOOGLE_CALLBACK_URL ||
        'http://localhost:5000/auth/google/redirect', // 如果沒有設定環境變數，則使用預設值
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log('進入Google Strategy的區域');
      // console.log("profile: ",profile);
      // console.log("==========================");
      let foundUser = await User.findOne({ googleId: profile.id }).exec();
      let foundEmail = await User.findOne({
        email: profile.emails[0].value,
      });
      if (foundUser) {
        console.log('使用者已經註冊過了，無須存入資料庫內');
        console.log(foundUser);
        done(null, foundUser);
      } else if (foundEmail) {
        console.log('使用者的email已經經過本地註冊過了，無須存入資料庫內');
        console.log(foundEmail);
        done(null, foundEmail);
      } else {
        console.log('偵測到新用戶，須將資料存入資料庫內');
        let newUser = new User({
          name: profile.displayName,
          googleId: profile.id,
          thumbnail: profile.photos[0].value,
          email: profile.emails[0].value,
        });
        let savedUser = await newUser.save();

        defaultItem.createDefaultCategories(savedUser._id);
        defaultItem.createDefaultBooks(savedUser._id);
        defaultItem.getDefaultCities(savedUser._id);

        console.log('成功創建用戶。');
        done(null, savedUser);
      }
    }
  )
);

// 本地登入策略(只有本地登入，沒有本地註冊，因為註冊已經在auth-routes.js內處理了)
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
    },
    async (email, password, done) => {
      let foundUser = await User.findOne({ email }).exec();
      console.log(foundUser);
      if (foundUser) {
        if (!foundUser.password)
          return done(null, false, {
            message:
              '該email已用於google登入，請用Google登入',
          });

        let result = await bcrypt.compare(password, foundUser.password);
        if (result) {
          console.log('登入成功');
          return done(null, foundUser);
        } else {
          console.log('密碼錯誤，登入失敗');
          return done(null, false, { message: '密碼錯誤' });
        }
      } else {
        console.log('使用者不存在，登入失敗');
        return done(null, false, { message: '使用者不存在' });
      }
    }
  )
);
