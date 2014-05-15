module.exports = {
  
  currentUser: function() {
    return this.req.user;
  },
  
  live: function() {
    return require("hc").get().live;
  },
  
  __: function() {
    return this.i18n.__.bind(this.i18n);
  },
  
  isInDashboard: function() {
    return this.locals.view === "dashboard";
  },
  
  isInSuites: function() {
    console.log(this.req.url);
    return this.path.startsWith("live");
  }
  
  
};