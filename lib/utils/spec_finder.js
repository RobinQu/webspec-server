var fs = require("co-fs"),
    glob = require("glob"),
    thunkify = require("thunkify"),
    path = require("path"),
    co = require("co"),
    debug = require("debug")("util:specfinder");

var repoPath = path.join(__dirname, "../../assets/repos");

module.exports = thunkify(co(function*(fp) {
  var ok, stats, files = [];
  fp = path.join(repoPath, fp);
  ok = yield fs.exists(fp);
  stats = yield fs.stat(fp);
  debug("spec folder %s; ok: %s, dir: %s", fp, ok, stats.isDirectory());
  if(ok && stats.isDirectory()) {
    files = yield thunkify(glob)(fp + "**/*.js");
  }
  return files;
}));