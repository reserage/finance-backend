const express = require('express');
const router = express.Router();
const User = require('../models/user.js');
const mongoose = require('mongoose');
const Record = require('../models/record.js');
const BookKeeping = require('../models/bookKeeping.js');
const Budget = require('../models/budget.js');
const recordController = require('../Controllers/recordController.js');
const AppError = require('../utils/appError.js');

router.get('/getRecords', async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.user._id })
      .populate('records')
      .exec();
    const records = user.records;
    records.sort((a, b) => new Date(b.date) - new Date(a.date)); // 按日期降序排列
    // console.log("records:", records);
    res.json({ message: '取得資料成功', records });
    return;
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: '取得資料失敗' });
  }
});

router.post('/addRecord', async (req, res) => {
  try {
    const { category, amount, note, date, isIncome } = req.body;
    const userid = req.user._id;
    // const userid = '6815c5bd9bc92882cefd2306';

    console.log('user', req.body);
    console.log('userid', req.user);
    const newRecord = new Record({
      category,
      amount,
      note,
      date,
      isIncome,
      userid: new mongoose.Types.ObjectId(userid), // 確保userid是ObjectId類型
    });

    const savedRecord = await newRecord.save();
    return res.json({ message: '新增成功', savedRecord });
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: '新增失敗' });
  }
});

router.delete('/deleteRecord/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const deletedRecord = await Record.findByIdAndDelete(recordId);
    console.log('deletedRecord:', deletedRecord);
    return res.json({});
  } catch (e) {
    console.log(e);
    return res.status(500).send({ message: '刪除失敗' });
  }
});

// 有ByBook的代表執行特定動作外還有特定的記帳本操作
router.get('/getRecordsByBook', async (req, res) => {
  try {
    // 記得加入使用者
    const { bookId } = req.query;
    // console.log(bookId);
    const book = await BookKeeping.findById(bookId).populate('record');
    // console.log(book); // 這裡就是 Record 的完整陣列物件
    return res.status(200).json({
      records: book.record,
    });
  } catch (e) {
    return res.status(500).send({ message: '載入記帳失敗' });
  }
});

//! 判斷是否是外幣，如果是則要將amount轉換成台幣
router.post(
  '/addRecordByBook',
  recordController.convertForeignToTWD,
  async (req, res, next) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const {
        category,
        amount,
        note,
        date,
        bookId,
        categoryId,
        currencyCode,
        rate,
      } = req.body;
      const isIncome = String(req.body.isIncome).toLowerCase() === 'true';
      const userid = req.user._id;
      // const userid = '6815c5bd9bc92882cefd2306';

      const newRecord = await Record.create(
        [
          {
            category,
            amount,
            note,
            date,
            isIncome,
            userid: new mongoose.Types.ObjectId(userid), // 確保userid是ObjectId類型
            currencyCode,
            rate,
          },
        ],
        { session }
      );

      const updatedBook = await BookKeeping.findByIdAndUpdate(
        bookId,
        { $addToSet: { record: newRecord[0]._id } },
        { session }
      );

      //* 對該記帳本的預算document中的totalSpendingByCategory對應類別進行增加 ==============================
      const budgetDocument = await Budget.findOneAndUpdate(
        {
          bookkeeping: bookId,
          user: userid,
        },
        {
          $inc: {
            [`totalsByCategory.${categoryId}`]: Number(amount),
          },
        },
        { upsert: true, session }
      );

      //* ===============================================================================================

      await session.commitTransaction();
      console.log('路過');

      return res.json({
        message: '新增成功',
        newRecord,
        updatedBook,
      });
    } catch (e) {
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      console.log(e);
      return next(new AppError('新增失敗', 500));
    } finally {
      session.endSession();
    }
  }
);

router.delete('/deleteRecordByBook', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { recordId, bookId, categoryId, amount } = req.query;
    const isIncome = String(req.query.isIncome).toLowerCase() === 'true';
    const userId = req.user._id;
    const deletedRecord = await Record.findByIdAndDelete(recordId, { session });
    console.log('deletedRecord:', deletedRecord);
    console.log('categoryId: ', categoryId);

    const updatedBook = await BookKeeping.findByIdAndUpdate(
      bookId,
      {
        $pull: { record: recordId },
      },
      { new: true, session }
    );

    await Budget.updateOne(
      { user: userId, bookkeeping: bookId },
      {
        $inc: {
          [`totalsByCategory.${categoryId}`]: -amount,
        },
      },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({
      message: '刪除成功',
      updatedBook,
      deletedRecord,
    });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    console.log(e);
    return res.status(500).send({ message: '刪除失敗' });
  }
});

module.exports = router;
