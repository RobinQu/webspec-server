var Router = require("koa-router"),
    conf = require("hc").get(),
    // crypto = require("crypto"),
    _ = require("lodash"),
    assert = require("assert"),
    debug = require("debug")("route:home"),
    pattern = require("../utils/pattern"),
    github = require("../utils/github")(conf);

var homeRouter = new Router();

homeRouter.get("/", function*() {
  yield this.render("home");
});

homeRouter.get("/new", function*() {//spec writer
  yield this.render("spec_new");
});

homeRouter.get(/^\/edit\/(.+)$/, function*() {//
  console.log(this.params);
  var parsed = pattern.parseSuite(this.params[0]);
  assert(parsed.repo, "should have found repo");
  var file = yield github.repo.access({
    repo: parsed.repo.ref,
    path: parsed.subpath
  });
  var locals = _.extend(parsed, {
    file: file,
    decodedContent: (new Buffer(file.content, "base64")).toString()
  });
  if(file && file.type === "file") {
    return yield this.render("spec_edit", locals);
  }
  this.status = 400;
});

homeRouter.put(/^\/update\/(.+)$/, function*() {
  var parsed, content, sha, branch, delta, res;
  
  delta = this.request.body;
  debug("update %s", this.params[0]);
  parsed = pattern.parseSuite(this.params[0]);
  assert(parsed.repo, "should have found repo");
  content = delta.content;
  assert(content, "should have content");
  sha = delta.originalSHA;
  assert(sha, "should have sha");
  branch = delta.branch || "master";
  if(delta.commiter) {
    assert(delta.commiter.name && delta.commiter.email, "should have committer name and email");
  }
  res = yield github.repo.upload({
    repo: parsed.repo.ref,
    path: parsed.subpath,
    message: "update " + parsed.repo.ref + " at path " + parsed.subpath,
    content: (new Buffer(content)).toString("base64"),
    sha: sha,
    branch: branch,
    commiter: delta.commiter
  });
  if(res.ok) {
    return this.redirect(["/suites", parsed.repo.name, parsed.subpath].join("/"));
  }
  this.throw(res.text);
});

homeRouter.post("/create", function*() {
  var spec = this.request.body, encoded, repo, repoName;
  assert(spec.content, "should have content");
  assert(spec.filename, "should have filename");
  assert(spec.namespace, "should have namespace");
  assert(spec.author && spec.author.name && spec.author.email, "should have valid author");
  encoded = (new Buffer(spec.content)).toString("base64");
  repoName = spec.repo || "master";
  repo = conf.site.repos[repoName];
  // hash = crypto.createHash("sha1");
  // hash.update(spec.content);
  debug("create %s %s", repo, [spec.namespace, spec.filename].join("/"));
  let res = yield github.repo.upload({
    path: spec.namespace + "/" + spec.filename,
    content: encoded.toString("base64"),
    // sha: hash.digest("hex"),
    repo: repo,
    message: "create spec " + spec.filename + " at " + spec.namespace,
    committer: spec.author
  });
  if(res.ok) {
    return this.redirect("/" + ["suites", repoName, spec.namespace, spec.filename].join("/"));
  }
  this.status = 500;
});

exports.home = homeRouter;
exports.suite = require("./suite");
exports.sandbox = require("./sandbox");
exports.repo = require("./repo");
