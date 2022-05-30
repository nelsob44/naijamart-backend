const mongoose = require("mongoose");

const OutpaymentSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
    },
    recepientName: {
      type: String,
      required: true,
    },
    recepientEmail: {
      type: String,
      required: true,
    },
    bankCode: {
      type: String,
      required: true,
    },
    bankAccountNumber: {
      type: Number,
      required: true,
    },
    transactionReference: {
      type: String,
      required: true,
    },
    temporaryPause: {
      type: Boolean,
      default: false,
    },
    isCompleteTransaction: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const Outpayment = mongoose.model("outpayment", OutpaymentSchema);
module.exports = Outpayment;
