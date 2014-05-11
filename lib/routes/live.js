var Router = require("router"),
    conf = require("hc").get(),
    debug = require("debug")("live:debug"),
    assert = require("assert"),
    github = require("../services/github")({token: conf.live.token}),
    format = require("util").format,
    _ = require("lodash");

var router = new Router();

router.get("/live/new", function*() {
  yield this.render("live/new", {
    title: "New live test"
  });
});

router.get("/live/edit/:suite/:filename", function*() {
  var subpath, locals, file;
  subpath = [this.params.suite, this.params.filename].join("/");
  file = yield github.repo.access({
    repo: conf.live.repo,
    path: subpath
  });
  if(file && file.type === "file") {
    locals = _.extend(this.params, {
      file: file,
      decodedContent: (new Buffer(file.content, "base64")).toString()
    });
    return yield this.render("live/edit", locals, {
      title: format("Edit %s - Webpsec", subpath)
    });
  }
  this.status = 400;
});

router.put("/live/update/:suite/:filename", function*() {
  var content, sha, delta, res, subpath;
  
  delta = this.request.body;
  debug("update %s", this.params[0]);
  content = delta.content;
  assert(content, "should have content");
  sha = delta.originalSHA;
  assert(sha, "should have sha");
  
  subpath = [this.params.suite, this.params.filename].join("/");
  
  if(delta.commiter) {
    assert(delta.commiter.name && delta.commiter.email, "should have committer name and email");
  }
  res = yield github.repo.upload({
    repo: conf.live.repo,
    path: subpath,
    message: "update " + conf.live.repo + " at path " + subpath,
    content: (new Buffer(content)).toString("base64"),
    sha: sha,
    commiter: delta.commiter
  });
  if(res.ok) {
    return this.redirect(["/spec/live", subpath].join("/"));
  }
  debug(res.text);
  this.status = 500;
});


router.post("/live/create", function*() {
  var spec = this.request.body, repo, subpath, res;
  assert(spec.content, "should have content");
  assert(spec.filename, "should have filename");
  assert(spec.suite, "should have suite name");
  assert(spec.author && spec.author.name && spec.author.email, "should have valid author");
  repo = conf.live.repo;
  subpath = [spec.suite, spec.filename].join("/");
  debug("create %s %s", repo, subpath);
  res = yield github.repo.upload({
    path: subpath,
    content: (new Buffer(spec.content)).toString("base64"),
    repo: repo,
    message: "create spec " + spec.filename + " at " + spec.suite,
    committer: spec.author
  });
  if(res.ok) {
    return this.redirect(["/spec/live", subpath].join("/"));
  }
  debug(res.text);
  this.status = 500;
});