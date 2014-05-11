var db = require("../services/orchestrate"),
    crypto = require("crypto"),
    debug = require("debug")("route:spec"),
    co = require("co");
    // assert = require("assert");


exports.create = function(locals) {
  return co(function*() {
    var sha1hash, sandboxId;
    sha1hash = crypto.createHash("sha1");
    sha1hash.update(JSON.stringify(locals));
    sandboxId = sha1hash.digest("hex");
    debug("sandbox %s", sandboxId);
    // create sandbox description
    yield db.put("sandboxes", sandboxId, locals);
    return sandboxId;
  });
};

