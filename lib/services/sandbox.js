var db = require("../db/orchestrate"),
    crypto = require("crypto"),
    debug = require("debug")("service:sandbox"),
    co = require("co");
    // assert = require("assert");


exports.hash = function(data) {
  var sha1hash;
  sha1hash = crypto.createHash("sha1");
  sha1hash.update(data.type);
  sha1hash.update(data.ref);
  if(data.subpath) {//a subspec
    sha1hash.update(data.subpath);
  }
  return sha1hash.digest("hex");
};

exports.create = function(locals) {
  return co(function*() {
    var sandboxId, res;
    sandboxId = exports.hash(locals);
    debug("sandbox %s", sandboxId);
    try {
      // create sandbox description
      res = yield db.put("sandboxes", sandboxId, locals);
    } catch(e) {
      if(e && e.statusCode === 409) {//tolerate the conflicts
        debug("conflict, but ok for %s", sandboxId);
      } else {
        throw e;
      }
    }
    return sandboxId;
  });
};

