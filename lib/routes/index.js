var Router = require("koa-router");

var homeRouter = new Router();

homeRouter.get("/", function*() {
  // this.body = "home";
});

exports.home = homeRouter;
exports.suite = require("./suite");
exports.sandbox = require("./sandbox");
exports.repo = require("./repo");
