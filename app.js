require('dotenv').config(); // 載入環境變數
const express = require('express');
const qs = require('qs');
const app = express();
const morgan = require('morgan'); // 用於日誌記錄
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo'); // 用於將session存儲在MongoDB中
const flash = require('connect-flash');
const globalErrorHandler = require('./Controllers/errorController');
const authRoutes = require('./routes/auth-routes');
const testRoutes = require('./routes/test-routes');
const categoryRoutes = require('./routes/category-routes');
const statisticsRoutes = require('./routes/statistics-routes');
const bookKeepingRoutes = require('./routes/bookKeeping-routes');
const budgetRoutes = require('./routes/budget-routes');
require('./config/passport');
const passport = require('passport');

// middleware 區
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: process.env.FRONTEND_API_URL,
    credentials: true, // 允許cookie跨域傳遞
  })
);
app.use(cookieParser(process.env.MYCOOKIESECRETKEY)); // cookie解析器
app.use(morgan('dev'));

// 信任代理伺服器，這對於使用HTTPS的環境是必要的
// (如果沒有這個Express可能會將HTTPS錯誤認為是HTTP)
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1); // 僅部署環境啟用
}
app.set('query parser', (str) => qs.parse(str));

app.use(
  session({
    secret: process.env.MYSESSIONSECRETKEY, // 用來加密session的字串
    resave: false,
    saveUninitialized: false,
    name: 'finance-session-id', // 設定cookie的名稱
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 設定cookie的有效期為7天
      secure: process.env.NODE_ENV === 'production', // 當secure: true時，cookie只能透過HTTPS傳送
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    },
  })
); // session解析器
app.use(passport.initialize());
app.use(passport.session());

app.use(flash());

// 設定routes
app.use('/auth', authRoutes);
app.use('/test', testRoutes);
app.use('/category', categoryRoutes);
app.use('/statistics', statisticsRoutes);
app.use('/bookKeeping', bookKeepingRoutes);
app.use('/budget', budgetRoutes);
app.use('/api/v1/exchangeRate', require('./routes/exchangeRate'));
app.use('/api/v1/calendar', require('./routes/calendar-routes'));
app.use('/api/v1/line', require('./routes/line-routes'));

app.use(globalErrorHandler);

module.exports = app;
