const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20");
const User = require("../models/user");
const LocalStrategy = require("passport-local");
const bcrypt = require("bcrypt");
const Category = require("../models/category");
const BookKeeping = require("../models/bookKeeping");

passport.serializeUser((user, done) => {
  console.log("Serialize使用者");
  // console.log("serializeUser使用者的id: ", user._id);
  done(null, user._id); // 將mongoDB的id，存在session內
  // 並且將id簽名後，以Cookie的形式給使用者
});

passport.deserializeUser(async (_id, done) => {
  console.log(
    "Deserialize使用者。。。使用serializeIser儲存的id，去找到資料庫內的資料"
  );
  let foundUser = await User.findOne({ _id }).exec();
  // console.log("deserializeUser使用者的資料: ", foundUser);
  done(null, foundUser); // 將資料庫的資料，放在req.user內
});

// google登入?和註冊策略
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/redirect",
    },
    async (accessToken, refreshToken, profile, done) => {
      console.log("進入Google Strategy的區域");
      // console.log("profile: ",profile);
      // console.log("==========================");
      let foundUser = await User.findOne({ googleId: profile.id }).exec();
      let foundEmail = await User.findOne({
        email: profile.emails[0].value,
      });
      if (foundUser) {
        console.log("使用者已經註冊過了，無須存入資料庫內");
        console.log(foundUser);
        done(null, foundUser);
      } else if (foundEmail) {
        console.log("使用者的email已經經過本地註冊過了，無須存入資料庫內");
        console.log(foundEmail);
        done(null, foundEmail);
      } else {
        console.log("偵測到新用戶，須將資料存入資料庫內");
        let newUser = new User({
          name: profile.displayName,
          googleId: profile.id,
          thumbnail: profile.photos[0].value,
          email: profile.emails[0].value,
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
        // ---------------------將預設記帳本存入資料庫-------------------
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
              const newBook = new BookKeeping({
                name: book.name,
                date: new Date(`${year}-${String(i + 1).padStart(2, "0")}-01`),
                description: book.description,
                user: savedUser._id,
              });
              // console.log(newBook);
              console.log(await newBook.save());
            } catch (e) {
              console.log(e);
            }
          }
        }

        // ------------------------------------------------------------

        console.log("成功創建用戶。");
        done(null, savedUser);
      }
    }
  )
);

// 本地登入策略(只有本地登入，沒有本地註冊，因為註冊已經在auth-routes.js內處理了)
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
    },
    async (email, password, done) => {
      let foundUser = await User.findOne({ email }).exec();
      console.log(foundUser);
      if (foundUser) {
        let result = await bcrypt.compare(password, foundUser.password);
        if (result) {
          console.log("登入成功");
          done(null, foundUser);
        } else {
          console.log("密碼錯誤，登入失敗");
          done(null, false, { message: "密碼錯誤" });
        }
      } else {
        console.log("使用者不存在，登入失敗");
        done(null, false, { message: "使用者不存在" });
      }
    }
  )
);
