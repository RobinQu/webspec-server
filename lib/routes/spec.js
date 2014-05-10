var Router = require("koa-router"),
    assert = require("assert"),
    debug = require("debug")("route:spec"),
    db = require("../services/orchestrate"),
    util = require("util"),
    crypto = require("crypto"),
    Buffer = require("buffer").Buffer,
    spec = require("../utils/spec");

var router = new Router();
var format = util.format;


var fetchUser = function*(next) {
  var res, user;

  console.log(this.params);
  
  try {
    debug("find user %s", this.params.owner);
    res = yield db.get("users", this.params.owner);
  } catch(e) {
    return this.redirect("/");
  }
  user = res.body;
  if(user && user.accessToken) {
    this.github = require("../services/github")({accessToken: user.accessToken});
    this.owner = user;
    yield next;
  }
};

// run against .webspec of a repo
router.get("/spec/:owner/:repo/:ref", fetchUser, function*() {
  var webspec, owner, repo, ref, sha1hash, locals, sandboxId, files, repoPath;
  owner = this.params.owner;
  repo = this.params.repo;
  ref = this.params.ref;
  
  repoPath = [owner, repo].join("/");
  webspec = yield this.github.repo.access({
    repo: repoPath,
    path: ".webspec"
  });
  if(!webspec) {//404
    return;
  }
  try {
    webspec = JSON.parse(new Buffer(webspec.content, "base64").toString());
    spec.lint(webspec);
  } catch(e) {
    this.status = 400;
    this.body = {"message": "malformed .webspec file : " + e.message, "status": "error"};
    debug(e);
    return;
  }
  
  // find dir to expand
  files = yield spec.expand(repoPath, ref, webspec);
  
  locals = {
    repo: repo,
    owner: owner,
    ref: ref,
    runner: webspec.runner || "jasmine",
    webspec: webspec,
    sources: files.sources,
    specs: files.specs
  };
  
  sha1hash = crypto.createHash("sha1");
  sha1hash.update(JSON.stringify(locals));
  sandboxId = sha1hash.digest("hex");
  yield db.put("sandboxes", sandboxId, locals);
  locals.sandboxId = sandboxId;
  locals.title = format("Running .webspec for %s/%s at %s", owner, repo, ref);
  yield this.render("spec/webspec", locals);
});

// run aginst a sub folder or a single file
router.get(/^\/spec\/(.+)$/, fetchUser, function*() {
  var ps, repo, owner, subpath, ref, locals, files, sandboxId, sha1hash, runner;
  ps = this.params[0].split("/");
  owner = ps.shift();
  repo = ps.shift();
  ref = ps.shift();
  subpath = ps.join("/");
  assert(ref, "should have ref");
  assert(owner, "should have owner");
  assert(repo, "should have repo");
  assert(subpath, "should have file path");
  runner = this.query.runner || "jasmine";
  debug("run %s/%s %s, ref %s", owner, repo, subpath, ref);
  
  files = yield this.github.repo.access({
    repo: [owner, repo].join("/"),
    path: subpath,
    ref: ref
  });
  if(!files) {
    return;
  }
  if(!util.isArray(files)) {
    files = [files];
  }
  if(!files.length) {
    return;
  }
  locals = {
    repo: repo,
    owner: owner,
    path: subpath,
    ref: ref,
    runner: runner
  };
  sha1hash = crypto.createHash("sha1");
  sha1hash.update(JSON.stringify(locals));
  sandboxId = sha1hash.digest("hex");
  debug("sandbox %s", sandboxId);
  // filter and group files
  files = spec.group(files);
  // cache file list
  locals.sources = files.sources;
  locals.specs = files.specs;
  // create sandbox description
  yield db.put("sandboxes", sandboxId, locals);
  // save sandbox ID
  locals.sandboxId = sandboxId;
  locals.title = format("Test suites %s for %s/%s at %s - WebSpec", subpath, owner, repo, ref);
  yield this.render("spec/simple", locals);
});

module.exports = router;