require('dotenv').config({ path: './backend/.env' }); // 載入環境變數
const mongoose = require('mongoose');
const app = require('./app');

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('成功連接mongoDB....');
  })
  .catch((e) => {
    console.log(e);
  });

const PORT = 5000;
app.listen(PORT, () => {
  console.log('伺服器在5000上進行');
});