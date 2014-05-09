var hc = require("hc");
var conf = hc.get();

exports.parseSuite = function(p) {
  var ps = p.split("/");
  ps.shift();
  var repoName = ps.shift();
  var namespace = ps[0];
  var subpath = ps.join("/");
  var repo = conf.site.repos[repoName];
  return {
    repo: {
      name: repoName,
      ref: repo
    },
    namespace: namespace,
    subpath: subpath
  };
};