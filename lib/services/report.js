var co = require("co"),
    debug = require("debug")("service:report"),
    assert = require("assert");


exports.aggregate = function(options) {
  assert(options.type, "should provide report type to aggregate");
  return co(function*() {
    var pipeline = [], collection, $match, db;
    db = require("../db/mongo").db;
    collection = db.collection("reports");
    if(options.ref) {//find by ref
      debug("ref %s", options.ref);
      $match = {
        $match: {
          "sandbox.ref": options.ref,
          "sandbox.type": options.type
        }
      };
    } else {
      debug("type %s", options.type);
      switch(options.type) {
      case "suite":
        $match = {
          "sandbox.suite": options.suite,
          "sandbox.type": options.type
        };
        break;
      case "webspec":
        $match = {
          "sandbox.owner": options.owner,
          "sandbox.repo": options.repo,
          "sandbox.type": options.type
        };
        break;
      case "subspec":
        $match = {
          "sandbox.owner": options.owner,
          "sandbox.repo": options.repo,
          "sandbox.type": options.type,
          "sandbox.path": options.path
        };
        break;
      }
    }
    pipeline.push({$match: $match});
    //project fileds
    pipeline.push({
      $project: {
        commit: 1,
        passed: {
          $cond: [ "$raw.passed", 1, 0 ]
        },
        browser: {
          $concat: [ "$agent.family", "$agent.major" ]
        }
      }
    });
    pipeline.push({
      $group: {
        _id: {
          commit: "$commit",
          browser: "$browser"
        },
        all: {
          $sum: 1
        },
        ok: {
          $sum:"passed"
        }
      }
    });
    console.log(require("util").inspect(pipeline, {depth: null}));
    return yield collection.aggregate.bind(collection, pipeline);
  });
};