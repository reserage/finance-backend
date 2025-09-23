require('dotenv').config({ path: './backend/.env' }); // 載入環境變數
const mongoose = require('mongoose');
const ngrokConnect = require('./utils/ngrokConnect');
const app = require('./app');
const lineScheduleService = require('./services/lineServices/lineScheduleService');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('成功連接mongoDB....');
  })
  .catch((e) => {
    console.log(e);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  if (process.env.NODE_ENV !== 'production') ngrokConnect(PORT);
  console.log(`伺服器在${PORT}上進行`);
  lineScheduleService.scheduleTodoNotification();
  // lineScheduleService.sendDailySummaryToLine();
});
