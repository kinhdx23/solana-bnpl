// import {Payload, Header, SIWS} from '@web3auth/sign-in-with-solana'
const { Payload, Header, SIWS } = require("@web3auth/sign-in-with-solana");
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
const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const axios = require("axios");

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

module.exports.sendSol = async (req, res) => {
  const { merchant, amount, intentSecretKey, sessionId } = req.body;
  try {
    //const sourcePrivateKeyBuffer = Buffer.from(sourcePrivateKey, 'hex');

    //const sourceAccount = new Account(sourcePrivateKeyBuffer);

    const sourceAccount = Keypair.fromSecretKey(
      bs58.decode(
        "4skzfpuQrCZePP7XRRmsgTdhciPPDpEqpvr1UaguPeMkq2TxT8HMP9CrctfyHoEzvgkLopXMFPZqSQDMBSyHreqR"
      )
    );

    // Lấy thông tin tài khoản đích từ địa chỉ
    const destinationPublicKey = new PublicKey(merchant);

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
          lamports: (amount / 24) * LAMPORTS_PER_SOL,
        })
      );

      // Ký giao dịch bằng khóa riêng tư của tài khoản nguồn
      const signedTransaction = await connection.sendTransaction(transaction, [
        sourceAccount,
      ]);

      console.log(`signedTransaction` + signedTransaction);

      // Xác nhận giao dịch
      await connection.confirmTransaction(signedTransaction);

      // update candypay transaction
      const config = {
        method: "patch",
        maxBodyLength: Infinity,
        url: "https://candypay-checkout-production.up.railway.app/api/v1/intent",
        headers: {
          authority: "candypay-checkout-production.up.railway.app",
          accept: "application/json, text/plain, */*",
          "accept-language": "en,vi;q=0.9,ja;q=0.8",
          authorization: "Bearer " + intentSecretKey,
          "content-type": "application/json",
          origin: "http://localhost:3000",
          referer: "http://localhost:3000/",
          "sec-ch-ua":
            '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"macOS"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "cross-site",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        },
        data: {
          session: sessionId,
          signature: signedTransaction,
          timestamp: new Date().toISOString(),
        },
      };
      const response = await axios.request(config);
      if (!response.error) {
        res.json({ status: "success", message: "Transaction successful!" });
      } else {
        res.json({
          status: "error",
          message: "error_when_update_candypay_transaction",
        });
      }
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
      res.status(200).json({
        isRegister: true,
        status: user.status,
        canLend: user.maxBudget > lendAmount,
      });
    } else {
      res.status(200).json({
        isRegister: false,
        canLend: false,
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
  const { publicKey, status } = req.body;
  const user = User.findOne({ publicKey });
  if (user) {
    user.status = status;
    user.save();
    res.status(200).json({
      status: "success",
      message: "approve_success",
    });
  } else {
    res.status(400).json({
      status: "fail",
      message: "user_not_found",
    });
  }
};

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
    console.log({ publicKey, maxBudget, signedMessage });
    // Tạo người dùng mới trong cơ sở dữ liệu
    const user = new User({ publicKey, signedMessage, maxBudget });
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

  // // Lấy public key từ signed message
  // const verifiedPublicKey = await web3.PublicKey.createWithSeed(
  //   publicKey,
  //   signedMessage
  // );

  // // Kiểm tra tính hợp lệ của public key
  // return publicKey === verifiedPublicKey.toBase58();
  return true;
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
