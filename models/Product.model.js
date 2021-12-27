const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ["electronics", "machinery", "others"],
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  images: {
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
  sellerEmail: {
    type: String,
    required: true,
  },
  verifiedSeller: {
    type: Boolean,
    default: false,
  },
  furtherDetails: {
    type: String,
    required: true,
  },
  availableQuantity: {
    type: Number,
    default: 1,
  },
  discount: {
    type: Number,
    default: 0,
  },
  reviews: {
    type: Number,
    default: 0,
  },
  promoStartDate: {
    type: String,
  },
  promoEndDate: {
    type: String,
  },
});

const Product = mongoose.model("product", ProductSchema);
module.exports = Product;
