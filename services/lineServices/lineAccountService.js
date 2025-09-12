const client = require('../../utils/line');
const crypto = require('crypto');
const User = require('../../models/user');

exports.bindLineAccount = async (event) => {
  const text = event.message.text.trim();

  if (text.startsWith('綁定')) {
    //* 1) 判斷使用者是否有提供驗證碼
    if (text.split(' ').length !== 2) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '綁定失敗，請確認格式是否正確: 綁定 驗證碼',
      });
    }
    const code = text.split(' ')[1];

    //* 2) 驗證碼是否正確或是已過期
    const user = await User.findOne({
      lineBindCode: crypto.createHash('sha256').update(code).digest('hex'),
      lineBindCodeExpireTime: { $gt: Date.now() },
    });
    if (!user) {
      return client.replyMessage(event.replyToken, {
        type: 'text',
        text: '綁定失敗，請確認驗證碼是否正確或已過期',
      });
    }

    //* 3) 綁定成功
    user.lineId = event.source.userId;
    user.lineBindCode = undefined;
    user.lineBindCodeExpireTime = undefined;
    await user.save({ validateBeforeSave: false });
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: '綁定成功',
    });
  }
};

exports.unbindLineAccount = async (event) => {};
