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
    this.locals.scriptTags.toString = function() {
      return this.join("");
    };
    return this.locals.scriptTags;
  },
  
  scriptTag: function() {
    var ctx = this;
    return function(src, attrs) {
      var attrStr = " ";
      if(attrs) {
        Object.keys(attrs).forEach(function(key) {
          attrStr += (key + "=" + attrs[key] + " ");
        });
      }
      ctx.locals.scriptTags.push("<script src=" + src + attrStr + "></script>");
    };
  },
  
  embed: function() {
    return function(name) {
      return require("fs").readFileSync("lib/views/" + name + ".ejs", "utf8");
    };
  }
  
  
};