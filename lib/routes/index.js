var Router = require("koa-router"),
    // conf = require("hc").get(),
    // crypto = require("crypto"),
    // _ = require("lodash"),
    // assert = require("assert"),
    debug = require("debug")("route:home");

var homeRouter = new Router();

homeRouter.get("/", function*() {
  debug("home");
  yield this.render("home");
});

exports.home = homeRouter;
exports.user = require("./user");