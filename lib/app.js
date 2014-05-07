var koa = require("koa"),
    bodyparser = require("koa-body"),
    gzip = require("koa-gzip"),
    routes = require("./routes"),
    mount = require("koa-mount"),
    views = require("koa-views"),
    statics = require("koa-static"),
    path = require("path");

var app = koa();

app.use(bodyparser());
app.use(gzip());
app.use(statics(path.join(__dirname, "../assets/public")));
app.use(mount("/repos", statics(path.join(__dirname, "../assets/repos"))));
app.use(views(path.join(__dirname, "views"), {
  "default": "ejs",
  cache: true
}));

app.use(routes.home.middleware());
app.use(mount("/spec", routes.spec.middleware()));
app.use(mount("/report", routes.report.middleware()));

var srv = app.listen(process.env.PORT || 9090, function() {
  var address = srv.address();
  console.log("WebSpec server is up and runnign at " + address.port);
});