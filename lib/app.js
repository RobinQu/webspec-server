var koa = require("koa-app"),
    mount = require("koa-mount"),
    // views = require("koa-views"),
    ejs = require("koa-ejs"),
    path = require("path"),
    hc = require("hc"),
    co = require("co"),
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
  
  // load user agent data
  require("useragent")(true);
  
  var app = koa();
  
  var routes = require("./routes"),
      passport = require("./utils/passport");
      
  app.configure({
    statics: [path.join(__dirname, "../assets/public")],
    i18n: {
      directory: "./assets/locales",
      locales: ["en", "zh-CN"],
      query: true,
      cookie: true,
      header: true
    },
    session: {
      store: new (require("koa-redis"))({
        host: conf.redis.host,
        port: conf.redis.port,
        pass: conf.redis.auth
      })
    }
  });
  
  ejs(app, {
    root: path.join(__dirname, "./views"),
    layout: "layouts/basic",
    viewExt: "ejs",
    cache: process.env.NODE_ENV === "production",
    locals: require("./utils/view_helpers")
  });
  
  app.use(passport.initialize());
  app.use(passport.session());
  
  app.context.render = (function(r) {
    return function(view, locals) {
      locals.view = view;
      locals.flash = this.flash;
      this.locals.scriptTags = [];
      this.locals.view = view;
      return r.call(this, view, locals);
    };
  }(app.context.render));

  app.use(mount("/live", routes.live.middleware()));
  app.use(routes.home.middleware());
  app.use(routes.user.middleware());
  app.use(routes.spec.middleware());
  app.use(routes.sandbox.middleware());
  app.use(routes.repo.middleware());
  
  // app.use(statics(path.join(__dirname, "../assets/public")));
  app.on("error", function(e) {
    console.log("app error:", e.message);
    console.log(e.stack);
  });

  var srv = app.listen(process.env.PORT || 9090, function() {
    var address = srv.address();
    console.log("WebSpec server is up and runnign at " + address.port);
  });

})();