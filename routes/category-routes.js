const express = require("express");
const router = express.Router();
const Category = require("../models/category.js");
const mongoose = require("mongoose");
const User = require("../models/user");
const BookKeeping = require("../models/bookKeeping.js");
const CategoryBudget = require("../models/budget.js");

// const userId = '6815c5bd9bc92882cefd2306'; // 測試用

router.get("/getCategories", async (req, res) => {
  try {
    const userId = req.user._id;
    const category = await Category.find({ user: userId });
    console.log(category);
    return res.json({ message: "取得資料成功", categories: category });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "取得資料失敗" });
  }
});

router.get("/getCategoriesByBook", async (req, res) => {
  try {
    const bookId = req.query.bookId;

    const category = await BookKeeping.findById(bookId).populate("category");

    return res.json({ message: "取得資料成功", categories: category.category });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "取得資料失敗" });
  }
});

router.post("/update", async (req, res) => {
  try {
    const incomeCategories = req.body.incomeCategories;
    const expenseCategories = req.body.expenseCategories;
    const userId = req.user._id;
    // const userId = '6815c5bd9bc92882cefd2306'; // 測試用
    // console.log(req.body);
    // console.log(incomeCategories);
    // console.log(Array.isArray(incomeCategories));

    incomeCategories.forEach((income, index) => {
      const category = new Category({
        name: income.name,
        isIncome: true,
        user: userId,
      });

      category.save();
      console.log("category: ", category, "index: ", index);
    });

    expenseCategories.forEach((expense) => {
      const category = new Category({
        name: expense.name,
        isIncome: false,
        user: userId,
      });
      category.save();
    });

    return res.json({ message: "更新成功" });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "更新失敗" });
  }
});

router.post("/addCategory", async (req, res) => {
  try {
    const { name, isIncome } = req.body;
    const userId = req.user._id;

    const checkCategory = await Category.findOne({
      user: userId,
      name,
    });

    if (checkCategory)
      return res
        .status(409)
        .json({ message: "資料庫已有同名的類別，請更換名字" });
    else {
      const newCategory = new Category({
        name,
        isIncome,
        user: userId,
      });
      const savedCategory = await newCategory.save();
      return res.json({ message: "新增成功", savedCategory });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "新增失敗" });
  }
});

router.delete("/deleteCategory/:id", async (req, res) => {
  try {
    // deleteCategoryId 是陣列
    const deleteCategoryId = req.params.id;
    const userId = req.user._id;
    const user = await User.findById(userId);
    console.log("deleteCategoryId:", deleteCategoryId);

    await user.deleteCategory(deleteCategoryId);
    console.log("已刪除類別的ID:", deleteCategoryId);

    return res.json({ message: "刪除成功" });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "刪除失敗" });
  }
});

router.patch("/setCategoryBudget", async (req, res) => {
  const { bookId, setCategoryBudgetId, budgetValue } = req.body;
  const userId = req.user._id;
  try {
    const budgetDocument = await CategoryBudget.findOne({
      bookkeeping: bookId,
      user: userId,
    });
    if (!budgetDocument)
      return res
        .status(404)
        .json({ message: "未找到該記帳本的budget Document" });

    console.log(
      "bookId: ",
      bookId,
      "setCategoryBudgetId: ",
      typeof setCategoryBudgetId,
      "budgetValue: ",
      typeof +budgetValue
    );
    budgetDocument.budget.set(setCategoryBudgetId, +budgetValue);
    await budgetDocument.save();

    return res.json({
      message: "預算設定成功",
      budget: budgetDocument.budget,
    });
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "預算設定失敗" });
  }
});

router.get("/getCategoriesBudgetByBook", async (req, res) => {
  try {
    const bookId = req.query.bookId;
    const userId = req.user._id;
    const categoriesBudget = await CategoryBudget.findOne({
      bookkeeping: bookId,
      user: userId,
    });
    if (!categoriesBudget) {
      console.log("該記帳本沒有設定預算，將建立新的預算設定");
      const newCategoriesBudget = new CategoryBudget({
        bookkeeping: bookId,
        user: userId,
      });
      const budget = (await newCategoriesBudget.save()).budget;
      return res.json({
        message: "取得預算成功，已建立新的預算設定",
        categoriesBudget: budget,
      });
    } else {
      return res.json({
        message: "取得預算成功",
        categoriesBudget: categoriesBudget.budget,
      });
    }
  } catch (e) {
    console.log(e);
    return res.status(500).json({ message: "取得預算失敗" });
  }
});

module.exports = router;
