const mongoose = require("mongoose");
const app = require('express')();

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

module.exports = app;