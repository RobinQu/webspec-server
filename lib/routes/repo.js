var assert = require("assert"),
    debug = require("debug")("route:repo"),
    hc = require("hc"),
    util = require("util"),
    Buffer = require("buffer").Buffer;



var conf = hc.get();
var github = require("../utils/github")(conf);


var repoMiddleware = function*() {
  var ps = this.path.split("/");
  ps.shift();
  var repoName = ps.shift();
  var namespace = ps[0];
  // var subpath = ps.join("/");
  var subpath = ps.join("/");
  var repo = conf.site.repos[repoName];
  var res;
  assert(repoName, "should have repo named in config: " + repoName);
  try {
    res = yield github.repo.access({
      repo: repo,
      path: subpath
    });
  } catch(e) {
    debug(res);
    return;//404
  }
  if(util.isArray(res)) {//render file list
    return yield this.render("repo_dir", {
      files: res,
      currentPath: subpath,
      namespace: namespace,
      repo: repoName
    });
  }
  
  var buf = new Buffer(res.content, "base64");
  this.body = buf;
  
};


module.exports = {
  middleware: function() {
    return repoMiddleware;
  }
};