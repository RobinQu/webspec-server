var assert = require("assert"),
    co = require("co"),
    debug = require("debug")("utils/spec"),
    github = require("../services/github")();

exports.group = function(files) {
  var spec = [], source = [];
  files.forEach(function(file) {
    if(file.type === "file") {//should be a file
      if(/spec.js$/.test(file.name.toLowerCase())) {//including a `spec` substring
        spec.push(file.path);
      } else {
        source.push(file.path);
      }
    }
  });
  return {specs: spec, sources: source};
};

exports.lint = function(webspec) {
  if(webspec.runner) {
    assert(["jasmine", "mocha", "none"].indexOf(webspec.runner) > -1, "should have valid runner type");
  }
  
  var checkGroup = function(items) {
    var ret = items.filter(function(s) {
      assert(s, "should have truthy value");
      if(typeof s !== "string") {
        assert(s.directory, "should have directory value");
        return true;
      }
      return false;
    });
    return ret;
    // assert(ret.length === 1, "should have only one directory");
  };
  
  if(webspec.sources) {
    checkGroup(webspec.sources);
  }
  
  assert(webspec.specs, "should have specs");
  checkGroup(webspec.specs);
};


exports.expand = function(repo, ref, webspec) {
  return co(function*() {
    var level, res, dirs = [], filterDirs, reduceDir, ret = { sources: [], specs: [] };
    
    ["sources", "specs"].forEach(function(k) {
      if(webspec[k]) {
        webspec[k].forEach(function(s) {
          if(typeof s === "string") {
            ret[k].push(s);
          } else {
            dirs.push(s);
          }
        });
      }
    });
    if(dirs.length) {
      level = Math.max.apply(Math, dirs.map(function(item) {
        return item.directory.split("/").length;
      })) + 3;//down to 3 levels at most
      debug("expand webspec by recursrive level %s", level);
      // fetch dir tree
      res = yield github.data.tree({
        repo: repo,
        ref: ref,
        recursive: level
      });
      assert(res.tree, "should have tree");
      
      filterDirs = function(s) {
        return typeof s !== "string";
      };
      
      reduceDir = function(k) {
        if(webspec[k]) {
          ret[k] = webspec[k].filter(filterDirs).reduce(function(prev,cur) {
            var prefix = cur.directory;
            if(prefix[0] === "/") {
              prefix = prefix.slice(1);
            }
            debug(prefix);
            return prev.concat(res.tree.filter(function(file) {
              // debug(file.path, file.type);
              return file.type === "blob" && file.path.indexOf(prefix) === 0;
            }).map(function(file) {
              return file.path;
            }));
          }, ret[k]);
        }
      };
      
      ["sources", "specs"].forEach(reduceDir);
    }

    return ret;
  });
  
};