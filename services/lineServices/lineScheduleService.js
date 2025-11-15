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
      type: 'flex',
      altText: `📅 行程提醒：${event.title}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `📅標題: ${event.title}`,
              weight: 'bold',
              size: 'lg',
            },
            {
              type: 'text',
              text: `🕓時間: ${startTime} ~ ${endTime}`,
              margin: 'sm',
              wrap: true,
            },
            {
              type: 'text',
              text: `📍地點: ${event.location || '無'}`,
              margin: 'sm',
            },
            {
              type: 'text',
              text: `📝描述: ${event.body || '無'}`,
              margin: 'sm',
              wrap: true,
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#28a745',
              action: {
                type: 'postback',
                label: '✅ 已完成',
                data: JSON.stringify({
                  action: 'completeEvent',
                  eventId: event._id,
                }),
              },
            },
            {
              type: 'button',
              style: 'secondary',
              color: '#dc3545',
              action: {
                type: 'postback',
                label: '🗑 刪除',
                data: JSON.stringify({
                  action: 'deleteEvent',
                  eventId: event._id,
                }),
              },
            },
          ],
        },
      },
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

    console.log('notificationDate', notificationDate.toLocaleTimeString());

    const startTime = ` ${event.start.getFullYear()}/${
      event.start.getMonth() + 1
    }/${event.start.getDate()}`;

    const endTime = ` ${event.end.getFullYear()}/${
      event.end.getMonth() + 1
    }/${event.end.getDate()}`;

    const message = {
      type: 'flex',
      altText: `📅 行程提醒：${event.title}`,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: `📅標題: ${event.title}`,
              weight: 'bold',
              size: 'lg',
            },
            {
              type: 'text',
              text: `🕓時間: ${startTime} ~ ${endTime}`,
              margin: 'sm',
              wrap: true,
            },
            {
              type: 'text',
              text: `📍地點: ${event.location || '無'}`,
              margin: 'sm',
            },
            {
              type: 'text',
              text: `📝描述: ${event.body || '無'}`,
              margin: 'sm',
              wrap: true,
            },
          ],
        },
        footer: {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            {
              type: 'button',
              style: 'primary',
              color: '#28a745',
              action: {
                type: 'postback',
                label: '✅ 已完成',
                data: JSON.stringify({
                  action: 'completeEvent',
                  eventId: event._id,
                }),
              },
            },
            {
              type: 'button',
              style: 'secondary',
              color: '#dc3545',
              action: {
                type: 'postback',
                label: '🗑 刪除',
                data: JSON.stringify({
                  action: 'deleteEvent',
                  eventId: event._id,
                }),
              },
            },
          ],
        },
      },
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

//* 沒有event參數就直接傳送，有就進行處理
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

//* ------------------------------------- 每日總結的部分 ------------------------------

// 常數定義
const CATEGORY_ICONS = {
  薪水: '💰',
  投資: '📈',
  餐飲: '🍔',
  交通: '🚌',
  娛樂: '🎮',
  其他: '🗂️',
  unknown: '❓',
};

const BUDGET_WARNING_THRESHOLD = 80;
const DAILY_SUMMARY_CRON = '0 22 * * *'; // 每天22點執行

/**
 * 啟動每日財務總結定時任務
 */
exports.sendDailySummaryToLine = async function sendDailySummaryToLine() {
  // 設定定時任務：每天22點發送通知
  schedule.scheduleJob({ rule: DAILY_SUMMARY_CRON, tz: 'Asia/Taipei' }, async () => {
    console.log('開始執行每日財務總結任務...');

    try {
      await executeDailySummary();
      console.log('每日財務總結任務執行完成');
    } catch (error) {
      console.error('每日財務總結任務執行失敗:', error);
    }
  });

  //* 下面開始不是schedule

  console.log(`已設定每日財務總結定時任務 - 執行時間: ${DAILY_SUMMARY_CRON}`);
};

/**
 * 執行每日財務總結
 */
async function executeDailySummary() {
  const startTime = Date.now();

  // 1. 設定時間範圍
  const { startOfDay, endOfDay } = getDateRange();

  // 2. 獲取有 Line ID 的用戶
  const users = await getActiveLineUsers();

  if (users.length === 0) {
    console.log('沒有找到有效的 Line 用戶');
    return;
  }

  console.log(`開始處理 ${users.length} 個用戶的每日總結`);

  // 3. 並行處理所有用戶（但限制併發數量避免資源過載）
  const results = await processUsersInBatches(users, startOfDay, endOfDay);

  const executionTime = Date.now() - startTime;
  console.log(
    `處理完成 - 成功: ${results.success}, 失敗: ${results.failed}, 執行時間: ${executionTime}ms`
  );
}

/**
 * 分批處理用戶（避免同時處理太多用戶造成資源問題）
 */
async function processUsersInBatches(
  users,
  startOfDay,
  endOfDay,
  batchSize = 10
) {
  const results = { success: 0, failed: 0 };

  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize);

    const batchResults = await Promise.allSettled(
      batch.map((user) => processUserDailySummary(user, startOfDay, endOfDay))
    );

    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.success++;
      } else {
        results.failed++;
        console.error('用戶處理失敗:', result.reason);
      }
    });

    // 批次間稍作延遲，避免資料庫壓力過大
    if (i + batchSize < users.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * 獲取日期範圍
 */
function getDateRange() {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

/**
 * 獲取有 Line ID 的活躍用戶
 */
async function getActiveLineUsers() {
  return await User.find(
    { lineId: { $exists: true, $ne: null } },
    'lineId'
  ).lean(); // 使用 lean() 提高查詢效能
}

/**
 * 處理單一用戶的每日總結
 */
async function processUserDailySummary(user, startOfDay, endOfDay) {
  try {
    // 獲取今日記錄
    const todayRecords = await getTodayRecords(user._id, startOfDay, endOfDay);

    // 如果沒有記錄，則不發送通知
    if (todayRecords.length === 0) {
      console.log(`用戶 ${user._id} 今日無記錄，跳過通知`);
      return;
    }

    // 計算財務統計
    const financialSummary = calculateFinancialSummary(todayRecords);

    // 並行獲取其他資訊
    const [budgetWarnings, tomorrowEvents] = await Promise.all([
      getBudgetWarnings([...financialSummary.bookKeepingSet]),
      getTomorrowEvents(user._id, startOfDay),
    ]);

    // 建立 Line 訊息
    const message = await createLineMessage(
      financialSummary,
      budgetWarnings,
      tomorrowEvents
    );

    // 發送訊息
    await sendLineMessageAndMarkNotified({
      lineId: user.lineId,
      message: message,
    });

    console.log(`用戶 ${user._id} 每日總結發送成功`);
  } catch (error) {
    console.error(`處理用戶 ${user._id} 失敗:`, error);
    throw error;
  }
}

/**
 * 獲取今日記錄
 */
async function getTodayRecords(userId, startOfDay, endOfDay) {
  return await Record.find({
    userid: userId,
    date: { $gte: startOfDay, $lte: endOfDay },
  })
    .populate({
      path: 'user',
      select: 'lineId',
    })
    .lean(); // 使用 lean() 提高查詢效能
}

/**
 * 計算財務統計
 */
function calculateFinancialSummary(records) {
  let income = 0;
  let expense = 0;
  const categoryMap = new Map();
  const bookKeepingSet = new Set();
  const allInfoObj = {};

  records.forEach((record) => {
    // 計算收支
    if (record.isIncome) {
      income += record.amount;
    } else {
      expense += record.amount;
    }

    // 統計分類金額
    const prevAmount = categoryMap.get(record.category) || 0;
    categoryMap.set(record.category, prevAmount + record.amount);

    // 記錄帳本 ID
    const bookId = record.belongBookKeeping.toString();
    bookKeepingSet.add(bookId);

    // 按帳本分組統計
    if (!allInfoObj[bookId]) {
      allInfoObj[bookId] = {};
    }

    allInfoObj[bookId][record.category] =
      (allInfoObj[bookId][record.category] || 0) + record.amount;
  });

  const balance = income - expense;

  return {
    income,
    expense,
    balance,
    categoryMap,
    bookKeepingSet,
    allInfoObj,
  };
}

/**
 * 獲取帳本名稱（批量查詢優化）
 */
async function getBookKeepingNames(bookIds) {
  if (bookIds.length === 0) return {};

  const books = await BookKeeping.find(
    { _id: { $in: bookIds } },
    'name'
  ).lean();

  const nameMap = {};
  books.forEach((book) => {
    nameMap[book._id.toString()] = book.name;
  });

  // 填補未找到的帳本
  bookIds.forEach((id) => {
    if (!nameMap[id]) {
      nameMap[id] = '未命名帳本';
    }
  });

  return nameMap;
}

/**
 * 建立分類顯示內容
 */
async function createCategoryContent(allInfoObj) {
  const bookIds = Object.keys(allInfoObj);

  if (bookIds.length === 0) return [];

  const bookKeepingNames = await getBookKeepingNames(bookIds);
  const lineCategories = [];

  for (const [bookId, categoryObj] of Object.entries(allInfoObj)) {
    // 帳本標題
    lineCategories.push({
      type: 'text',
      text: bookKeepingNames[bookId],
      weight: 'bold',
      size: 'md',
      margin: 'md',
    });

    // 分類金額排序
    const sortedCategories = Object.entries(categoryObj)
      .sort((a, b) => b[1] - a[1])
      .map(([category, amount]) => ({
        type: 'text',
        text: `${
          CATEGORY_ICONS[category] || CATEGORY_ICONS.unknown
        } ${category}: $${amount.toLocaleString()}`,
        margin: 'sm',
      }));

    lineCategories.push(...sortedCategories);
    lineCategories.push({ type: 'separator', margin: 'md' });
  }

  return lineCategories;
}

/**
 * 獲取預算警告
 */
async function getBudgetWarnings(bookKeepingIds) {
  if (bookKeepingIds.length === 0) return [];

  const lineBudgetWarning = [];

  // 並行處理所有帳本的預算檢查
  const warningResults = await Promise.allSettled(
    bookKeepingIds.map((bookId) => processBudgetWarning(bookId))
  );

  warningResults.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      lineBudgetWarning.push(...result.value);
    } else if (result.status === 'rejected') {
      console.error('預算警告處理失敗:', result.reason);
    }
  });

  return lineBudgetWarning;
}

/**
 * 處理單一帳本的預算警告
 */
async function processBudgetWarning(bookId) {
  try {
    const [budgetDoc, bookKeeping] = await Promise.all([
      Budget.findOne({ bookkeeping: bookId }), // 移除 .lean() 以保留虛擬屬性
      BookKeeping.findById(bookId).select('name').lean(),
    ]);

    if (!budgetDoc || !bookKeeping) {
      return [];
    }

    // 使用模型方法來獲取超值的分類
    const categoriesOverThreshold = budgetDoc.getCategoriesOverThreshold(
      BUDGET_WARNING_THRESHOLD
    );

    if (categoriesOverThreshold.length === 0) {
      return [];
    }

    // 批量獲取分類名稱 - 修正：使用物件解構而不是陣列解構
    const categoryIds = categoriesOverThreshold.map(
      (item) => item.categoryId // 改為物件解構
    );
    const categories = await Category.find(
      { _id: { $in: categoryIds } },
      'name'
    ).lean();

    const categoryNameMap = {};
    categories.forEach((cat) => {
      categoryNameMap[cat._id.toString()] = cat.name;
    });

    // 建立警告內容
    const warnings = [
      {
        type: 'text',
        text: bookKeeping.name,
        weight: 'bold',
        size: 'md',
        margin: 'md',
      },
    ];

    // 修正：使用物件解構而不是陣列解構
    categoriesOverThreshold.forEach(({ categoryId, percent }) => {
      const categoryName = categoryNameMap[categoryId] || '未知分類';
      warnings.push({
        type: 'text',
        text: `💡 提醒：${categoryName}分類已用 ${Math.round(percent)}% 預算！`,
        color: '#FF0000',
        wrap: true,
      });
    });

    warnings.push({ type: 'separator', margin: 'md' });

    return warnings;
  } catch (error) {
    console.error(`處理帳本 ${bookId} 預算警告失敗:`, error);
    return [];
  }
}

/**
 * 獲取明日待辦事項
 */
async function getTomorrowEvents(userId, startOfDay) {
  const tomorrowStart = new Date(startOfDay);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const events = await CalendarEvent.find({
    userId: userId,
    start: { $gte: tomorrowStart, $lte: tomorrowEnd },
  }).lean();

  return events.map((event) => {
    const startTime = event.isAllday
      ? '整天'
      : new Date(event.start).toLocaleString('zh-TW', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });

    return {
      type: 'text',
      text: `📅 明日待辦：${event.title}    ${startTime}`,
      wrap: true,
    };
  });
}

/**
 * 建立 Line 訊息
 */
async function createLineMessage(
  financialSummary,
  budgetWarnings,
  tomorrowEvents
) {
  const { income, expense, balance, allInfoObj } = financialSummary;

  // 建立分類內容
  const lineCategories = await createCategoryContent(allInfoObj);

  // 準備內容陣列
  const contents = [
    {
      type: 'text',
      text: '📊 今日財務總結',
      weight: 'bold',
      size: 'lg',
    },
    { type: 'text', text: `收入：$${income.toLocaleString()}`, margin: 'md' },
    { type: 'text', text: `支出：$${expense.toLocaleString()}`, margin: 'sm' },
    {
      type: 'text',
      text: `結餘：$${balance.toLocaleString()}`,
      margin: 'sm',
      color: balance >= 0 ? '#00AA00' : '#FF0000',
    },
  ];

  // 只有在有資料時才添加分隔線和內容
  if (
    lineCategories.length > 0 ||
    budgetWarnings.length > 0 ||
    tomorrowEvents.length > 0
  ) {
    contents.push({ type: 'separator', margin: 'md' });
  }

  contents.push(...lineCategories, ...budgetWarnings, ...tomorrowEvents);

  return {
    type: 'flex',
    altText: '📊 今日財務總結',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: contents,
      },
    },
  };
}

/**
 * 手動執行每日總結（用於測試）
 */
exports.executeManualDailySummary = async function executeManualDailySummary() {
  console.log('手動執行每日財務總結...');
  await executeDailySummary();
};

/**
 * 取消定時任務
 */
exports.cancelDailySummarySchedule = function cancelDailySummarySchedule() {
  const jobs = schedule.scheduledJobs;
  Object.keys(jobs).forEach((jobName) => {
    jobs[jobName].cancel();
  });
  console.log('已取消所有定時任務');
};

//* ------------------------------------- 以上是每日總結的部分 ------------------------------

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
