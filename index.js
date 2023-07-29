const express = require('express');
const bodyParser = require('body-parser');
const { Account, Keypair, Connection, SystemProgram, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL, PublicKey } = require('@solana/web3.js');
const bs58 = require("bs58");

const app = express();
const port = 3000; 

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

app.use(bodyParser.json());

// Endpoint để gửi Sol từ ví nguồn đến ví đích
app.post('/send-sol', async (req, res) => {
  try {
    const { sourcePrivateKey, destinationAddress, amount } = req.body;

    //const sourcePrivateKeyBuffer = Buffer.from(sourcePrivateKey, 'hex');

    //const sourceAccount = new Account(sourcePrivateKeyBuffer);

    const sourceAccount = Keypair.fromSecretKey(
        bs58.decode("4skzfpuQrCZePP7XRRmsgTdhciPPDpEqpvr1UaguPeMkq2TxT8HMP9CrctfyHoEzvgkLopXMFPZqSQDMBSyHreqR")
    );

    // Lấy thông tin tài khoản đích từ địa chỉ
    const destinationPublicKey = new PublicKey(destinationAddress);

    // Lấy thông tin tài khoản nguồn từ tài khoản đã tạo từ khóa riêng tư
    const sourceAccountInfo = await connection.getAccountInfo(sourceAccount.publicKey);

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
      const signedTransaction = await connection.sendTransaction(transaction, [sourceAccount]);

      console.log(`signedTransaction` + signedTransaction);

      // Xác nhận giao dịch
      await connection.confirmTransaction(signedTransaction);
      
      res.json({ status: 'success', message: 'Transaction successful!' });
    } else {
      res.json({ status: 'error', message: 'Insufficient balance in the source account.' });
    }
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'An error occurred.', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
