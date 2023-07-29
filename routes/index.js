const paylater = require("../src/paylater/routes");

module.exports = (app) => {
  app.use("/paylater", paylater);
  app.use("*", (req, res) => {
    res.send("Not found!!!");
  });
};
