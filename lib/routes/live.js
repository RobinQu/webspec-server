var Router = require("koa-router"),
    conf = require("hc").get(),
    debug = require("debug")("live:debug"),
    assert = require("assert"),
    util = require("util"),
    db = require("../services/orchestrate"),
    sandbox = require("../services/sandbox"),
    github = require("../services/github")({token: conf.live.token}),
    livesuite = require("../services/live")(github),
    format = require("util").format,
    spec = require("../utils/spec"),
    _ = require("lodash");

var router = new Router();

var ensureLogin = function*(next) {
  if(this.req.user) {
    yield next;
  } else {
    this.flash = {alert: "Login before continue"};
    this.redirect("/login");
  }
};

router.get("/", function*() {//list all suites
  var suites = yield livesuite.suite.list;
  yield this.render("live/list", {
    suites: suites,
    title: "Suites - Live - WebSpec"
  });
});

router.get("/suites/new", ensureLogin, function*() {//new form
  yield this.render("live/suite/new", {
    title: "New suite - Live - Webspec",
    suite: {name:"", sources: []}
  });
});

router.post("/suites", ensureLogin, function*() {//create a suite
  var suite = this.request.body;
  suite.author = { name: this.req.user.name, email: this.req.user.emails[0].value };
  try {
    yield livesuite.suite.create(suite);
    this.flash = {alert: "Suite created"};
  } catch(e) {
    debug(e);
    this.flash = {alert: e.message};
    return yield this.render("live/suite/new", {
      title: "New suite - Live - Webspec",
      suite: suite
    });
  }
  this.redirect("/live/suites/" + suite.name);
});

router.get("/suites/:suite", function*() {
  var suite, specs, ref;
  ref = this.query.ref || "master";
  suite = yield livesuite.suite.get(this.params.suite, ref);
  specs = yield livesuite.spec.list(this.params.suite, ref);
  yield this.render("live/suites/show", {
    suite: suite,
    specs: specs,
    title: format("Suite %s - Live - WebSpec", suite.name)
  });
});

router.put("/suites/:suite", ensureLogin, function*() {//update a suite
  var suite = this.request.body, sha;
  sha = suite.sha;
  delete suite.sha;
  try {
    yield livesuite.suite.update(suite, { name: this.req.user.name, email: this.req.user.emails[0].value }, sha);
    this.flash = {success: "Suite updated"};
  } catch(e) {
    debug(e);
    this.flash = {alsert: e.message};
    return yield this.render("live/suite/edit", {
      title: "Edit suite - Live - Webspec",
      suite: suite
    });
  }
  this.redirect("/live/suites/" + suite.name);
});

router.del("/suites/:suite", ensureLogin, function*() {//delete a suite
  var suite;
  suite = yield livesuite.suite.get(this.params.suite);
  if(suite.author.username !== this.req.user.username) {
    this.flash = {alert: "Only the owner of this suite can perform delete operations"};
  } else {
    yield livesuite.suite.remove(suite.name);
  }
  this.redirect("/live/suites");
});

router.get("/suites/:suite/edit", ensureLogin, function*() {//edit form
  var suite = yield livesuite.suite.get(this.params.suite);
  yield this.render("/live/suite/edit", _.extend(this.params, {
    title: format("Edit Suite %s - Live - Webspec", this.params.suite),
    suite: suite
  }));
});

router.get("/suites/:suite/specs/:spec/new", ensureLogin, function*() {//new file
  yield this.render("/live/spec/new", _.extend(this.params, {
    title: format("New spec - Suite %s - Live - Webspec", this.params.suite),
    spec: {name: "", content: ""}
  }));
});

router.get("/suites/:suite/specs/:spec/edit", ensureLogin, function*() {//edit file
  var subpath, locals, spec;
  subpath = [this.params.suite, this.params.spec].join("/");
  debug("edit %s", subpath);
  
  spec = yield livesuite.spec.get(this.params.suite, this.params.spec);
  spec.content = (new Buffer(spec.content, "base64")).toString();
  locals = _.extend(this.params, {
    spec: spec,
    title: format("Edit spec %s -  Suite %s - Live - Webpsec", spec.name, this.params.suite)
  });
  yield this.render("live/spec/edit", locals);
});

router.put("/suites/:suite/specs/:spec", ensureLogin, function*() {//update file
  var delta, sha, subpath, locals;
  
  delta = this.request.body;
  subpath = [this.params.suite, this.params.spec].join("/");
  debug("update %s", subpath);
  sha = delta.sha;
  delete delta.sha;
  try {
    yield livesuite.spec.update(this.params.suite, delta, { name: this.req.user.name, email: this.req.user.emails[0].value }, sha);
    this.flash = {success: "Spec updated"};
  } catch(e) {
    debug(e);
    this.flash = {alert: e.message};
    locals = _.extend(this.params, {
      spec: delta,
      title: format("Edit spec %s -  Suite %s - Live - Webpsec", this.params.spec, this.params.suite)
    });
    return yield this.render("live/spec/edit", locals);
  }
  this.redirect(["/live/suites", this.params.suite].join("/"));
});

router.post("/suites/:suite/specs", ensureLogin, function*() {//create file
  var spec = this.request.body, repo, locals;
  repo = conf.live.repo;
  debug("create spec for %s", this.params.suite);
  spec.author = { name: this.req.user.name, email: this.req.user.emails[0].value };
  try {
    yield livesuite.spec.create(this.params.suite, spec);
    this.flash = {success: "Spec created"};
  } catch(e) {
    debug(e);
    this.flash = {alert: e.message};
    locals = _.extend(this.parms, {
      spec: spec,
      title: format("New spec - Suite %s - Live - Webspec", this.params.suite)
    });
    return yield this.render("live/spec/new", locals);
  }
  this.redirect(["/live/suites", this.params.suite].join("/"));
});

router.del("/suites/:suite/specs/:spec", ensureLogin, function*() {
  spec = yield livesuite.spec.get(this.params.suite, this.params.spec);
  if(spec) {
    if(spec.author.username !== this.req.user.username) {
      this.flash = {alert: "Only the owner of this spec can perform delete operation"};
    } else {
      try {
        yield livesuite.spec.remove(this.params.suite, this.params.spec, spec.sha);
        this.flash = {success: "Spec deleted"};
      } catch(e) {
        this.flash = {alert: e.message};
      }
    }
    this.redirect(["/suites", this.params.suite].join("/"));
  }
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