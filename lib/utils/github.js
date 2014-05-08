var defaults = require("superagent-defaults"),
    util = require("util"),
    assert = require("assert");

var InvalidResponseError = function() {
  Error.apply(this, arguments);
  this.message = "Content is not valid";
};

util.inherits(InvalidResponseError, Error);

var github = function(conf) {
  
  // setup defualt auth token
  var superagent = defaults();
  var endpoint = "https://api.github.com";
  superagent.auth(conf.github.token, "x-oauth-basic");
  
  var Github = {};
  
  Github.data = {
    tree: function(options) {
      assert(options.repo, "should have repo");
      var ref = options.ref || "master";
      var url = endpoint + options.repo + "git/trees/" + ref;
      
      return function(callback) {
        superagent.get(url).query({recursive: options.recursive || 1}).end(function(e, res) {
          callback(e, res);
        });
      };
    }
  };
  
  Github.repo = {
  
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
      assert(options.sha, "should have shasum");
      assert(options.repo, "should have repo");
      options.branch = options.branch || "master";
      if(options.commiter) {
        assert(options.commiter.name, "should have comitter name");
        assert(options.commiter.email, "should have comitter email");
      }
      
      
      return function(callback) {
        var url = [endpoint, options.repo, "contents", options.path].join("/");
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