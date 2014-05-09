/*global jasmine, jasmineRequire */

jasmineRequire.SandboxReporter = function() {
    
  this.getMeta = function() {
    var report = document.body.getAttribute("data-report");
    return {report: report};
  };
  
  this.getReportURL = function() {
    var uuid, url, meta;
    uuid = window.location.pathname.split("/").pop();//last portion of url pathname
    meta = this.getMeta();
    url = "/sandboxes/" + uuid + "/reports/" + meta.report;
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
    this.send(text, function() {
      
    });
  };
};