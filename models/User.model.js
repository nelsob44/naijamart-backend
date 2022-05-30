const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    profilePic: {
      type: [String],
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    country: {
      type: String,
      required: true,
    },
    city: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    userDeviceType: {
      type: String,
    },
    userIpAddress: {
      type: String,
    },
    lastLoginTime: {
      type: String,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    extraUserData: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    privilegeLevel: {
      type: String,
      enum: ["consumer", "customer", "admin"],
      default: "consumer",
    },
    refreshToken: {
      type: String,
      default: "token",
    },
    resetPasswordToken: {
      type: String,
    },
    bankCode: {
      type: String,
      default: "none",
    },
    bankAccountNumber: {
      type: Number,
      default: 0000000000,
    },
  },
  { timestamps: true }
);

const User = mongoose.model("user", UserSchema);
module.exports = User;
