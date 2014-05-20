var Router = require("koa-router"),
    debug = require("debug")("route:data"),
    report = require("../services/report");

var router = new Router();

/**
  Generate data aggregation for reports
 */
router.get("/data", function*() {
  debug("gen data");
  var result;
  console.log(this.query);
  result = yield report.aggregate(this.query);
  // console.log(result);
  // switch(this.accepts("json", "html", "text")) {
  // case "html":
  // case "text":
  //   yield this.render("data", result);
  //   break;
  // case "json":
  //   this.body = result;
  //   break;
  // }
  this.body = result;
});


module.exports = router;