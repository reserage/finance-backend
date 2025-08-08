const router = require("express").Router();
const mongoose = require("mongoose");
const Budget = require("../models/budget");

router.post("/category", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user._id;
    const { bookId, categoryId, amount } = req.body;

    const temp = await Budget.findOneAndUpdate(
      {
        bookkeeping: bookId,
        user: userId,
      },
      { $set: { [`budget.${categoryId}`]: amount } },
      { new: true, upsert: true, session }
    );

    await session.commitTransaction();
    session.endSession();

    return res.json({ temp });
  } catch (e) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error setting budget:", e);

    res.status(500).json({ message: "設定預算失敗" });
  }
});

router.get("/category", async (req, res) => {
  const { bookId } = req.query;
  const userId = req.user._id;

  try {
    const foundBudget = await Budget.findOneAndUpdate(
      {
        bookkeeping: bookId,
        user: userId,
      },
      { $setOnInsert: { bookkeeping: bookId, user: userId } }, // 只有在新建立時才會觸發
      { upsert: true, new: true }
    );

    console.log(foundBudget);

    const { budget = {}, totalsByCategory = {} } = foundBudget;

    console.log("budget: ", budget);

    let ratiosByCategory = {};

    for (const [categoryId, spending] of totalsByCategory.entries()) {
      const budgetAmount = budget.get(categoryId);
      console.log("budgetAmount: ", budgetAmount);
      if (budgetAmount && budgetAmount !== 0) {
        ratiosByCategory[categoryId] = Math.round(
          (spending / budgetAmount) * 100
        );
      }
    }

    return res.json({
      budget,
      ratiosByCategory,
      totalsByCategory,
    });
  } catch (e) {
    console.error("Error fetching budget:", e);
  }
});

module.exports = router;
