const client = require('../../utils/line');
const schedule = require('node-schedule');
const CalendarEvent = require('../../models/calenderEventModel');
const eventSchedule = require('../../events/eventSchedule');

//! 在新增事件時也要用schedule.scheduleJob()，不然在後端重啟之前都沒有用
exports.scheduleTodoNotification = async (events) => {
  if (!events) {
    events = await CalendarEvent.find({
      start: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      isnotified: { $ne: true },
    }).populate({
      path: 'user',
      select: 'lineId',
    });
  }

  if (!Array.isArray(events)) {
    events = [events];
  }

  console.log('events', events);

  events.forEach((event) => {
    const eventDate = new Date(event.start);
    const notificationDate = new Date(eventDate.getTime() - 30 * 60 * 1000);
    const now = new Date();

    const startTime = new Date(event.start).toLocaleString('zh-TW', {
      hour12: false,
    });

    const endTime = new Date(event.end).toLocaleString('zh-TW', {
      hour12: false,
    });

    if (notificationDate <= now && eventDate > now) {
      // 如果已經過了提醒點，但事件還沒開始 → 馬上提醒
      client.pushMessage(event.user.lineId, {
        type: 'text',
        text: `行程: ${
          event.title
        }\n 開始時間: ${startTime}\n 結束時間: ${endTime}\n 地點: ${
          event.location || '無'
        }\n 描述: ${event.body || '無'}`,
      });
    } else if (notificationDate > now) {
      // 如果提醒時間還沒到 → 用排程
      schedule.scheduleJob(notificationDate, () => {
        client.pushMessage(event.user.lineId, {
          type: 'text',
          text: `行程: ${
            event.title
          }\n 開始時間: ${startTime}\n 結束時間: ${endTime}\n 地點: ${
            event.location || '無'
          }\n 描述: ${event.body || '無'}`,
        });
      });
    }
  });
};

eventSchedule.on('eventChanged', async (event) => {
  this.scheduleTodoNotification(event);
});

//! 再加入行程之後事件修改了start或是被刪除了