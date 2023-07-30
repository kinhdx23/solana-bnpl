
// import {Payload, Header, SIWS} from '@web3auth/sign-in-with-solana'
const {Payload, Header, SIWS} = require('@web3auth/sign-in-with-solana')
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const config = require("../../../config");
require("../models/mongoose");
const User = mongoose.model("userModel");
const {
  Account,
  Keypair,
  Connection,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  LAMPORTS_PER_SOL,
  PublicKey,
} = require("@solana/web3.js");
const bs58 = require("bs58");
const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

// module.exports.register = async (res, parameters) => {
//   const { password, passwordConfirmation, email, username, name, lastName } =
//     parameters;

//   try {
//     return res.status(200).json({ status: "OK" });
//   } catch (error) {
//     return res.status(400).json({
//       status: 400,
//       message: error,
//     });
//   }
// };

// module.exports.userDashboard = async (res, parameters) => {
//   const { password, passwordConfirmation, email, username, name, lastName } =
//     parameters;

//   try {
//     return res.status(200).json({ status: "OK" });
//   } catch (error) {
//     return res.status(400).json({
//       status: 400,
//       message: error,
//     });
//   }
// };

module.exports.createTransaction = async (req, res) => {
  // const {signed, }
  const isValid = validateSignedMessage()
}

module.exports.sendSol = async (req, res) => {
  try {
    const { sourcePrivateKey, destinationAddress, amount } = req.body;

    //const sourcePrivateKeyBuffer = Buffer.from(sourcePrivateKey, 'hex');

    //const sourceAccount = new Account(sourcePrivateKeyBuffer);

    const sourceAccount = Keypair.fromSecretKey(
      bs58.decode(
        "4skzfpuQrCZePP7XRRmsgTdhciPPDpEqpvr1UaguPeMkq2TxT8HMP9CrctfyHoEzvgkLopXMFPZqSQDMBSyHreqR"
      )
    );

    // Lấy thông tin tài khoản đích từ địa chỉ
    const destinationPublicKey = new PublicKey(destinationAddress);

    // Lấy thông tin tài khoản nguồn từ tài khoản đã tạo từ khóa riêng tư
    const sourceAccountInfo = await connection.getAccountInfo(
      sourceAccount.publicKey
    );

    // Kiểm tra số dư của tài khoản nguồn
    if (sourceAccountInfo && sourceAccountInfo.lamports >= amount) {
      // Tạo giao dịch chuyển tiền
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: sourceAccount.publicKey,
          toPubkey: destinationPublicKey,
          lamports: 0.001 * LAMPORTS_PER_SOL,
        })
      );

      // Ký giao dịch bằng khóa riêng tư của tài khoản nguồn
      const signedTransaction = await connection.sendTransaction(transaction, [
        sourceAccount,
      ]);

      console.log(`signedTransaction` + signedTransaction);

      // Xác nhận giao dịch
      await connection.confirmTransaction(signedTransaction);

      res.json({ status: "success", message: "Transaction successful!" });
    } else {
      res.json({
        status: "error",
        message: "Insufficient balance in the source account.",
      });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred.",
      error: error.message,
    });
  }
};

// Endpoint để kiểm tra Public Key đã được đăng ký trong Database hay chưa
module.exports.checkUser = async (req, res) => {
  try {
    const { publicKey, lendAmount } = req.body; // Public Key từ dữ liệu gửi lên

    // Tìm người dùng với Public Key tương ứng trong Database
    const user = await User.findOne({ publicKey });

    if (user) {
      res.status(200)
        .json({
          isRegister: true,
          canLend: user.maxBudget > lendAmount
        })
    } else {
      res
        .status(200)
        .json({ 
          isRegister: false,
          canLend: false
         });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "error_occurred",
      error: error.message,
    });
  }
};

module.exports.approve = async (req, res) => {
  const {publicKey, status} = req.body;
  const user = User.findOne({publicKey});
  if (user) {
    user.status = status
    user.save()
    res.status(200).json({
      status: "success",
      message: "approve_success"
    })
  } else {
    res.status(400).json({
      status: "fail",
      message: "user_not_found"
    })
  }
}

// Endpoint để đăng ký người dùng với Public Key và Signed message
module.exports.register = async (req, res) => {
  try {
    const { publicKey, signedMessage } = req.body; // Public Key và Signed message từ dữ liệu gửi lên

    // Xác thực thông tin người dùng bằng cách kiểm tra Signed message
    const isValid = await validateSignedMessage(publicKey, signedMessage);
    if (!isValid) {
      return res
        .status(401)
        .json({ status: "error", message: "Invalid Signed message." });
    }

    const maxBudget = 10;

    // Tạo người dùng mới trong cơ sở dữ liệu
    const user = new User({ publicKey, signedMessage, maxBudget});
    await user.save();

    res.json({ status: "success", message: "User registered successfully." });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred.",
      error: error.message,
    });
  }
};

// Hàm để xác thực thông tin người dùng bằng Signed message
async function validateSignedMessage(publicKey, signedMessage) {
  // Cài đặt thông tin kết nối với mạng Solana (đổi lại với địa chỉ cluster Solana của bạn)
  // const connection = new web3.Connection(
  //   "https://api.devnet.solana.com",
  //   "confirmed"
  // );

  // Lấy public key từ signed message
  const verifiedPublicKey = await PublicKey.createWithSeed(
    publicKey,
    signedMessage
  );

  // Kiểm tra tính hợp lệ của public key
  return publicKey === verifiedPublicKey.toBase58();
}

// Endpoint để đăng nhập và xác thực thông tin người dùng
module.exports.userDashboard = async (req, res) => {
  try {
    const { publicKey, signedMessage } = req.body; // Public Key và Signed message từ dữ liệu gửi lên

    // Tìm người dùng với Public Key tương ứng trong Database
    const user = await User.findOne({ publicKey });

    if (user) {
      // Xác thực thông tin người dùng bằng cách kiểm tra Signed message
      const isValid = await validateSignedMessage(publicKey, signedMessage);
      if (isValid) {
        res.json({
          status: "success",
          message: "User logged in successfully.",
        });
      } else {
        res
          .status(401)
          .json({ status: "error", message: "Invalid Signed message." });
      }
    } else {
      res.status(404).json({ status: "error", message: "User not found." });
    }
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "An error occurred.",
      error: error.message,
    });
  }
};
