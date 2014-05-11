var Router = require("koa-router"),
    github = require("../services/github"),
    assert = require("assert"),
    util = require("util"),
    conf = require("hc").get(),
    Buffer = require("buffer").Buffer,
    debug = require("debug")("route:repo");

var router = new Router(),
    format = util.format;

router.get(/^\/repo\/(.+)$/, function*() {
  var ps, repo, owner, subpath, ref, locals, res;
  ps = this.params[0].split("/");
  owner = ps.shift();
  repo = ps.shift();
  ref = ps.shift();
  subpath = ps.join("/");
  assert(owner, "should have owner");
  assert(repo, "should have repo");
  assert(ref, "should have ref");
  debug("inspect %s/%s %s, ref %s", owner, repo, subpath, ref);
  
  try {
    if(conf.live.repo === [owner, repo].join("/")) {//suite file
      this.github = github({token: conf.live.token});
    } else {
      this.github = yield github.make(owner);
    }
    res = yield this.github.repo.access({
      repo: [owner, repo].join("/"),
      path: subpath || "/",
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
      ref: ref,
      commits: [],
      title: format("Inspect %s/%s %s, ref %s - WebSpec", owner, repo, subpath, ref)
    };
    res = yield this.github.repo.commit({
      conditions: {path: subpath},
      repo: [owner, repo].join("/")
    });
    if(res.body) {
      locals.commits = res.body.slice(0,10);
    }
    return yield this.render("repo/directory", locals);
  }
  assert(res.content, "should have response content");
  var buf = new Buffer(res.content, "base64");
  this.body = buf;
});


module.exports = router;