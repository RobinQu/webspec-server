module.exports = function*(next) {
  if(this.req.user) {
    yield next;
  } else {
    this.flash = {alert: "Login before continue"};
    this.redirect("/login");
  }
};