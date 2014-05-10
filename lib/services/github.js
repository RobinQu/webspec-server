var defaults = require("superagent-defaults"),
    util = require("util"),
    assert = require("assert");

var InvalidResponseError = function() {
  Error.apply(this, arguments);
  this.message = "Content is not valid";
};

util.inherits(InvalidResponseError, Error);

var github = function(conf) {
  conf = conf || {};
  var superagent;
  var endpoint = "https://api.github.com";
  if(conf.token) {
    // setup defualt auth token
    superagent = defaults();
    superagent.auth(conf.token, "x-oauth-basic");
  } else {
    superagent = require("superagent");
  }
  
  var Github = {};
  
  Github.data = {
    tree: function(options) {
      assert(options.repo, "should have repo");
      var ref = options.ref || "master";
      var url = endpoint + options.repo + "git/trees/" + ref;
      
      return function(callback) {
        superagent.get(url).query({recursive: options.recursive || 3}).end(function(e, res) {
          callback(e, res);
        });
      };
    }
  };
  
  Github.repo = {
    
    list: function(options) {
      assert(options.user, "should have username");
      var url = [endpoint, "users", options.user, "repos"].join("/");
      return function(callback) {
        superagent.get(url).query({
          type: options.type || "all",
          sort: options.sort || "updated",
          direction: options.direction || "desc"
        }).end(function(e, res) {
          callback(e, res.body);
        });
      };
    },
    
    commit: function(options) {
      assert(options.repo, "should have repo");
      var url = [endpoint, "repos", options.repo, "commits"].join("/");

      return function(callback) {
        superagent.get(url).query(options.conditions)
        .end(function(e, res) {
          callback(e, res.body);
        });
      };
    },
  
    access: function(options) {
      assert(options.repo, "should have repo");
      assert(options.path, "should have path");
      var url = [endpoint, "repos", options.repo, "contents", options.path].join("/");
      
      return function(callback) {
        superagent.get(url)
        .query({ref: options.ref || "master"})
        .end(function(e, res) {
          if(e) {
            return callback(e);
          }
          if(res.body && res.ok) {
            callback(null, res.body);
          } else {
            callback(new InvalidResponseError());
          }
        });
      };
    },
    
    upload: function(options) {
      assert(options.path, "should have path");
      assert(options.message, "should have message");
      assert(options.content, "should have base64 content");
      // assert(options.sha, "should have shasum");
      assert(options.repo, "should have repo");
      options.branch = options.branch || "master";
      if(options.commiter) {
        assert(options.commiter.name, "should have comitter name");
        assert(options.commiter.email, "should have comitter email");
      }
      return function(callback) {
        var url = [endpoint, "repos", options.repo, "contents", options.path].join("/");
        superagent.put(url)
        .type("json")
        .send(options)
        .end(function(e, res) {
          callback(e, res);
        });
      };
    }
  
  };
  
  return Github;
};




module.exports = github;