var koa = require("koa"),
    bodyparser = require("koa-body"),
    gzip = require("koa-gzip"),
    mount = require("koa-mount"),
    // views = require("koa-views"),
    crypto = require("crypto"),
    ejs = require("koa-ejs"),
    statics = require("koa-static"),
    path = require("path"),
    hc = require("hc"),
    co = require("co"),
    session = require("koa-sess"),
    methodOverride = require("koa-methodoverride"),
    thunkify = require("thunkify");



var getConfigURL = function() {
  var configURL = {
    development: "http://code.elfvision.com/snippets/8/raw",
    test: "",
    production: ""
  };

  var env = process.env.NODE_ENV || "development";
  
  return configURL[env] + "?private_token=" + process.env.PRIVATE_TOKEN;
};


co(function*() {
  
  var conf = yield thunkify(hc)({//load config
    source: new hc.sources.HTTP(getConfigURL())
  });
  
  var app = koa();
  
  var routes = require("./routes"),
      passport = require("./utils/passport");

  // generate rotation keys for sign
  app.keys = (function(i) {
    var ret = [];
    while(i--) {
      ret.push(crypto.randomBytes(256).toString());
    }
    return ret;
  }(3));
  app.use(gzip());
  app.use(bodyparser());
  app.use(methodOverride());
  app.use(session({
    store: new (require("koa-redis"))(conf.redis)
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  
  
  ejs(app, {
    root: path.join(__dirname, "./views"),
    layout: "layouts/basic",
    viewExt: "ejs",
    cache: process.env.NODE_ENV === "production"
  });
  // app.use(mount("/repos", statics(path.join(__dirname, "../assets/repos"))));

  app.use(routes.home.middleware());
  app.use(routes.user.middleware());
  // app.use(mount("/composer", routes.composer.middleware()));
  // Suite viewer
  // app.use(mount("/suites", routes.suite.middleware()));
  // Sandbox runner
  // app.use(mount("/sandboxes", routes.sandbox.middleware()));
  // Repo reader
  app.use(routes.repo.middleware());
  
  app.use(statics(path.join(__dirname, "../assets/public")));
  
  var srv = app.listen(process.env.PORT || 9090, function() {
    var address = srv.address();
    console.log("WebSpec server is up and runnign at " + address.port);
  });

})();