var Router = require("koa-router"),
    assert = require("assert"),
    hc = require("hc"),
    util = require("util"),
    uuid = require("node-uuid"),
    Document = require("../services/document"),
    debug = require("debug")("route:sandbox"),
    github = require("../utils/github")(hc.get());

var sandboxRouter = new Router();

sandboxRouter.get("/:sandbox", function*() {
  var files, sandbox, sandboxId;
  sandboxId = this.params.sandbox;
  try {
    let res = yield Document.get("sandboxes", sandboxId);
    sandbox = res.body;
    assert(sandbox, "should have found sandbox");
  } catch(e) {
    return;//404
  }
  files = yield github.repo.access({
    repo: sandbox.repo.ref,
    path: sandbox.subpath
  });
  if(util.isArray(files) && files.length) {
    return yield this.render("sandbox_runner", {
      files: files,
      sandbox: sandbox,
      report: uuid.v4()
    });
  }
  this.redirect("/notfound");
});

sandboxRouter.post("/:sandbox/reports/:report", function*() {
  var report = this.request.body, sandboxId;
  assert(report.suites, "should have valid suites");
  report.uuid = this.params.report;
  debug("save report %s", report.uuid);
  sandboxId = this.params.sandbox;
  yield Document.newEventBuilder()
    .from("sandboxes", sandboxId)
    .type("report")
    .time(Date.now())
    .data(report);
  this.status = 201;
});

module.exports = sandboxRouter;