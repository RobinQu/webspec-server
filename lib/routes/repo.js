var assert = require("assert"),
    debug = require("debug")("route:repo"),
    hc = require("hc"),
    util = require("util"),
    Buffer = require("buffer").Buffer,
    pattern = require("../utils/pattern");



var conf = hc.get();
var github = require("../utils/github")(conf);

var repoMiddleware = function*() {
  var parsed = pattern.parseSuite(this.path);
  var res, locals;
  assert(parsed.repo.ref, "should have repo named in config: " + parsed.repo.name);
  try {
    res = yield github.repo.access({
      repo: parsed.repo.ref,
      path: parsed.subpath
    });
  } catch(e) {
    debug(res);
    return;//404
  }
  if(util.isArray(res)) {//render file list
    locals = Object.create(parsed);
    locals.files = res;
    return yield this.render("repo_dir", locals);
  }
  
  var buf = new Buffer(res.content, "base64");
  this.body = buf;
  
};


module.exports = {
  middleware: function() {
    return repoMiddleware;
  }
};