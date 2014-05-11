var Router = require("koa-router"),
    conf = require("hc").get(),
    debug = require("debug")("live:debug"),
    assert = require("assert"),
    util = require("util"),
    db = require("../services/orchestrate"),
    sandbox = require("../services/sandbox"),
    github = require("../services/github")({token: conf.live.token}),
    format = require("util").format,
    spec = require("../utils/spec"),
    _ = require("lodash"),
    live = require("../utils/live");

var router = new Router();

var ensureLogin = function*(next) {
  if(this.req.user) {
    yield next;
  } else {
    this.redirect("/auth/github");
  }
};

router.get("/", function*() {//list all suites
  var files, suites;
  files = yield github.repo.access({
    repo: conf.live.repo,
    path: "/",
    ref: "master"
  });
  suites = files.filter(function(f) {
    return f.type === "dir";
  });
  yield this.render("live/list", {
    suites: suites,
    title: "Suites - Live - WebSpec"
  });
});

router.get("/suites/new", ensureLogin, function*() {//new form
  yield this.render("live/suite/new", {
    title: "New suite - Live - Webspec"
  });
});

router.post("/suites", ensureLogin, function*() {//create a suite
  var suite = this.request.body;
  try {
    live.lintSuite(suite);
    db.put("live_suites", suite.name, suite, false);
    this.flash = {alert: "Suite created"};
  } catch(e) {
    debug(e);
    this.flash = {alert: e.message};
    return yield this.render("suite/new", {
      title: "New suite - Live - Webspec",
      suite: suite
    });
  }
  this.redirect("/live/suites/" + suite.name);
});

router.get("/suites/:suite", function*() {
  var res, suite, specs;
  res = db.get("live_suites", this.params.suite);
  suite = res && res.body;
  assert(suite, "should have found suite");
  specs = yield github.repo.access({
    repo: conf.live.repo,
    path: this.params.suite,
    ref: this.query.ref
  });
  yield this.render("live/suites/show", {
    suite: suite,
    specs: specs,
    title: format("Suite %s - Live - WebSpec", suite.name)
  });
});

router.put("/suites/:suite", ensureLogin, function*() {//update a suite
  var suite = this.request.body;
  try {
    live.lintSuite(suite);
    db.put("live_suites", suite.name, suite);//overwrite by default
    this.flash = {success: "Suite updated"};
  } catch(e) {
    debug(e);
    this.flash = {alsert: e.message};
    return yield this.render("suite/edit", {
      title: "Edit suite - Live - Webspec",
      suite: suite
    });
  }
  this.redirect("/live/suites/" + suite.name);
});

router.del("/suites/:suite", ensureLogin, function*() {//delete a suite
  var files, res, suite;
  res = yield db.get("live_suites", this.params.suite);
  suite = res && res.body;
  assert(suite, "should have found suite");
  if(suite.author.username !== this.req.user.username) {
    this.flash = {alert: "Only the owner of this suite can perform delete operations"};
  } else {
    files = yield github.repo.access({
      repo: conf.live.repo,
      path: this.params.suite
    });
    if(files && files.length) {//abort del
      this.flash = {alert: "Delete all specs before delete a suite"};
    } else {
      try {
        yield db.remove("live_suites", this.suite);
      } catch(e) {
        debug(e);
        this.flash = {alert: e.message};
      }
    }
  }
  this.redirect("/live/suites");
});

router.get("/suites/:suite/edit", ensureLogin, function*() {//edit form
  yield this.render("/live/suite/edit", _.extend(this.params, {
    title: format("Edit Suite %s - Live - Webspec", this.params.suite)
  }));
});

router.get("/suites/:suite/specs/:spec/new", ensureLogin, function*() {//new file
  yield this.render("/live/file/new", _.extend(this.params, {
    title: format("New spec - Suite %s - Live - Webspec", this.params.suite)
  }));
});

