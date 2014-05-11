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

  service.suite.get = function(name, ref) {
    return co(function*() {
      debug("read suite %s", name);
      var res, suite;
      res = yield service.suite.inspect(name, ref);
      suite = JSON.parse((new Buffer(res.content, "base64")).toString("utf8"));
      live.lintSuite(suite);
      suite.sha = res.sha;
      return suite;
    });
  };
  
  service.suite.inspect = function(name, ref) {
    return co(function*() {
      debug("inspect suite %s", name);
      var res;
      res = yield github.repo.access({
        path: [name, ".suitespec"].join("/"),
        repo: conf.live.repo,
        ref: ref
      });
      assert(res && res.content, "should have suite");
      return res;
    });
  };
  
  service.suite.list = co(function*() {
    var files, suites;
    files = yield github.repo.access({
      repo: conf.live.repo,
      path: "/",
      ref: "master"
    });
    suites = files.filter(function(f) {//filter dir
      return f.type === "dir";
    });
    return suites;
  });
  
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
  
  service.suite.update = function(delta, commiter) {
    assert(commiter && commiter.name && commiter.email, "should have commiter");
    assert(delta.sha, "should have sha1sum");
    return co(function*() {
      var res, suite;
      suite = delta.name;
      live.lintSuite(delta);
      res = yield github.repo.upload({//update
        repo: conf.live.repo,
        path: [suite, ".suitespec"].join("/"),
        sha: delta.sha,
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
      if(files && files.length > 1) {//abort del
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
      return specs.filter(function(s) {
        return s.type === "file" && s.name !== ".suitespec";
      });
    });
  };
  
  service.spec.get = function(suite, spec, ref) {
    return co(function*() {
      debug("get spec %s %s", suite, spec);
      var file = yield github.repo.access({
        repo: conf.live.repo,
        path: [suite, spec].join("/"),
        ref: ref
      });
      if(file && file.type === "file") {
      } else {
        throw new Error("incorrect content");
      }
      file.content = (new Buffer(file.content, "base64")).toString("utf8");
      return file;
    });
  };
  
  service.spec.create = function(suite, spec) {
    assert(spec.author && spec.author.name && spec.author.email, "should have author");
    return co(function*() {
      var subpath, res;
      live.lintSpec(spec);
      subpath = [suite, spec.name].join("/");
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
  
  service.spec.update = function(suite, delta, commiter) {
    return co(function*() {
      var res, subpath;
      subpath = [suite, delta.name].join("/");
      res = yield github.repo.upload({
        repo: conf.live.repo,
        path: subpath,
        message: "update " + conf.live.repo + " at path " + subpath,
        content: (new Buffer(delta.content)).toString("base64"),
        sha: delta.sha,
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