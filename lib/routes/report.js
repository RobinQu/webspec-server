var Router = require("koa-router"),
    Document = require("../services/document"),
    assert = require("assert");

var reportRouter = new Router();

reportRouter.post("/:report", function*() {
  var report = this.request.body,
      uuid = this.params.report;
  assert(report, "should have something in report");
  assert(uuid, "should have uiud");
  yield Document.put("reports", uuid, report, false);
});

module.exports = reportRouter;