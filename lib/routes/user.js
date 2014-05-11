var Router = require("koa-router"),
    // db = require("../services/orchestrate"),
    github = require("../services/github"),
    debug = require("debug")("route:user"),
    passport = require("../utils/passport");

var router = new Router();

// List user profiles, repos
router.get("/dashboard", function*() {
  var user, repos;
  if(this.req.user) {
    user = this.req.user;
    debug("show dashboard for %s", user.username);
    
    this.github = yield github.make(user.username);
    
    repos = yield this.github.repo.list({
      user: user.username
    });
    yield this.render("dashboard", {
      user: user,
      title: "Dashboard - Webspec",
      repos: repos
    });
  } else {
    this.redirect("/auth/github");
  }
});

// User signin/up using github
router.get("/auth/github", passport.authenticate("github"));

// Auth callback
router.get("/auth/github/callback", passport.authenticate("github", {
  failureRediect: "/auth/failed",
  successRedirect: "/dashboard"
}));




module.exports = router;