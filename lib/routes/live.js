var Router = require("koa-router"),
    conf = require("hc").get(),
    debug = require("debug")("live:debug"),
    assert = require("assert"),
    util = require("util"),
    db = require("../db/orchestrate"),
    sandbox = require("../services/sandbox"),
    github = require("../services/github")({token: conf.live.token}),
    livesuite = require("../services/live")(github),
    format = require("util").format,
    spec = require("../utils/spec"),
    _ = require("lodash");

var router = new Router();

var ensureLogin = require("../middlewares/ensureLogin");

router.get("/", function*() {//list all suites
  // var suites = yield livesuite.suite.list;
  debug("list public");
  var res, suites;
  res = yield db.list("suites");
  suites = res && res.body && res.body.results;
  suites = suites.map(function(s) {
    return s.value;
  });
  yield this.render("live/public", {
    suites: suites,
    title: "Suites - Live - WebSpec"
  });
});

router.get("/suites", ensureLogin, function*() {
  debug("list private");
  var res, suites;
  res = yield db.search("suites", format("value.author.name:\"%s\"", this.req.user.username));
  suites = res && res.body && res.body.results;
  suites = suites.map(function(s) {
    return s.value;
  });
  yield this.render("live/private", {
    suites: suites,
    title: "Your suites - Live - WebSpec"
  });
});

router.get("/suites/new", ensureLogin, function*() {//new form
  debug("new");
  yield this.render("live/suite/new", {
    title: "New suite - Live - Webspec",
    suite: {name:"", sources: []}
  });
});

