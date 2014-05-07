var Router = require("koa-router");

var homeRouter = new Router();

homeRouter.get("/", function*() {
  // this.body = "home";
});

exports.home = homeRouter;
exports.report = require("./report");
exports.spec = require("./spec");
