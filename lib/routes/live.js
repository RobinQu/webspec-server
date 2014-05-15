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

var ensureLogin = require("../middlewares/ensureLogin");

router.get("/", function*() {//list all suites
  // var suites = yield livesuite.suite.list;
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
  yield this.render("live/suite/new", {
    title: "New suite - Live - Webspec",
    suite: {name:"", sources: []}
  });
});

router.post("/suites", ensureLogin, function*() {//create a suite
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
  var suite, specs, ref;
  ref = this.query.ref || "master";
  try {
    suite = yield livesuite.suite.get(this.params.suite, ref);
    specs = yield livesuite.spec.list(this.params.suite, ref);
  } catch(e) {
    debug(e);
    this.flash = {alert: e.message};
    return;
  }
  yield this.render("live/suite/show", {
    suite: suite,
    specs: specs,
    title: format("Suite %s - Live - WebSpec", suite.name)
  });
});

router.put("/suites/:suite", ensureLogin, function*() {//update a suite
  var suite = this.request.body;
  try {
    yield livesuite.suite.update(suite, { name: this.req.user.username, email: this.req.user.emails[0].value });
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
  var suite = yield livesuite.suite.get(this.params.suite);
  yield this.render("/live/suite/edit", _.extend(this.params, {
    title: format("Edit Suite %s - Live - Webspec", this.params.suite),
    suite: suite
  }));
});

router.get("/suites/:suite/specs/new", ensureLogin, function*() {//new file
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
  locals = _.extend(this.params, {
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
  var ref, locals, sandboxId, files, res, suite;
  ref = this.params.ref;
  
  res = yield db.get("suites", this.params.suite);
  suite = res && res.body;
  
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
      runner: suite.runner || "jasmine",
      sources: suite.sources,
      specs: spec.group(files).specs
    };
    try {
      sandboxId = yield sandbox.create(locals);
    } catch(e) {
      debug(e);
      this.flash = {alert: e.message};
      return this.redirect("back");
    }
    // save sandbox ID
    locals.sandboxId = sandboxId;
    locals.title = format("Test suites %s at %s - WebSpec", this.params.suite, ref);
    yield this.render("spec/live", locals);
  }
});


module.exports = router;