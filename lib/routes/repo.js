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
      path: parsed.subpath || "/",
      ref: this.query.ref
    });
  } catch(e) {
    debug(res);
    return;//404
  }
  if(util.isArray(res)) {//render file list
    locals = Object.create(parsed);
    locals.files = res.filter(function(f) {
      if(f.type === "file") {
        return f.name.indexOf(".js") > -1;
      }
      return true;
    });
    res = yield github.repo.commit({
      conditions: {path: parsed.subpath || "/"},
      repo: parsed.repo.ref
    });
    locals.commits = res.body.slice(0,10);
    locals.ref = this.query.ref || "";
    return yield this.render("repo_dir", locals);
  }
  assert(res.content, "should have response content");
  var buf = new Buffer(res.content, "base64");
  this.body = buf;
  
};


module.exports = {
  middleware: function() {
    return repoMiddleware;
  }
};