const express = require("express");
const controller = require("./controller/index");

const router = express.Router();
router.post("/checkuser", controller.checkUser);
router.post("/register", controller.register);
router.post("/dashboard", controller.userDashboard);
router.post("/create-transaction", controller.sendSol);
router.post('/approve', controller.approve);
module.exports = router;
