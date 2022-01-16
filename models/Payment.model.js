const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
    },
    transactionReference: {
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

const Payment = mongoose.model("payment", PaymentSchema);
module.exports = Payment;
