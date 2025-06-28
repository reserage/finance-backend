require("dotenv").config(); // 載入環境變數
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require("connect-flash");
const authRoutes = require("./routes/auth-routes");
const testRoutes = require("./routes/test-routes");
const categoryRoutes = require("./routes/category-routes");
const statisticsRoutes = require("./routes/statistics-routes");
const bookKeepingRoutes = require("./routes/bookKeeping-routes");
require("./config/passport");
const passport = require("passport");

const app = express();
// middleware 區
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:8080",
    credentials: true, // 允許cookie跨域傳遞
  })
);
app.use(cookieParser(process.env.MYCOOKIESECRETKEY)); // cookie解析器
app.use(
  session({
    secret: process.env.MYSESSIONSECRETKEY, // 用來加密session的字串
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
); // session解析器
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// 設定routes
app.use("/auth", authRoutes);
app.use("/test", testRoutes);
app.use("/category", categoryRoutes);
app.use("/statistics", statisticsRoutes);
app.use("/bookKeeping", bookKeepingRoutes);

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlparser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("成功連接mongoDB....");
  })
  .catch((e) => {
    console.log(e);
  });

const PORT = 5000;
app.listen(PORT, () => {
  console.log("伺服器在5000上進行");
});
