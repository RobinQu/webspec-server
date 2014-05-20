var Router = require("koa-router"),
    assert = require("assert"),
    // hc = require("hc"),
    util = require("util"),
    uuid = require("node-uuid"),
    db = require("../db/orchestrate"),
    useragent = require("useragent"),
    mongo = require("../db/mongo"),
    debug = require("debug")("route:sandbox");

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
    layout: "layouts/empty"
  });
});

router.post("/sandboxes/:sandbox/reports", function*() {
  var report = this.request.body, sandbox, collection, res;
  
  assert(report.raw && report.raw.suites, "should have valid suites");
  debug("save report %s", report.uuid);
  res = yield db.get("sandboxes", this.params.sandbox);
  sandbox = res && res.body;
  assert(sandbox, "should have found sandbox");
  
  //setup uuid because we don't save uuid with `value` in orchestrate
  sandbox.uuid = this.params.sandbox;
  report.agent = useragent.lookup(this.header["user-agent"]);
  yield db.newEventBuilder()
    .from("sandboxes", sandbox.uuid)
    .type("report")
    .time(Date.now())
    .data(report);
    
  // save records to mongo for data mining
  collection = mongo.db.collection("reports");
  // push additional
  report.sandbox = {};
  ["uuid", "ref", "type", "subpath", "owner", "repo"].forEach(function(k) {
    if(sandbox[k]) {
      report.sandbox[k] = sandbox[k];
    }
  });
  if(sandbox.suite) {
    report.sandbox.suite = sandbox.suite.name;
  }
  yield collection.insert.bind(collection, report);
  this.status = 201;
});

module.exports = router;