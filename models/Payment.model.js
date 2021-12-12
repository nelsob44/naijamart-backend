const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  purpose: {
    type: String,
    required: true,
  },
  time: {
    type: Date,
    default: Date.now(),
  },
  paymentFrom: {
    type: String,
    required: true,
  },
  paymentTo: {
    type: String,
    required: true,
  },
});

const Payment = mongoose.model("payment", PaymentSchema);
module.exports = Payment;
