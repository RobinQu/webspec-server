var debug = require("debug")("route:spec"),
    uuid = require("node-uuid"),
    specfinder = require("../utils/spec_finder");
    
var specRouter = {};

var specGenerator = function*() {
  var files, repo;
  repo = this.path;
  debug("view spec %s", repo);
  files = yield specfinder(repo);
  if(files.length) {
    return yield this.render("spec_view", {
      specs: files,
      repo: repo,
      uuid: uuid.v4()
    });
  }
  this.redirect("/notfound");
};

specRouter.middleware = function() {
  return specGenerator;
};

module.exports = specRouter;