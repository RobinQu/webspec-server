var hc = require("hc"),
    assert = require("assert"),
    orchestrate = require("orchestrate");

var key = hc.get().orchestrate.apikey;
assert(key, "should have api key for orchestrate");

var o = orchestrate(key);

module.exports = o;