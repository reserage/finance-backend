const mongoose = require("mongoose");
const Category = require("./category");

const bookKeepingSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: "",
  },
  date: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  record: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Record",
    },
  ],
  categoryBudget: {
    type: Map,
    of: Number,
    default: {},
  },
});

const BookKeeping = mongoose.model("BookKeeping", bookKeepingSchema);
module.exports = BookKeeping;
