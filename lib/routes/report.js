var Router = require("koa-router"),
    Document = require("../services/document"),
    assert = require("assert"),
    debug = require("debug")("route:report");

var reportRouter = new Router();

reportRouter.post("/:report", function*() {
  var report = this.request.body,
      uuid = this.params.report,
      res;
      
  debug("uuid %s, repo %s", uuid, report.repo);
  if(report.raw) {//valid
    assert(report, "should have something in report");
    assert(uuid, "should have uiud");
    res = yield Document.put("reports", uuid, report, false);
    this.body = {"status": "ok", response: res};
  } else {
    this.body = {"status": "error"};
  }
});

module.exports = reportRouter;