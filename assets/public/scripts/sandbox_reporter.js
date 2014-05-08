/*global jasmine, jasmineRequire */

jasmineRequire.SandboxReporter = function() {
  
  this.endpoint = "/reports/";
  
  this.getMeta = function() {
    var repo = document.body.getAttribute("data-repo");
    return {repo: repo};
  };
  
  this.getReportURL = function() {
    var uuid = window.location.pathname.split("/").pop();//last portion of url pathname
    var url = this.endpoint + uuid;
    return url;
  };
  
  this.send = function(text, callback) {
    var xhr = function() {
      if (window.ActiveXObject) {
        return new window.ActiveXObject("Microsoft.XMLHTTP");
      } else if(window.XMLHttpRequest) {
        return new XMLHttpRequest();
      }
      return false;
    };
    var req = xhr();
    
    if(req) {
      req.onreadystatechange = function() {
        if(req.readyState === 4) {
          callback(null, req.responseText);
        }
      };
      req.open("POST", this.getReportURL(), true);
      req.setRequestHeader("Content-type", "application/json");
      req.send(text);
    } else {
      callback(new Error("xhr not supported"));
    }
  };
  
  this.jasmineDone = function() {
    // send results 
    var text = jasmine.getJSReportAsString();
    if(!text) {
      text = "{\"invalid\":true}";
    }
    var meta = this.getMeta();
    var str = "{\"repo\": \"" + meta.repo  + "\",  \"rev\":\"\", \"raw\": "  + text + " }";
    this.send(str, function() {
      
    });
  };
};