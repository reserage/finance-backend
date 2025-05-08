const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const Record = require("./record.js");
const Category = require("./category.js");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    minlength: [2, "用戶名至少需要兩個字"],
    maxLength: [20, "用戶名最長20個字"],
  },
  googleId: {
    type: String,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  thumbnail: {
    type: String,
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
});

userSchema.virtual("records", {
  ref: "Record",
  localField: "_id",
  foreignField: "userid",
});

userSchema.methods.getRecords = async function () {
  return await Record.find({ userid: this._id });
};

userSchema.virtual("categories", {
  ref: "Category",
  localField: "_id",
  foreignField: "user",
});

userSchema.methods.getCategories = async function () {
  return await Category.find({ user: this._id });
};

userSchema.methods.deleteCategory = async function (categoryId) {
  const deletedCategory = await Category.findByIdAndDelete(categoryId);
  return deletedCategory;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
