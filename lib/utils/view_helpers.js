var scriptTags = [];

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
    return this.locals.view.startsWith("live");
  },
  
  scripts: function() {
    scriptTags.toString = function() {
      return this.join("\n");
    };
    return scriptTags;
  },
  
  scriptTag: function() {
    return function(src, attrs) {
      var attrStr = " ";
      if(attrs) {
        Object.keys(attrs).forEach(function(key) {
          attrStr += (key + "=" + attrs[key] + " ");
        });
      }
      scriptTags.push("<script src=" + src + attrStr + "></script>");
    };
  }
  
  
};