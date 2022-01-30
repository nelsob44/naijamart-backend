const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    userEmail: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    transactionReference: {
      type: String,
      required: true,
    },
    transactionType: {
      type: String,
      required: true,
    },
    paymentFrom: {
      type: String,
      required: true,
    },
    paymentTo: {
      type: String,
      required: true,
    },
    isCompleteTransaction: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("transaction", TransactionSchema);
module.exports = Transaction;
