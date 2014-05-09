var Router = require("koa-router"),
    router = new Router(),
    pattern = require("../utils/pattern");


// router.get(/\/new\/(.+)\/?/, function*() {
//   var p = this.params[0], parsed;
//   parsed = pattern.parseSuite(p);
//   yield this.render("spec_new", {
//     
//   });
// });

module.exports = router;