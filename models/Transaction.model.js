const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      default: 0,
    },
    buyer: {
      type: String,
      required: true,
    },
    seller: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("transaction", TransactionSchema);
module.exports = Transaction;
