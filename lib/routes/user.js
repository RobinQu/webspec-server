var Router = require("koa-router"),
    db = require("../services/orchestrate"),
    // format = require("util").format,
    assert = require("assert"),
    github = require("../services/github"),
    debug = require("debug")("route:user"),
    passport = require("../utils/passport");

var router = new Router();

var ensureLogin = require("../middlewares/ensureLogin");

// List user profiles, repos
router.get("/dashboard", ensureLogin, function*() {
  debug("dashboard");
  var res, suites, repos, allRepos;
  
  try {
    debug("github list");
    this.github = yield github.make(this.req.user.username);
    allRepos = yield this.github.repo.list({
      user: this.req.user.username,
    });
  } catch(e) {
    this.flash = {alert: "failed to list github repos: " + e.message};
    this.redirect("/");
  }
  
  try {
    debug("read suites list");
    res = yield db.newGraphReader()
    .get()
    .from("users", this.req.user.username)
    .related("suites");
  
    suites = res && res.body && res.body.results;
    suites = suites.map(function(s) {
      return s.value;
    }).sort(function(a, b) {
      return a.reftime - b.a.reftime;
    });
  } catch(e) {
    debug(e);
    this.flash = {alert: "failed to load suites list: " + e.message};
    this.redirect("/");
  }
  
  try {
    debug("read repos list");
    res = yield db.newGraphReader()
    .get()
    .from("users", this.req.user.username)
    .related("repos");
  
    repos = res && res.body && res.body.results;
    repos = repos.map(function(r) {
      return r.value;
    });
  } catch(e) {
    debug(e);
    this.flash = {alert: "failed to load repos list: " + e.message};
    this.redirect("/");
  }
  
  yield this.render("dashboard", {
    title: "Dashboard - Webspec",
    suites: suites,
    repos: repos,
    all: allRepos
  });
  
});

// User signin/up using github
router.get("/auth/github", passport.authenticate("github"));

router.get("/login", function*() {
  yield this.render("login", {
    title: "Login - Webspec"
  });
});

// Auth callback
router.get("/auth/github/callback", passport.authenticate("github", {
  failureRediect: "/auth/failed",
  successRedirect: "/dashboard"
}));


router.post("/users/:user/repos", ensureLogin, function*() {
  var name = this.request.body.name, repo;
  
  try {
    debug("fetch github repo info");
    this.github = yield github.make(this.req.user.username);
    //get repo info
    repo = yield this.github.repo.get({
      user: this.params.user,
      name: name
    });
    assert(repo.owner.login === this.params.user, "should match repo owner");
  } catch(e) {
    this.status = 403;
    this.flash = {alert: this.i18n.__("Cannot add repo of someone else")};
    return;
  }
  
  try {
    debug("check .webspec");
    //check .webspec file
    yield this.github.repo.access({
      repo: [this.params.user, name].join("/"),
      path: ".webspec"
    });
  } catch(e) {
    debug(e);
    this.status = 400;
    this.flash = {alert:this.i18n.__(".webspec is required at the repo root")};
    return;
  }
  
  try {
    debug("save repo data");
    yield db.put("repos", name, repo);
    yield db.newGraphBuilder()
    .create()
    .from("users", this.params.user)
    .related("repos")
    .to("repos", name);
    this.status = 201;
    this.flash = {success: this.i18n.__("Repo %s is enabled for webspec", name)};
  } catch(e) {
    debug(e);
    this.status = 400;
    this.flash = {alert: this.i18n.__("failed to save repo data: %s", e.message)};
  }

  this.redirect("back");
});

router.del("/users/:user/repos/:repo", ensureLogin, function*() {
  try {
    yield db.remove("repos", this.params.repo, true);
    yield db.newGraphBuilder()
    .remove()
    .from("users", this.params.user)
    .related("repos")
    .to("repos", this.params.repo);
    this.status = 200;
  } catch(e) {
    this.status = 400;
  }
  this.redirect("back");
});

module.exports = router;