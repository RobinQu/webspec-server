var passport = require("koa-passport"),
    debug = require("debug")("utils:passport"),
    db = require("../services/orchestrate"),
    conf = require("hc").get(),
    co = require("co"),
    _ = require("lodash"),
    GithubStrategy = require("passport-github").Strategy;
    
    
passport.serializeUser(function(user, done) {
  debug("serialize user %s", user.username);
  done(null, user.username);
});

passport.deserializeUser(function(id, done) {
  debug("deserialize user %s", id);
  co(function*() {
    var res = yield db.get("users", id);
    return res.body || false;
  })(done);
});

passport.use(new GithubStrategy(_.extend(conf.github, {
  scope: "public_repo, user"
}), function(accessToken, refreshToken, profile, done) {
  co(function*() {
    debug("profile %s", profile.id);
    profile.accessToken = accessToken;
    var res = yield db.put("users", profile.username, profile);
    if(res.statusCode === 201) {//update ok
      return profile;
    }
    return false;
  })(done);
}));


module.exports = passport;