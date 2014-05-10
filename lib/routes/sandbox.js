var Router = require("koa-router"),
    assert = require("assert"),
    // hc = require("hc"),
    util = require("util"),
    uuid = require("node-uuid"),
    db = require("../services/orchestrate"),
    debug = require("debug")("route:sandbox");
    // github = require("../services/github")();

var router = new Router(),
    format = util.format;

router.get("/sandboxes/:sandbox", function*() {
  var sandbox, sandboxId, res;
  sandboxId = this.params.sandbox;
  res = yield db.get("sandboxes", sandboxId);
  sandbox = res.body;
  if(!sandbox) {
    return;
  }
  yield this.render("sandbox/show", {
    sandbox: sandbox,
    report: uuid.v4(),
    title: format("Sandbox %s - Wepbspec", sandboxId),
    layout: false
  });
});

router.post("/sandboxes/:sandbox/reports", function*() {
  var report = this.request.body, sandboxId;
  assert(report.raw && report.raw.suites, "should have valid suites");
  debug("save report %s", report.uuid);
  sandboxId = this.params.sandbox;
  yield db.newEventBuilder()
    .from("sandboxes", sandboxId)
    .type("report")
    .time(Date.now())
    .data(report);
  this.status = 201;
});

module.exports = router;