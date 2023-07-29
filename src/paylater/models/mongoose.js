const mongoose = require("../../../services/mongoose");

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
  },
  {
    timestamps: true,
  }
);
mongoose.model("userModel", User, "user");
