/*global describe, it, beforeEach, expect, jasmine */

var co = require("co"),
    assert = require("assert");

assert(process.env.NODE_ENV==="test", "should have correct env");


jasmine.getEnv().defaultTimeoutInterval = 10 * 1000;

describe("livesuite.suite", function() {
  var github, conf, suite, fixtures, clean = false;
    
  fixtures = [{
    name: "helloworld",
    author: {name: "robin", email: "robinqu@gmail.com"},
    sources: ["http://code.jquery.com/jquery-1.11.0.min.js"]
  }];
  
  beforeEach(co(function*() {
    if(!conf) {
      conf = yield require("hc");
    }
    if(!github) {
      github = require("../lib/services/github")({token: conf.live.token});
    }
    if(!clean) {
      try {
        yield github.refs.remove({
          repo: conf.live.repo,
          ref: "heads/master"
        });
      } catch(e) {
        
      } finally {
        clean = true;
      }
    }
    if(!suite) {
      suite = require("../lib/services/live")(github).suite;
    }
  }));
  
  describe("suite create", function() {
    
    it("should create and get", function(done) {
      co(function*() {
        yield suite.create(fixtures[0]);
        var s = yield suite.get(fixtures[0].name);
        expect(s.name).toEqual(fixtures[0].name);
        expect(s.sources).toEqual(fixtures[0].sources);
      })(done);
    });
    
    
  });
  
  describe("suite update", function() {
    it("should update", function(done) {
      co(function*() {
        var s = yield suite.get(fixtures[0].name);
        var sources = ["http://google.com"];
        s.sources = sources;
        yield suite.update(s, {name: "robin", email: "a@gmail.com"}, s.sha);
        s = yield suite.get(fixtures[0].name);
        expect(s.name).toEqual(fixtures[0].name);
        expect(s.sources).toEqual(sources);
      })(done);
    });
  });
  
  describe("suite remove", function() {
    it("should remove", function(done) {
      co(function*() {
        var s = yield suite.get(fixtures[0].name);
        yield suite.remove(s.name, s.sha);
        try {
          yield suite.get(fixtures[0].name);
        } catch(e) {
          expect(e).toBeTruthy();
        }
      })(done);
    });
  });
  
});