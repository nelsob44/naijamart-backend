const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  image: {
    type: [String],
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  minOrder: {
    type: Number,
    required: true,
  },
  sellerLocation: {
    type: String,
    required: true,
  },
  verifiedSeller: {
    type: Boolean,
    default: false,
  },
  furtherDetails: {
    type: ProductAndSellerDescriptionSchema,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  promoEndDate: {
    type: Date,
  },
});

const ProductAndSellerDescriptionSchema = new mongoose.Schema({
  productDetails: {
    type: String,
    required: true,
  },
  reviews: {
    type: Number,
    default: 0,
  },
  transactions: {
    type: Transactions,
  },
});

const Transactions = new mongoose.Schema({
  totalQuantities: {
    type: Number,
    default: 0,
  },
  totalBuyers: {
    type: Number,
    default: 0,
  },
  totalTransactions: {
    type: Number,
    default: 0,
  },
});

const Product = mongoose.model("product", ProductSchema);
module.exports = Product;
