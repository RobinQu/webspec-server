(function(win) {
  
  var utils = {};
  
  utils.ajax = function(options, callback) {
    var xhr = function() {
      if (window.ActiveXObject) {
        return new window.ActiveXObject("Microsoft.XMLHTTP");
      } else if(window.XMLHttpRequest) {
        return new XMLHttpRequest();
      }
      return false;
    };
    var req = xhr(), method, key;
    method = options.method || "GET";
    if(req) {
      req.onreadystatechange = function() {//listen to status change
        if(req.readyState === 4) {
          callback(null, req.responseText);
        }
      };
      req.open(method, options.url, true);
      if(options.json) {//set json content-type
        req.setRequestHeader("Content-type", "application/json");
      }
      if(options.headers) {//set headers
        for(key in options.headers) {
          if(options.headers.hasOwnProperty(key)) {
            req.setRequestHeader(key, options.headers[key]);
          }
        }
      }
      if(method !== "GET" && options.body) {//send body
        req.send(options.body);
      } else {
        req.send();
      }
    } else {
      callback(new Error("xhr not supported"));
    }
  };
  
  win._SANDBOX_UTILS_ = utils;
}(window));