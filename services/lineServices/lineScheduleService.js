const client = require('../../utils/line');
const schedule = require('node-schedule');
const CalendarEvent = require('../../models/calenderEventModel');
const eventSchedule = require('../../events/eventSchedule');
const Record = require('../../models/record');
const User = require('../../models/user');
const Budget = require('../../models/budget');
const BookKeeping = require('../../models/bookKeeping');
const Category = require('../../models/category');

//info 排程任務的命名規則： lineSchedule_事件ID

//! 在新增事件時也要用schedule.scheduleJob()，不然在後端重啟之前都沒有用
exports.scheduleTodoNotification = async (events) => {
  //* 如果沒有傳入事件，就排程未來7天內的事件
  //* 排除已經提醒過的事件(isNotified=true)和全天事件(isAllday=true)

  //! 這裡要改成跳板，在這裡判斷是不是全天事件，然後分別跳到不同的function

  if (!Array.isArray(events)) {
    if (!events) {
      events = [];
    } else {
      events = [events];
    }
  }

  if (events.length > 0) {
    handleTimedCalendarEvents(events.filter((event) => !event.isAllday));
    handleAlldayCalendarEvents(events.filter((event) => event.isAllday));
  } else {
    handleTimedCalendarEvents();
    handleAlldayCalendarEvents();
  }
};

eventSchedule.on('eventChanged', async (event) => {
  this.scheduleTodoNotification(event);
});

eventSchedule.on('eventDeleted', async (eventId) => {
  cancelScheduledNotification(eventId);
});

//! 再加入行程之後事件修改了start或是被刪除了 (?這是甚麼意思)

// !!!!!!!!!  當04:04分設定事件start為04:04分時會因為毫秒的差異不會觸發line通知

async function handleTimedCalendarEvents(events) {
  if (!events) {
    events = await CalendarEvent.find({
      start: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      isNotified: { $ne: true },
      isAllday: { $ne: true },
    }).populate({
      path: 'user',
      select: 'lineId',
    });
  }

  console.log('不是全天的events', events);

  events.forEach(async (event) => {
    const eventDate = new Date(event.start);
    const notificationDate = new Date(eventDate.getTime() - 30 * 60 * 1000);
    const now = new Date();

    const startTime = new Date(event.start).toLocaleString('zh-TW', {
      hour12: false,
    });

    const endTime = new Date(event.end).toLocaleString('zh-TW', {
      hour12: false,
    });

    const message = {
      type: 'text',
      text: `行程: ${
        event.title
      }\n 開始時間: ${startTime}\n 結束時間: ${endTime}\n 地點: ${
        event.location || '無'
      }\n 描述: ${event.body || '無'}`,
    };

    if (notificationDate <= now && eventDate > now) {
      // 如果已經過了提醒點，但事件還沒開始 → 馬上提醒
      await sendLineMessageAndMarkNotified({
        lineId: event.user.lineId,
        message: message,
        event: event,
      });
    } else if (notificationDate > now) {
      // 如果提醒時間還沒到 → 用排程
      schedule.scheduleJob(
        `lineSchedule_${event.id}`,
        notificationDate,
        async () => {
          await sendLineMessageAndMarkNotified({
            lineId: event.user.lineId,
            message: message,
            event: event,
          });
        }
      );
    }
  });
}

