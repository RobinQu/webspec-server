/*global describe, it, beforeEach, expect, jasmine */

var co = require("co"),
    assert = require("assert"),
    spechelper = require("./spec_helper");

assert(process.env.NODE_ENV==="test", "should have correct env");


jasmine.getEnv().defaultTimeoutInterval = 10 * 1000;


describe("livesuite.spec", function() {
  var env = {}, live, fixtures, suiteData;
    
  fixtures = [{
    name: "test.js",
    author: {name: "robin", email: "robinqu@gmail.com"},
    content: "true"
  }];
  
  suiteData = {
    name: "helloworld",
    author: {name: "robin", email: "robinqu@gmail.com"},
    sources: ["http://code.jquery.com/jquery-1.11.0.min.js"]
  };
  
  beforeEach(co(function*() {
    yield spechelper.init(env);
    if(!live) {
      live = require("../lib/services/live")(env.github);
    }
  }));
  
  describe("create", function() {
    
    it("should create and get", function(done) {
      co(function*() {
        yield live.suite.create(suiteData);
        yield live.spec.create(suiteData.name, fixtures[0]);
        var s = yield live.spec.get(suiteData.name, fixtures[0].name);
        expect(s.content).toEqual(fixtures.content);
      })(done);
    });
  });
  
  describe("update", function() {
    
    it("should update", function(done) {
      co(function*() {
        var s = yield live.spec.get(suiteData.name, fixtures[0].name);
        s.content = "false";
        yield live.suite.update(suiteData.name, s);
        s = yield live.spec.get(suiteData.name, fixtures[0].name);
        expect(s.content).toEqual("false");
      })(done);
    });
    
  });
  
  describe("list", function() {
    
    it("should list", function(done) {
      co(function*() {
        var list = yield live.spec.list(suiteData.name);
        expect(list.length).toBeGreaterThan(1);
      })(done);
    });
    
  });
  
  describe("remove", function() {
    
    it("should remove", function(done) {
      co(function*() {
        var s = yield live.spec.get(suiteData.name, fixtures[0].name);
        yield live.spec.remove(suiteData.name, fixtures[0].name, s.sha);
        try {
          yield live.spec.get(suiteData.name, fixtures[0].name);
        } catch(e) {
          expect(e).toBeTruthy();
        }
      })(done);
    });
    
  });
  
});