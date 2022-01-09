const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const MessageSchema = new Schema(
  {
    messageFrom: {
      type: String,
      required: true,
    },
    messageTo: {
      type: String,
      required: true,
    },
    messageSession: {
      type: [],
      required: true,
    },
    messageDetails: {
      type: String,
    },
    messageImages: {
      type: [String],
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);
