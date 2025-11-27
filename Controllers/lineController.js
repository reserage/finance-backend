const client = require('../utils/line');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/user');
const CalendarEvent = require('../models/calenderEventModel');
const AppError = require('../utils/appError');
const {
  bindLineAccount,
} = require('../services/lineServices/lineAccountService');
const { ReturnDocument } = require('mongodb');

exports.easyResponse = (req, res) => {
  Promise.all(req.body.events.map(handleEvent)).then(() =>
    res.json({ status: 'ok' })
  );
};

async function handleEvent(event) {
  // ---------------------------
  // 1) 文字訊息處理
  // ---------------------------
  if (event.type === 'message') {
    const text = event.message?.text?.trim() || '';

    // 綁定
    if (text.startsWith('綁定')) {
      return bindLineAccount(event);
    }

    // 一般文字回覆
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: `文字輸入目前只支援綁定，請輸入「綁定 + 驗證碼」來綁定您的帳號。例如：「綁定 123456」。`,
    });
  }

  // ---------------------------
  // 2) postback 處理
  // ---------------------------
  if (event.type === 'postback') {
    const data = JSON.parse(event.postback.data);

    if (data.action === 'completeEvent') {
      const calendarEvent = await CalendarEvent.findById(data.eventId);
      if (calendarEvent) {
        calendarEvent.isDone = true;
        await calendarEvent.save();
      }

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '✅ 已標記該事件為完成！',
      });
    }

    if (data.action === 'deleteEvent') {
      await CalendarEvent.findByIdAndDelete(data.eventId);

      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '🗑 已刪除該事件。',
      });
    }

    // 未知 postback
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '⚠️ 無法識別的操作。',
    });
  }

  // 有些 event 沒 replyToken，要避免報錯
  if (event.replyToken) {
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '🙇 抱歉，我目前只支援文字訊息與按鈕操作。',
    });
  }

  return;
}

exports.generateLineBindCode = catchAsync(async (req, res, next) => {
  //* 1) 取得使用者資料
  const user = await User.findById(req.user?._id);
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
