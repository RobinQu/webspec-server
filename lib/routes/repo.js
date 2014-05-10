var Router = require("koa-router"),
    github = require("../services/github")(),
    assert = require("assert"),
    util = require("util"),
    Buffer = require("buffer").Buffer,
    debug = require("debug")("route:user");

var router = new Router();

router.get(/^\/([^\/]+)\/([^\/]+)\/(.*)$/, function*() {
  var repo, owner, subpath, ref, locals, res;
  owner = this.params[0];
  repo = this.params[1];
  subpath = this.params[2] || "/";
  assert(owner, "should have owner");
  assert(repo, "should have repo");
  assert(subpath, "should have path");
  ref = this.query.ref || "master";
  debug("inspect %s/%s, ref %s", owner, repo, ref);
  try {
    res = yield github.repo.access({
      repo: [owner, repo].join("/"),
      path: subpath,
      ref: ref
    });
  } catch(e) {
    debug(res);
    return;//404
  }
  if(util.isArray(res)) {//render file list
    locals = {
      repo: repo,
      owner: owner,
      files: res,
      path: subpath,
      ref: ref
    };
    res = yield github.repo.commit({
      conditions: {path: subpath},
      repo: [owner, repo].join("/")
    });
    locals.commits = res.body.slice(0,10);
    return yield this.render("repo/directory", locals);
  }
  assert(res.content, "should have response content");
  var buf = new Buffer(res.content, "base64");
  this.body = buf;
});