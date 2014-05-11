var co = require("co");

exports.init = function(env) {
  return co(function*() {
    if(!env.conf) {
      env.conf = yield require("hc");
    }
    if(!env.github) {
      env.github = require("../lib/services/github")({token: env.conf.live.token});
    }
    if(!env.clean) {
      try {
        yield env.github.refs.remove({
          repo: env.conf.live.repo,
          ref: "heads/master"
        });
      } catch(e) {
        
      } finally {
        env.clean = true;
      }
    }
  });
};