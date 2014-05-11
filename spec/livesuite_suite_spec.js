/*global describe, it, beforeEach, expect, jasmine */

var co = require("co"),
    assert = require("assert"),
    spechelper = require("./spec_helper");

assert(process.env.NODE_ENV==="test", "should have correct env");


jasmine.getEnv().defaultTimeoutInterval = 10 * 1000;

describe("livesuite.suite", function() {
  var env = {}, suite, fixtures;
    
  fixtures = [{
    name: "helloworld",
    author: {name: "robin", email: "robinqu@gmail.com"},
    sources: ["http://code.jquery.com/jquery-1.11.0.min.js"]
  }];
  
  beforeEach(co(function*() {
    yield spechelper.init(env);
    if(!suite) {
      suite = require("../lib/services/live")(env.github).suite;
    }
  }));
  
  describe("create", function() {
    
    it("should create and get", function(done) {
      co(function*() {
        yield suite.create(fixtures[0]);
        var s = yield suite.get(fixtures[0].name);
        expect(s.name).toEqual(fixtures[0].name);
        expect(s.sources).toEqual(fixtures[0].sources);
      })(done);
    });
    
    
  });
  
  describe("update", function() {
    it("should update", function(done) {
      co(function*() {
        var s = yield suite.get(fixtures[0].name);
        var sources = ["http://google.com"];
        s.sources = sources;
        yield suite.update(s, {name: "robin", email: "a@gmail.com"});
        s = yield suite.get(fixtures[0].name);
        expect(s.name).toEqual(fixtures[0].name);
        expect(s.sources).toEqual(sources);
      })(done);
    });
  });
  
  describe("remove", function() {
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