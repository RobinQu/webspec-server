var fs = require("co-fs"),
    glob = require("glob"),
    thunkify = require("thunkify"),
    path = require("path"),
    debug = require("debug")("route:spec");
    
var specRouter = {};

var repoPath = path.join(__dirname, "../../assets/repos");

var specGenerator = function*() {
  var ok, stats, fp, files;
  fp = path.join(repoPath, this.path);
  ok = yield fs.exists(fp);
  stats = yield fs.stat(fp);
  debug("spec folder %s; ok: %s, dir: %s", fp, ok, stats.isDirectory());
  if(ok && stats.isDirectory()) {
    files = yield thunkify(glob)(fp + "**/*.js");
    files = files.map(function(file) {
      return "/repos" + file.replace(repoPath, "");
    });
    return yield this.render("spec_runner", {
      specs: files,
      repo: fp
    });
  }
  this.redirect("/notfound");
};

specRouter.middleware = function() {
  return specGenerator;
};


module.exports = specRouter;