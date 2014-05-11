var Router = require("koa-router"),
    assert = require("assert"),
    debug = require("debug")("route:spec"),
    // db = require("../services/orchestrate"),
    util = require("util"),
    // crypto = require("crypto"),
    // Buffer = require("buffer").Buffer,
    github = require("../services/github"),
    sandbox = require("../services/sandbox"),
    spec = require("../utils/spec"),
    wSpec = require("../services/webspec");

var router = new Router();
var format = util.format;

// run against .webspec of a repo
router.get("/spec/:owner/:repo/:ref", function*() {
  var webspec, owner, repo, ref, locals, sandboxId, files, repoPath;
  owner = this.params.owner;
  repo = this.params.repo;
  ref = this.params.ref;
  repoPath = [owner, repo].join("/");
  
  try {
    this.github = yield github.make(owner);
  } catch(e) {
    this.flash = {alert: "Repo owner not registered in WebSpe"};
    this.redirect("back");
    return;
  }
  
  try {
    webspec = yield wSpec.get(owner, repo, ref);
  } catch(e) {
    this.status = 400;
    this.flash = {alert:".webspec not found or malformed"};
    this.redirect("back");
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
  
  sandboxId = yield sandbox.create(locals);
  locals.sandboxId = sandboxId;
  locals.title = format("Running .webspec for %s/%s at %s", owner, repo, ref);
  yield this.render("spec/webspec", locals);
});

// run aginst a sub folder or a single file
router.get(/^\/spec\/(.+)$/, function*() {
  var ps, repo, owner, subpath, ref, locals, files, sandboxId, runner, webspec;
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
  
  try {
    this.github = yield github.make(owner);
  } catch(e) {
    this.flash = {alert: "Repo owner not registered in WebSpe"};
    this.redirect("back");
    return;
  }
  
  try {
    webspec = yield wSpec.get(owner, repo, ref);
  } catch(e) {//webspec can be empty in this senario
  }
  
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
  console.log(webspec);
  files = spec.group(files);
  locals = {
    repo: repo,
    owner: owner,
    path: subpath,
    ref: ref,
    runner: runner,
    sources: webspec ? webspec.sources.concat(files.sources) : files.sources,
    specs: files.specs
  };
  sandboxId = yield sandbox.create(locals);
  // save sandbox ID
  locals.sandboxId = sandboxId;
  locals.title = format("Test suites %s for %s/%s at %s - WebSpec", subpath, owner, repo, ref);
  yield this.render("spec/simple", locals);
});

module.exports = router;