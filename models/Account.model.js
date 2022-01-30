const mongoose = require("mongoose");

const AccountSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    accountType: {
      type: String,
      enum: ["regular", "merchant", "admin"],
      default: "regular",
    },
    currentBalance: {
      type: Number,
      default: 0,
    },
    lastCreditFrom: {
      type: String,
      default: "none",
    },
    lastPaymentTo: {
      type: String,
      default: "none",
    },
    lastTransactionAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Account = mongoose.model("account", AccountSchema);
module.exports = Account;