router.get("/suites/:suite/specs/:spec/edit", ensureLogin, function*() {//edit file
  var subpath, locals, file, spec, suite, res;
  subpath = [this.params.suite, this.params.spec].join("/");
  debug("edit %s", subpath);
  file = yield github.repo.access({
    repo: conf.live.repo,
    path: subpath
  });
  if(file && file.type === "file") {
    res = yield db.get("live_suites", this.params.suite);
    suite = res && res.body;
    assert(suite, "should have found suite");
    spec = suite.specs[this.params.spec];
    spec.content = (new Buffer(file.content, "base64")).toString();
    spec.sha = file.sha;
    locals = _.extend(this.params, {
      spec: spec,
      title: format("Edit spec %s -  Suite %s - Live - Webpsec", spec.name, suite.name)
    });
    return yield this.render("live/file/edit", locals);
  }
  this.status = 400;
});

router.put("/suites/:suite/specs/:spec", ensureLogin, function*() {//update file
  var content, delta, res, subpath, locals;
  
  delta = this.request.body;
  subpath = [this.params.suite, this.params.spec].join("/");
  debug("update %s", subpath);
  content = delta.content;
  assert(content, "should have content");
  
  if(delta.commiter) {
    assert(delta.commiter.name && delta.commiter.email, "should have committer name and email");
  }
  try {
    res = yield github.repo.upload({
      repo: conf.live.repo,
      path: subpath,
      message: "update " + conf.live.repo + " at path " + subpath,
      content: (new Buffer(content)).toString("base64"),
      sha: delta.sha,
      commiter: delta.commiter
    });

    this.flash = {success: "Spec updated"};
  } catch(e) {
    debug(e);
    this.flash = {alert: e.message};
    res = null;
  } finally {
    if(res && res.ok) {
      this.redirect(["/live/suites", this.params.suite].join("/"));
    } else {
      locals = _.extend(this.params, {
        spec: delta,
        title: format("Edit spec %s -  Suite %s - Live - Webpsec", this.params.spec, this.params.suite)
      });
      this.render("live/file/edit", locals);
    }
  }
});

router.post("/suites/:suite/specs", ensureLogin, function*() {//create file
  var spec = this.request.body, repo, subpath, res, locals;
  repo = conf.live.repo;
  debug("create spec for %s", this.params.suite);
  try {
    live.lintSpec(spec);
    subpath = [this.params.suite, spec.filename].join("/");
    res = yield github.repo.upload({
      path: subpath,
      content: (new Buffer(spec.content)).toString("base64"),
      repo: repo,
      message: "create spec " + spec.filename + " at " + this.params.suite,
      committer: spec.author
    });
    this.flash = {success: "Spec created"};
  } catch(e) {
    debug(e);
    this.flash = {alert: e.message};
    res = null;
  } finally {
    if(res && res.ok) {
      return this.redirect(["/live/suites", this.params.suite].join("/"));
    } else {
      locals = _.extend(this.parms, {
        spec: spec,
        title: format("New spec - Suite %s - Live - Webspec", this.params.suite)
      });
    }
  }
});

router.del("/suites/:suite/specs/:spec", ensureLogin, function*() {
  var res, suite;
  res = yield db.get("live_suites", this.params.suite);
  suite = res && res.body;
  assert(suite, "should have found suite");
  if(suite.author.username !== this.req.user.username) {
    this.flash = {alert: "Only the owner of this suite can perform delete operation"};
  } else {
    try {
      yield db.remove("live_suites", this.params.suite);
      this.flash = {success: "Spec deleted"};
    } catch(e) {
      this.flash = {alert: e.message};
    }
  }
  this.redirect(["/suites", this.params.suite].join("/"));
});

router.get("/run/:ref/:suite", function*() {
  var owner, repo, ref, locals, sandboxId, files, res, suite;
  owner = this.params.owner;
  ref = this.params.ref;
  repo = conf.live.repo;
  res = yield db.get("suites", this.params.suite);
  suite = res && res.body;
  assert(suite, "should have found suite %s", this.params.suite);
  files = yield this.github.repo.access({
    repo: [owner, repo].join("/"),
    path: this.params.suite,
    ref: ref
  });
  if(files && util.isArray(files)) {//ok
    locals = {
      suite: this.params.suite,
      ref: ref,
      runner: suite.runner,
      sources: suite.sources,
      specs: spec.group(files).specs
    };
    sandboxId = yield sandbox.create(locals);
    // save sandbox ID
    locals.sandboxId = sandboxId;
    locals.title = format("Test suites %s at %s - WebSpec", this.params.suite, ref);
    yield this.render("spec/live", locals);
  }
});


module.exports = router;