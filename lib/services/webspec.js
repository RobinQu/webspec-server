var co = require("co"),
    debug = require("debug")("service:webspec"),
    spec = require("../utils/spec"),
    Buffer = require("buffer").Buffer;

exports.get = function(owner, repo, ref) {
  return co(function*() {
    var webspec;
    
    try {
      webspec = yield this.github.repo.access({
        repo: [owner, repo].join("/"),
        path: ".webspec",
        ref: ref
      });
    } catch(e) {
      debug(e);
      return;
    }
    
    try {
      webspec = JSON.parse(new Buffer(webspec.content, "base64").toString());
      spec.lint(webspec);
    } catch(e) {
      debug(e);
      return;
    }
    
    return webspec;
  });

};