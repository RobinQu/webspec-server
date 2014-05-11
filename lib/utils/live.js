var assert = require("assert"),
    validator = require("validator");

exports.lintSuite = function(suite) {
  assert(suite.name, "should have suite name");
  assert(suite.author && suite.author.email && suite.author.name, "should have author");
  if(suite.sources) {
    suite.sources.forEach(function(s) {
      assert(s && validator.isURL(s), "should have valid source url");
    });
  }
};

exports.lintSpec = function(spec) {
  assert(spec.content, "should have content");
  assert(spec.name, "should have filename");
  // assert(spec.sha, "should have sha1sum");
  assert(spec.author && spec.author.name && spec.author.email, "should have valid author");
};