router.post("/suites", ensureLogin, function*() {//create a suite
  debug("create");
  var suite = this.request.body;
  suite.author = { name: this.req.user.username, email: this.req.user.emails[0].value };
  try {
    yield livesuite.suite.create(suite);
    // save suite in db as well
    yield db.put("suites", suite.name, suite, false);
    // build up relationship
    yield db.newGraphBuilder()
    .create()
    .from("users", this.req.user.username)
    .related("suites")
    .to("suites", suite.name);
    this.flash = {success: "Suite created"};
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
  debug("show %s", this.params.suite);
  var suite, specs, ref, commits = [], query, res, sandbox;
  ref = this.query.ref || "master";

  try {
    suite = yield livesuite.suite.get(this.params.suite, ref);
    specs = yield livesuite.spec.list(this.params.suite, ref);
  } catch(e) {
    debug(e);
    this.flash = {alert: e.message};
    return;
  }
  
  // find out latest commits
  commits = yield github.repo.commits({
    repo: conf.live.repo,
    path: this.params.suite
  });
  if(!commits.length) {
    this.flash = {alert: this.i18n.__("No commits found")};
    return this.redirect("back");
  }
  
  if(ref !== "master") {//find sandbox by ref
    query = format("value.ref:\"%s\" AND value.type:\"suite\"", ref);
    res = yield db.search("sandboxes", query);
    sandbox = res && res.body && res.body.results[0] && res.body.results[0].value;
    assert(sandbox, "should have found sandbox");
  }
  
  yield this.render("live/suite/show", {
    suite: suite,
    specs: specs,
    title: format("Suite %s - Live - WebSpec", suite.name),
    sandbox: sandbox,
    commits: commits,
    ref: ref
  });
});

router.put("/suites/:suite", ensureLogin, function*() {//update a suite
  debug("update %s", this.params.suite);
  var suite = this.request.body;
  try {
    yield livesuite.suite.update(suite, {
      name: this.req.user.username,
      email: this.req.user.emails[0].value
    });
    // update suite in db
    yield db.put("suites", suite.name, suite);
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
  debug("delete %s", this.params.suite);
  var suite;
  suite = yield livesuite.suite.get(this.params.suite);
  if(suite.author.name !== this.req.user.username) {
    debug("ownership not match");
    this.flash = {alert: "Only the owner of this suite can perform delete operations"};
  } else {
    try {
      yield livesuite.suite.remove(suite.name, suite.sha);
      // remove data
      yield db.remove("suites", suite.name, true);
      // remove relationship
      yield db.newGraphBuilder()
      .remove()
      .from("users", this.req.user.username)
      .related("suites")
      .to("suites", suite.name);
    } catch(e) {
      debug(e);
      this.flash = {alert: e.message};
    }
  }
  this.redirect("/live/suites");
});

router.get("/suites/:suite/edit", ensureLogin, function*() {//edit form
  debug("edit %s", this.params.suite);
  var suite = yield livesuite.suite.get(this.params.suite);
  yield this.render("/live/suite/edit", _.extend(this.params, {
    title: format("Edit Suite %s - Live - Webspec", this.params.suite),
    suite: suite
  }));
});


router.get("/suites/:suite/specs/new", ensureLogin, function*() {//new file
  var suite = yield livesuite.suite.get(this.params.suite);
  yield this.render("/live/spec/new", _.extend(this.params, {
    title: format("New spec - Suite %s - Live - Webspec", this.params.suite),
    spec: {name: "", content: ""},
    suite: suite
  }));
});

router.get("/suites/:suite/specs/:spec", function*() {
  var spec, locals;
  spec = yield livesuite.spec.get(this.params.suite, this.params.spec);
  locals = _.extend(this.params, {
    spec: spec,
    layout: "layouts/modal",
    title: format("Spec %s of Suite %s", this.params.spec, this.params.suite)
  });
  yield this.render("live/spec/show", locals);
});



router.get("/suites/:suite/specs/:spec/edit", ensureLogin, function*() {//edit file
  var subpath, locals, spec, suite;
  
  subpath = [this.params.suite, this.params.spec].join("/");
  debug("edit %s", subpath);
  suite = yield livesuite.suite.get(this.params.suite);
  spec = yield livesuite.spec.get(this.params.suite, this.params.spec);
  locals = _.extend(this.params, {
    suite: suite,
    spec: spec,
    title: format("Edit spec %s -  Suite %s - Live - Webpsec", spec.name, this.params.suite)
  });
  yield this.render("live/spec/edit", locals);
});

router.put("/suites/:suite/specs/:spec", ensureLogin, function*() {//update file
  var delta, subpath, locals;
  
  delta = this.request.body;
  subpath = [this.params.suite, this.params.spec].join("/");
  debug("update %s", subpath);
  try {
    yield livesuite.spec.update(this.params.suite, delta, { name: this.req.user.username, email: this.req.user.emails[0].value });
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
  spec.author = { name: this.req.user.username, email: this.req.user.emails[0].value };
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
  var suite, spec;
  spec = yield livesuite.spec.get(this.params.suite, this.params.spec);
  if(spec) {
    suite = yield livesuite.suite.get(this.params.suite);
    if(suite.author.name !== this.req.user.username) {
      debug("ownership not match");
      this.flash = {alert: "Only the owner of this spec can perform delete operation"};
    } else {
      debug("remove %s %s", this.params.suite, this.params.spec);
      try {
        yield livesuite.spec.remove(this.params.suite, this.params.spec, spec.sha);
        this.flash = {success: "Spec deleted"};
      } catch(e) {
        debug(e);
        this.flash = {alert: e.message};
      }
    }
    this.redirect(["/live/suites", this.params.suite].join("/"));
  }
});

router.get("/run/:ref/:suite", function*() {
  var ref, locals, sandboxId, files, res, suite, commits = [];
  ref = this.params.ref;
  
  res = yield db.get("suites", this.params.suite);
  suite = res && res.body;
  
  if(ref === "master") {//convert master to actual sha
    commits = yield github.repo.commits({
      repo: conf.live.repo,
      path: this.params.suite
    });
    ref = commits[0].sha;
    if(!commits.length) {
      this.flash = {alert: this.i18n.__("No commits found")};
      return this.redirect("back");
    }
    // return this.redirect("/live/run/" + ref + "/" + this.params.suite);
  }
  
  assert(suite, "should have found suite");
  files = yield github.repo.access({
    repo: conf.live.repo,
    path: this.params.suite,
    ref: ref
  });
  if(files && util.isArray(files)) {//ok
    locals = {
      suite: suite,
      ref: ref,
      type: "suite",
      runner: suite.runner || "jasmine",
      sources: suite.sources,
      specs: spec.group(files).specs
    };
    
    try {
      sandboxId = yield sandbox.create(locals);
      // yield db.newGraphBuilder()
      // .create()
      // .from("suites", suite.name)
      // .related("ref")
      // .to("sandboxes", sandboxId);
    } catch(e) {
      debug(e);
      this.flash = {alert: e.message};
      return this.redirect("back");
    }
    
    // save sandbox ID
    locals.sandboxId = sandboxId;
    locals.title = format("Test suites %s at %s - WebSpec", this.params.suite, ref);
    locals.commits = commits;
    yield this.render("spec/live", locals);
  }
});


module.exports = router;