async function handleAlldayCalendarEvents(events) {
  if (!events) {
    events = await CalendarEvent.find({
      start: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      isNotified: { $ne: true },
      isAllday: true,
    }).populate({
      path: 'user',
      select: 'lineId',
    });
  }

  console.log('全天的事件', events);

  events.forEach((event) => {
    const notificationDate = new Date(event.start);
    notificationDate.setHours(8);
    notificationDate.setMinutes(0);

    console.log('notificationDate', notificationDate.toISOString());

    const startTime = ` ${event.start.getFullYear()}/${
      event.start.getMonth() + 1
    }/${event.start.getDate()}`;

    const endTime = ` ${event.end.getFullYear()}/${
      event.end.getMonth() + 1
    }/${event.end.getDate()}`;

    const message = {
      type: 'text',
      text: `行程: ${
        event.title
      }\n 開始時間: ${startTime}\n 結束時間: ${endTime}\n 地點: ${
        event.location || '無'
      }\n 描述: ${event.body || '無'}`,
    };

    schedule.scheduleJob(
      `lineSchedule_${event.id}`,
      notificationDate,
      async () => {
        await sendLineMessageAndMarkNotified({
          lineId: event.user.lineId,
          message: message,
          event: event,
        });
      }
    );
  });
}

async function sendLineMessageAndMarkNotified({ lineId, message, event }) {
  await client.pushMessage(lineId, message);
  if (!event) return;
  try {
    event.isNotified = true;
    await event.save({ validateBeforeSave: false });
  } catch (err) {
    console.error('Error updating isNotified:', err);
  }
}

//! 我要抓哪個月的預算?
//! 我已經寫好將新增record時載上bookId，現在藥用mongosh設定已有的record


