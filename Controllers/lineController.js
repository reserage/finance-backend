const client = require('../utils/line');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/user');
const AppError = require('../utils/appError');
const { bindLineAccount } = require('../services/lineServices/lineAccountService');


exports.easyResponse = (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then((result) =>
    res.json(result)
  );
};

function handleEvent(event) {
  if (event.type !== 'message' || event.message.type !== 'text') {
    return Promise.resolve(null);
  }

  if (event.message.text.trim().startsWith('綁定')) {
    return bindLineAccount(event);
  }

  return client.replyMessage(event.replyToken, {
    type: 'text',
    text: `你說了: ${event.message.text}`,
  });
}

exports.generateLineBindCode = catchAsync(async (req, res, next) => {
  //* 1) 取得使用者資料
  const user = await User.findById(req.user?.id);
  if (!user) {
    return next(new AppError('使用者不存在，請稍後再試', 404));
  }
  //* 2) 判斷使用者是否已經綁定過
  if (user.lineId) {
    return next(new AppError('此帳號已綁定Line', 400));
  }

  //* 3) 產生亂數字驗證碼
  const bindCode = user.createBindLineCode();
  await user.save({ validateBeforeSave: false });
  //* 4) 回應使用者
  res.status(200).json({
    status: 'success',
    data: {
      bindCode,
    },
  });
});


function pushLineTodoMessage() {}
