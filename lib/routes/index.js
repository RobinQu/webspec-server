var Router = require("koa-router"),
    conf = require("hc").get(),
    // crypto = require("crypto"),
    assert = require("assert"),
    debug = require("debug")("route:home"),
    github = require("../utils/github")(conf);

var homeRouter = new Router();

homeRouter.get("/", function*() {
  this.body = "home";
});

homeRouter.get("/new", function*() {//spec writer
  yield this.render("spec_new");
});

// homeRouter.get("/namespaces", function() {
//   var repo = this.query.repo || "master";
//   var conf.site.repos[repo]
//   
// });

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