//* 用schedule 做定時通知就差不多了
exports.sendDailySummaryToLine = async function sendDailySummaryToLine() {
  const categoryIcons = {
    薪水: '💰',
    投資: '📈',
    餐飲: '🍔',
    交通: '🚌',
    娛樂: '🎮',
    其他: '🗂️',
    unknown: '❓',
  };
  //* 1) 設定時間範圍
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  //* 2) 抓取有lineId的用戶
  const users = await User.find(
    {
      lineId: { $exists: true, $ne: null },
    },
    'lineId'
  );

  //* 3) 抓取record 並 計算資料
  users.forEach(async (user) => {
    const todayRecords = await Record.find({
      userid: user._id,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).populate({
      path: 'user',
      select: 'lineId',
    });

    //* 4) 統計資料
    let income = 0;
    let expense = 0;
    let categoryMap = new Map(); //info 給line message的物件格式
    const bookKeepingSet = new Set();
    const allInfoObj = {}; // Obj<bookKeeping, <categoryName, amount>>

    todayRecords.forEach((record) => {
      if (record.isIncome) {
        income += record.amount;
      } else {
        expense += record.amount;
      }

      const prevAmount = categoryMap.get(record.category) || 0;
      categoryMap.set(record.category, prevAmount + record.amount);
      console.log(record);

      bookKeepingSet.add(record.belongBookKeeping.toString());

      //* 我是不是應該在這裡抓到bookKeeping來設定categories array
      // 如果帳本還沒建立，就先初始化
      if (!allInfoObj[record.belongBookKeeping]) {
        allInfoObj[record.belongBookKeeping] = {};
      }

      // 如果該分類已經有金額，就累加，否則初始化
      allInfoObj[record.belongBookKeeping][record.category] =
        (allInfoObj[record.belongBookKeeping][record.category] || 0) +
        record.amount;
    });

    // 先抓 BookKeeping 的名稱 (用 Map 來快取)
    const bookKeepingNames = {};
    for (const bookId of Object.keys(allInfoObj)) {
      const book = await BookKeeping.findById(bookId).select('name');
      bookKeepingNames[bookId] = book ? book.name : '未命名帳本';
    }

    let lineCategories = [];
    //* -------------------------------- 以記帳本為區域進行分類 ( 記帳的 ) -----------
    for (const [bookId, categoryObj] of Object.entries(allInfoObj)) {
      // 先推帳本標題
      lineCategories.push({
        type: 'text',
        text: bookKeepingNames[bookId],
        weight: 'bold',
        size: 'md',
        margin: 'md',
      });

      // 轉換分類 -> 陣列並排序
      const sortedCategories = Object.entries(categoryObj)
        .sort((a, b) => b[1] - a[1]) // 金額大到小
        .map(([category, amount]) => ({
          type: 'text',
          text: `${
            categoryIcons[category] || categoryIcons['unknown']
          } ${category} : $${amount}`,
          margin: 'sm',
        }));

      lineCategories.push(...sortedCategories);

      // 每個帳本之間加分隔線（可選）
      lineCategories.push({ type: 'separator', margin: 'md' });
    }
    const balance = income - expense;

    //* --------------------------------- 抓預算的地方 ----------------------------
    let lineBudgetWarning = [];

    await Promise.all(
      [...bookKeepingSet].map(async (bookId) => {
        const budgetDoc = await Budget.findOne({ bookkeeping: bookId });
        const bookKeeping = await BookKeeping.findById(bookId).select('name');

        const categoriesOver80 = Object.entries(
          budgetDoc.usedPercentageByCategory
        ).filter(([key, value]) => value > 80);

        const results = await Promise.all(
          categoriesOver80.map(async ([categoryId, percent]) => {
            const category = await Category.findById(categoryId).select('name');
            return [category.name, Math.round(percent)];
          })
        );

        lineBudgetWarning.push({
          type: 'text',
          text: bookKeeping.name,
          weight: 'bold',
          size: 'md',
          margin: 'md',
        });

        results.forEach(([name, percent]) => {
          lineBudgetWarning.push({
            type: 'text',
            text: `💡 提醒：${name}分類已用 ${percent}% 預算！`,
            color: '#FF0000',
            wrap: true,
          });
        });
        lineBudgetWarning.push({ type: 'separator', margin: 'md' })
      })
    );

    //* ---------------------------------- 抓取隔天的代辦事項  ------------
    const tomorrowStart = new Date();
    tomorrowStart.setDate(startOfDay.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date();
    tomorrowEnd.setDate(startOfDay.getDate() + 1);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const tomorrowEvent = await CalendarEvent.find({
      userId: user._id,
      start: { $gte: tomorrowStart, $lte: tomorrowEnd },
    });

    //* 處理成 line 通知格式 ( 代辦事項 )
    const lineEvent = [];
    tomorrowEvent.forEach((event) => {
      const startTime = new Date(event.start).toLocaleString('zh-TW', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });

      lineEvent.push({
        type: 'text',
        text: `📅 明日待辦： ${event.title}   ${startTime}`,
        wrap: true,
      });
    });

    const message = {
      type: 'flex',
      altText: '📊 今日財務總結',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '📊 今日財務總結',
              weight: 'bold',
              size: 'lg',
            },
            { type: 'text', text: `收入：$${income}`, margin: 'md' },
            { type: 'text', text: `支出：$${expense}`, margin: 'sm' },
            { type: 'text', text: `結餘：$${balance}`, margin: 'sm' },
            { type: 'separator', margin: 'md' },
            ...lineCategories,
            ...lineBudgetWarning,
            ...lineEvent,
          ],
        },
      },
    };

    sendLineMessageAndMarkNotified({
      lineId: user.lineId,
      message: message,
    });
  });

  // console.log('record: ', todayRecords);
  // console.log('income: ', income);
  // console.log('expense: ', expense);
};

function cancelScheduledNotification(jobName) {
  const job = schedule.scheduledJobs[`lineSchedule_${jobName}`];
  if (job) {
    job.cancel();
    console.log(`Cancelled job: ${jobName}`);
    return true;
  }
  return false;
}

// 標記某個分類的百分比
function markChanged(bookkeepingId, categoryId, percentage) {
  if (!changedCategories.has(bookkeepingId)) {
    changedCategories.set(bookkeepingId, new Map());
  }
  changedCategories.get(bookkeepingId).set(categoryId, percentage);
}

// 取得某個分類的百分比 (沒有的話回傳 null)
function getPercentage(bookkeepingId, categoryId) {
  return changedCategories.get(bookkeepingId)?.get(categoryId) ?? null;
}
//!!!!!! 在這裡抓取的資料都沒有篩選到userID !!!!!!!!!!!!!!!!!!!
