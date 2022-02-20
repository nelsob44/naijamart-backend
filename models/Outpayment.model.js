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
    bankName: {
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
  },
  { timestamps: true }
);

const Outpayment = mongoose.model("outpayment", OutpaymentSchema);
module.exports = Outpayment;
