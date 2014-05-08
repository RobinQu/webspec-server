var Router = require("koa-router"),
    assert = require("assert"),
    // fs = require("co-fs"),
    // path = require("path"),
    specfinder = require("../utils/spec_finder");
        
var sandboxRouter = new Router();

sandboxRouter.get("/:sandbox", function*() {
  var fp, files, repo, uuid;
  repo = this.query.repo;
  uuid = this.params.sandbox;
  assert(repo, "should have repo path");
  assert(uuid, "should have uuid");
  files = yield specfinder(repo);
  if(files.length) {
    return yield this.render("sandbox_runner", {
      specs: files,
      repo: fp,
      uuid: uuid
    });
  }
  this.redirect("/notfound");
});

module.exports = sandboxRouter;