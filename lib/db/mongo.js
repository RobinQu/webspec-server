var MongoClient = require("mongodb").MongoClient,
    conf = require("hc").get(),
    debug = require("debug")("db:mongo");


var Database = {};

var _db = null;

Object.defineProperties(Database, {
  db: {
    configurable: false,
    enumerable: true,
    get: function() {
      return _db;
    }
  }
});

Database.connect = function(callback) {
  debug("connecting");
  MongoClient.connect(conf.mongo, function(e, db) {
    debug("connected");
    _db = db;
    callback(e, db);
  });
};

Database.disconnect = function() {
  debug("close");
  this.db.close();
};

module.exports = Database;