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
    debug = require("debug")("app"),
    thunkify = require("thunkify");

co(function*() {
  var conf;
  
  if(process.env.CONFIG_URL) {
    debug("load from config url");
    conf = yield thunkify(hc)({//load config
      source: new hc.sources.HTTP(process.env.CONFIG_URL)
    });
  } else {
    debug("load from local");
    conf = yield thunkify(hc)();
  }
  
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
    store: new (require("koa-redis"))({
      host: conf.redis.host,
      port: conf.redis.port,
      pass: conf.redis.auth
    })
  }));
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  
  ejs(app, {
    root: path.join(__dirname, "./views"),
    layout: "layouts/basic",
    viewExt: "ejs",
    cache: process.env.NODE_ENV === "production",
    locals: require("./utils/view_helpers")
  });

  app.use(mount("/live", routes.live.middleware()));
  app.use(routes.home.middleware());
  app.use(routes.user.middleware());
  app.use(routes.spec.middleware());
  app.use(routes.sandbox.middleware());
  app.use(routes.repo.middleware());
  
  app.use(statics(path.join(__dirname, "../assets/public")));
  app.on("error", function(e) {
    console.log(e.stack);
  });
  
  var srv = app.listen(process.env.PORT || 9090, function() {
    var address = srv.address();
    console.log("WebSpec server is up and runnign at " + address.port);
  });

})();