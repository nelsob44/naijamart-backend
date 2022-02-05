const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema(
  {
    cookieValue: {
      type: String,
      required: true,
    },
    tokenValue: {
      type: String,
      required: true,
    },
    metaData: {
      type: String,
    },
  },
  { timestamps: true }
);

const Token = mongoose.model("token", TokenSchema);
module.exports = Token;
