const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { default: mongoose } = require('mongoose');
const BookKeeping = require('../models/bookKeeping');
const Record = require('../models/record');
const Budget = require('../models/budget');

exports.deleteBookKeeping = async (req, res, next) => {
  const { deletedId } = req.params;
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const deletedBook = await BookKeeping.findOneAndDelete(
      { _id: deletedId },
      { session }
    );

    if (!deletedBook) {
      await session.abortTransaction();
      throw new AppError('未找到該記帳本', 404);
    }

    await Record.deleteMany({ _id: { $in: deletedBook.record } }, { session });

    await Budget.deleteOne({ bookkeeping: deletedBook._id }, {session});

    await session.commitTransaction();

    return res.status(201).json(deletedBook);
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession(); // 無論如何都會執行
  }
};
