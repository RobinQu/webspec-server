var db = require("../db/orchestrate"),
    crypto = require("crypto"),
    debug = require("debug")("service:sandbox"),
    co = require("co");
    // assert = require("assert");


exports.create = function(locals) {
  return co(function*() {
    var sha1hash, sandboxId, res;
    sha1hash = crypto.createHash("sha1");
    sha1hash.update(JSON.stringify(locals));
    sandboxId = sha1hash.digest("hex");
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

