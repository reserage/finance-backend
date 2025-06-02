const mongoose = require("mongoose");

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
    // default: Date.now,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  record: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Record",
  }],
});

const BookKeeping = mongoose.model("BookKeeping", bookKeepingSchema);
module.exports = BookKeeping;
