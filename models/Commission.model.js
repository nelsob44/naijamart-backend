const mongoose = require("mongoose");

const CommissionSchema = new mongoose.Schema(
  {
    regularRate: {
      type: Number,
      default: 1,
    },
    premiumRate: {
      type: Number,
      default: 2,
    },
    lastUpdatedBy: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Commission = mongoose.model("commission", CommissionSchema);
module.exports = Commission;
