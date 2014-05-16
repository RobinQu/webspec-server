var redis = require("redis"),
    conf = require("hc").get();


var client;
if(conf.redis) {
  client = redis.createClient(conf.redis.port, conf.redis.host, {"auth_pass": conf.redis.auth});
} else {
  client = redis.createClient();
}

module.exports = client;