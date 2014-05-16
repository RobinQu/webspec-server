var passport = require("koa-passport"),
    debug = require("debug")("utils:passport"),
    db = require("../db/orchestrate"),
    conf = require("hc").get(),
    co = require("co"),
    _ = require("lodash"),
    cache = require("../db/redis"),
    GithubStrategy = require("passport-github").Strategy;
    
    
passport.serializeUser(function(user, done) {
  debug("serialize user %s", user.username);
  done(null, user.username);
});

passport.deserializeUser(function(id, done) {
  debug("deserialize user %s", id);
  co(function*() {
    var user = false, res;
    
    user = yield cache.get.bind(cache, "webspec:users:" + id);
    user = JSON.parse(user);
    if(user) {
      debug("found %s in redis", id);
    } else {
      res = yield db.get("users", id);
      if(res.body) {
        debug("found %s in orchestrate", id);
        user = res.body;
      }
    }
    return user;
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
      //cache user info
      debug("cache user %s", profile.username);
      yield cache.set.bind(cache, "webspec:users:" + profile.username, JSON.stringify(profile));
      return profile;
    }
    return false;
  })(done);
}));


module.exports = passport;