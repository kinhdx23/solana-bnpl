const express = require("express");
const controller = require("./controller/index");

const router = express.Router();
router.post("/checkuser", controller.checkUser);
router.post("/register", controller.register);
router.post("/dashboard", controller.userDashboard);
router.post("/sendsol", controller.sendSol);

module.exports = router;
