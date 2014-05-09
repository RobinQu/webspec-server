var koa = require("koa"),
    bodyparser = require("koa-body"),
    gzip = require("koa-gzip"),
    mount = require("koa-mount"),
    views = require("koa-views"),
    statics = require("koa-static"),
    path = require("path"),
    hc = require("hc"),
    co = require("co"),
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
  
  yield thunkify(hc)({//load config
    source: new hc.sources.HTTP(getConfigURL())
  });
  
  var app = koa();
  
  var routes = require("./routes");

  app.use(gzip());
  app.use(bodyparser());
  app.use(methodOverride());
  app.use(statics(path.join(__dirname, "../assets/public")));
  // app.use(mount("/repos", statics(path.join(__dirname, "../assets/repos"))));
  app.use(views(path.join(__dirname, "views"), {
    "default": "ejs",
    cache: false
  }));

  app.use(routes.home.middleware());
  
  // app.use(mount("/composer", routes.composer.middleware()));
  // Suite viewer
  app.use(mount("/suites", routes.suite.middleware()));
  // Sandbox runner
  app.use(mount("/sandboxes", routes.sandbox.middleware()));
  // Repo reader
  app.use(mount("/repos", routes.repo.middleware()));

  var srv = app.listen(process.env.PORT || 9090, function() {
    var address = srv.address();
    console.log("WebSpec server is up and runnign at " + address.port);
  });

})();