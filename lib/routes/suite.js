var debug = require("debug")("route:spec"),
    // uuid = require("node-uuid"),
    assert = require("assert"),
    Document = require("../services/document"),
    hc = require("hc"),
    util = require("util"),
    pattern = require("../utils/pattern"),
    github = require("../utils/github")(hc.get()),
    crypto = require("crypto"),
    _ = require("lodash");

var suiteMiddleware = function*() {
  var files, parsed, sandboxId, locals, ref;
  parsed = pattern.parseSuite(this.path);
  assert(parsed.repo.ref, "should have repo named in config: " + parsed.repo.name);
  assert(parsed.namespace, "should have namespace");
  try {
    files = yield github.repo.access({
      repo: parsed.repo.ref,
      path: parsed.subpath
    });
  } catch(e) {
    debug(files);
    return;//404
  }
  debug("running suite %s", parsed.repo.ref);
  if(!files) {
    this.redirect("/notfound");
  }
  if(!util.isArray(files)) {
    files = [files];
  }
  if(files.length) {//suites are valid, then craete a sandbox
    ref = this.query.ref || "master";
    locals = _.extend(parsed, {
      ref: ref
    });
    // if(parsed.subpath === "/") {//root
    //   locals.files = files.filter(function(f) {
    //     return f.type === "dir";
    //   });
    //   return yield this.render("repo_dir", locals);
    // }
    let sha1hash = crypto.createHash("sha1");
    sha1hash.update(parsed.subpath);
    sha1hash.update(ref);
    sandboxId = sha1hash.digest("hex");
    debug("sandbox %s", sandboxId);
    try {
      yield Document.get("sandboxes", sandboxId);
    } catch(e) {//404 goes here
      yield Document.put("sandboxes", sandboxId, locals, false);
    }
    locals.files = files;
    locals.sandboxId = sandboxId;
    // console.log(locals);
    return yield this.render("spec_view", locals);
  }
  this.redirect("/notfound");
};


module.exports = {
  middleware: function() {
    return suiteMiddleware;
  }
};