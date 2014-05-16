var db = require("../db/orchestrate"),
    co = require("co"),
    assert = require("assert"),
    debug = require("debug")("service:token"),
    client = require("../db/redis");


var HashKey = "webspec_accesstokens";

exports.get = function(username) {
  assert(username, "should have username");
  return co(function*() {
    var res, accessToken;
    accessToken = yield client.hget.bind(client, HashKey, username);//query redis
    if(!accessToken) {
      debug("token not found in redis, query orchestrate for %s", username);
      try {
        res = yield db.get("users", username);//query http db
        accessToken = res.body && res.body.value && res.body.value.accessToken;
      } catch(e) {//404
        debug(e);
      }
      if(accessToken) {//cache if ok
        yield exports.set(username, accessToken);
      } else {
        debug("token not found in all places for %s", username);
      }
    }
    return accessToken;
  });
};

exports.set = function(username, accessToken) {
  assert(username, "should have username");
  assert(accessToken, "should have accessToken");
  return co(function*() {
    debug("cache for %s", username);
    yield client.hset.bind(client, HashKey, username, accessToken);
  });
};