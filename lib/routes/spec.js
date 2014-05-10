var Router = require("koa-router"),
    assert = require("assert"),
    debug = require("debug")("route:spec"),
    github = require("../services/github")(),
    db = require("../services/orchestrate"),
    util = require("util"),
    crypto = require("crypto"),
    spec = require("../utils/spec");

var router = new Router();
var format = util.format;

// run against .webspec of a repo
router.get("/spec/:owner/:repo", function*() {});

// run aginst a sub folder or a single file
router.get(/^\/spec\/(.+)$/, function*() {
  var ps, repo, owner, subpath, ref, locals, files, sandboxId, sha1hash, runner;
  ps = this.params[0].split("/");
  owner = ps.shift();
  repo = ps.shift();
  subpath = ps.join("/");
  assert(owner, "should have owner");
  assert(repo, "should have repo");
  assert(subpath, "should have file path");
  runner = this.query.runner || "jasmine";
  ref = this.query.ref || "master";
  debug("run %s/%s %s, ref %s", owner, repo, subpath, ref);
  
  files = yield github.repo.access({
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
  locals.source = files.source;
  locals.spec = files.spec;
  // create sandbox description
  yield db.put("sandboxes", sandboxId, locals);
  // save sandbox ID
  locals.sandboxId = sandboxId;
  locals.title = format("Test suites %s for %s/%s at %s - WebSpec", subpath, owner, repo, ref);
  yield this.render("spec/show", locals);
});

module.exports = router;