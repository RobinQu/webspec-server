var redis = require("redis"),
    db = require("./orchestrate"),
    co = require("co"),
    assert = require("assert"),
    debug = require("debug")("service:token"),
    conf = require("hc").get(),
    client;

if(conf.redis) {
  client = redis.createClient(conf.redis.port, conf.redis.host, {"auth_pass": conf.redis.auth});
} else {
  client = redis.createClient();
}


var HashKey = "webspec_accesstokens";

exports.get = function(username) {
  assert(username, "should have username");
  return co(function*() {
    var res, accessToken;
    accessToken = yield client.hget.bind(client, HashKey, username);//query redis
    if(!accessToken) {
      debug("token not found in redis, query orchestrate for %s", username);
      res = yield db.get("users", username);//query http db
      accessToken = res.body && res.body.accessToken;
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