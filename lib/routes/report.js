var Router = require("koa-router"),
    Document = require("../services/document"),
    assert = require("assert");

var reportRouter = new Router();

reportRouter.post("/:spec", function*() {
  var report = this.request.body;
  assert(report, "should have something in report");
  yield Document.put("reports", report, false);
});

module.exports = reportRouter;