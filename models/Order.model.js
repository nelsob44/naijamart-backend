const mongoose = require("mongoose");

const OrderSchema = new mongoose.Schema(
  {
    itemName: {
      type: String,
      required: true,
    },
    unitPrice: {
      type: Number,
      required: true,
    },
    itemQuantity: {
      type: Number,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    finalAmount: {
      type: Number,
      required: true,
    },
    transactionReference: {
      type: String,
      required: true,
    },
    buyerEmail: {
      type: String,
      required: true,
    },
    sellerEmail: {
      type: String,
      required: true,
    },
    buyerName: {
      type: String,
      required: true,
    },
    sellerName: {
      type: String,
      required: true,
    },
    isPaidFor: {
      type: Boolean,
      default: false,
    },
    isDispatched: {
      type: Boolean,
      default: false,
    },
    isCompleteTransaction: {
      type: Boolean,
      default: false,
    },
    shippingDetails: {
      type: String,
    },
  },
  { timestamps: true }
);

const Order = mongoose.model("order", OrderSchema);
module.exports = Order;
