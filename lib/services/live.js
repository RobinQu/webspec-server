var co = require("co"),
    assert = require("assert"),
    live = require("../utils/live"),
    Buffer = require("buffer").Buffer,
    debug = require("debug")("service:live"),
    format = require("util").format,
    conf = require("hc").get();

module.exports = function(github) {
  var service = {};
  
  // create namespaces
  service.suite = {};
  service.spec = {};

  // Read .suitespec
  service.suite.inspect = function(name, ref) {
    return co(function*() {
      debug("inspect suite %s", name);
      var res, suite;
      res = yield github.repo.access({
        path: [name, ".suitespec"].join("/"),
        repo: conf.live.repo,
        ref: ref
      });
      assert(res && res.content, "should have suite");
      suite = JSON.parse((new Buffer(res.content, "base64")).toString());
      return suite;
    });
  };
  
  service.suite.list = co(function*() {
    var files, suites;
    files = yield github.repo.access({
      repo: conf.live.repo,
      path: "/",
      ref: "master"
    });
    suites = files.filter(function(f) {
      return f.type === "dir";
    });
    return suites;
  });
  
  service.suite.get = function(name, ref) {
    return co(function*() {
      var specs;
      specs = yield github.repo.access({
        repo: conf.live.repo,
        path: this.params.suite,
        ref: ref
      });
      
    });
  };
  
  service.suite.create = function(suite) {
    assert(suite.author && suite.author.name && suite.author.email, "should have commiter");
    return co(function*() {
      var res;
      live.lintSuite(suite);
      res = yield github.repo.upload({
        repo: conf.live.repo,
        message: format("create suite %s", suite.name),
        path: [suite.name, ".suitespec"].join("/"),
        content: (new Buffer(JSON.stringify(suite))).toString("base64"),
        comitter: suite.auhtor
      });
      return suite;
    });
  };
  
  service.suite.update = function(delta, commiter, sha) {
    assert(commiter && commiter.name && commiter.email, "should have commiter");
    assert(sha, "should have sha1sum");
    return co(function*() {
      var res, suite;
      suite = delta.name;
      live.lintSuite(delta);
      res = yield github.repo.upload({//update
        repo: conf.live.repo,
        path: [suite, ".suitespec"].join("/"),
        sha: sha,
        message: format("update suite %s", suite),
        content: (new Buffer(JSON.stringify(delta))).toString("base64"),
        commiter: commiter
      });
      return delta;
    });
  };
  
  service.suite.remove = function(suite, sha) {
    assert(sha, "should have sha1sum");
    return co(function*() {
      var files;
      files = yield github.repo.access({
        repo: conf.live.repo,
        path: suite
      });
      if(files && files.length) {//abort del
        throw new Error("Delete all specs before delete a suite");
      } else {
        yield github.repo.remove({
          repo: conf.live.repo,
          path: [suite, ".suitespec"].join("/"),
          sha: sha,
          message: format("delete suitespec for %s", suite)
        });
      }
    });
  };
  
  service.spec.list = function(suite, ref) {
    return co(function*() {
      var specs;
      specs = yield github.repo.access({
        repo: conf.live.repo,
        path: suite,
        ref: ref
      });
    });
  };
  
  service.spec.get = function(suite, spec, ref) {
    return co(function*() {
      var file = yield github.repo.access({
        repo: conf.live.repo,
        path: [suite, spec].join("/"),
        ref: ref
      });
      if(file && file.type === "file") {
        throw new Error("incorrect content");
      }
      return file;
    });
  };
  
  service.spec.create = function(suite, spec) {
    assert(spec.author && spec.author.name && spec.author.email, "should have author");
    return co(function*() {
      var subpath, res;
      live.lintSpec(spec);
      subpath = [this.params.suite, spec.filename].join("/");
      res = yield github.repo.upload({
        path: subpath,
        content: (new Buffer(spec.content)).toString("base64"),
        repo: conf.live.repo,
        message: "create spec " + spec.name + " at " + suite,
        committer: spec.author
      });
      assert(res.ok, "should have created");
      return suite;
    });
  };
  
  service.spec.update = function(suite, delta, commiter, sha) {
    return co(function*() {
      var res, subpath;
      subpath = [suite, delta.name].join("/");
      res = yield github.repo.upload({
        repo: conf.live.repo,
        path: subpath,
        message: "update " + conf.live.repo + " at path " + subpath,
        content: (new Buffer(delta.content)).toString("base64"),
        sha: sha,
        commiter: commiter
      });
      assert(res.ok, "should update");
    });
  };
  
  service.spec.remove = function(suite, spec, sha) {
    assert(sha, "should have sha1sum");
    return co(function*() {
      yield github.repo.remove({
        path: [suite, spec].join("/"),
        repo: conf.live.repo,
        message: format("remove spec %s at %s", suite, spec),
        sha: sha
      });
    });
  };
  
  
  return service;
};