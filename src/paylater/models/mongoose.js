const number = require("@hapi/joi/lib/types/number");
const mongoose = require("../../../services/mongoose");
const boolean = require("@hapi/joi/lib/types/boolean");

const User = mongoose.Schema(
  {
    publicKey: {
      type: String,
      required: true,
      unique: true,
    },
    signedMessage: {
      type: String,
      required: true,
    },
    maxBudget: {
      type: Number
    },
    status: {
      type: String,
      default: 'PENDING'
    }
  },
  {
    timestamps: true,
  }
);
mongoose.model("userModel", User, "user");
