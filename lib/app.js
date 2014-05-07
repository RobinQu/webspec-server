var koa = require("koa"),
    bodyparser = require("koa-body"),
    gzip = require("koa-gzip"),
    routes = require("./routes"),
    mount = require("koa-mount");

var app = koa();

app.use(bodyparser());
app.use(gzip());

app.use(routes.home.middleware());
app.use(mount("/spec", routes.spec.middleware()));
app.use(mount("/report", routes.report.middleware()));

var srv = app.listen(process.env.PORT || 9090, function() {
  var address = srv.address();
  console.log("WebSpec server is up and runnign at " + address.port);
});