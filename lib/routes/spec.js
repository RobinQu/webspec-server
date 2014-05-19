var Router = require("koa-router"),
    assert = require("assert"),
    debug = require("debug")("route:spec"),
    db = require("../db/orchestrate"),
    util = require("util"),
    _ = require("lodash"),
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
  var webspec, owner, repo, ref, locals, sandboxId, files, repoPath, commits;
  owner = this.params.owner;
  repo = this.params.repo;
  ref = this.params.ref;
  repoPath = [owner, repo].join("/");
  
  try {
    this.github = yield github.make(owner);
  } catch(e) {
    this.flash = {alert: this.i18n.__("Repo owner not registered in WebSpec")};
    this.redirect("back");
    return;
  }
  
  if(ref === "master") {//convert master to actual hash
    commits = yield this.github.repo.commits({
      repo: repoPath
    });
    if(commits.length) {
      ref = commits[0].sha;
      // return this.redirect(["/spec", owner, repo, ref].join("/"));
    } else {
      this.flash = {alert: this.i18n.__("No commits found")};
      return this.redirect("back");
    }
  }
  
  try {
    webspec = yield wSpec.get(owner, repo, ref);
  } catch(e) {
    this.status = 400;
    this.flash = {alert: this.i18n.__(".webspec not found or malformed")};
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
    type: "webspec",
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
  var ps, repo, owner, subpath, ref, locals, files, sandboxId, runner, webspec, commits, repoPath;
  ps = this.params[0].split("/");
  owner = ps.shift();
  repo = ps.shift();
  ref = ps.shift();
  repoPath = [owner, repo].join("/");
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
  
  if(ref === "master") {//convert master to actual hash
    commits = yield this.github.repo.commits({
      repo: repoPath,
      path: subpath
    });
    if(commits.length) {
      ref = commits[0].sha;
      // return this.redirect(["/spec", owner, repo, ref, subpath].join("/"));
    } else {
      this.flash = {alert: this.i18n.__("No commits found")};
      return this.redirect("back");
    }
  }
  
  try {
    webspec = yield wSpec.get(owner, repo, ref);
  } catch(e) {//webspec can be empty in this senario
  }
  
  files = yield this.github.repo.access({
    repo: repoPath,
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
  // console.log(webspec);
  files = spec.group(files);
  locals = {
    repo: repo,
    owner: owner,
    path: subpath,
    ref: ref,
    runner: runner,
    sources: webspec ? webspec.sources.concat(files.sources) : files.sources,
    specs: files.specs,
    type: "subspec"
  };
  sandboxId = yield sandbox.create(locals);
  // save sandbox ID
  locals.sandboxId = sandboxId;
  locals.title = format("Test suites %s for %s/%s at %s - WebSpec", subpath, owner, repo, ref);
  yield this.render("spec/simple", locals);
});


/**
  Inspec spec info, revisions, and reports. Two situations:
  1. Webspec repo: 
    webspec
 */
router.get("/inspect", function*() {
  var repo, owner, ref, subpath, commits = [], repoPath, res, sandbox, query = [];
  
  repo = this.query.repo;
  assert(repo, "should have repo");
  ref = this.query.ref;
  // assert(ref, "should have ref");
  owner = this.query.owner;
  assert(owner, "should have owner");
  subpath = this.query.subpath;
  
  repoPath = [owner, repo].join("/");
  
  
  try {
    this.github = yield github.make(owner);
  } catch(e) {
    this.flash = {alert: this.i18n.__("Repo owner not registered in WebSpec")};
    this.redirect("back");
    return;
  }
  
  // find out latest commits
  commits = yield this.github.repo.commits({
    repo: repoPath,
    path: subpath || "/"
  });
  if(!commits.length) {
    this.flash = {alert: this.i18n.__("No commits found")};
    return this.redirect("back");
  }
  
  if(ref) {//find sandbox by ref
    query.push(format("value.ref:\"%s\"", ref));
    query.push(format("value.type:\"%s\"", subpath ? "subspec" : "webspec"));
    if(subpath) {
      query.push(format("value.subpath:\"%s\"", subpath));
    }
    res = yield db.search("sandboxes", query.join(" AND "));
    sandbox = res && res.body && res.body.results[0] && res.body.results[0].value;
    assert(sandbox, "should have found sandbox");
  }
  
  yield this.render("spec/inspect", _.extend(this.query, {
    title: format("Inspect %s %s at %s - Webspec", owner, repo, subpath || "/"),
    commits: commits,
    sandbox: sandbox,
    subpath: subpath || "",
    ref: ref || "master"
  }));
  
});

module.exports = router;