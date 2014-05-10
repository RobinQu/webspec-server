/*global jasmine, jasmineRequire */

jasmineRequire.SandboxReporter = function() {
  
  var utils = window._SANDBOX_UTILS_;
    
  this.getMeta = function() {
    var report = document.body.getAttribute("data-report");
    return {report: report};
  };
  
  this.getReportURL = function() {
    var uuid, url;
    uuid = window.location.pathname.split("/").pop();//last portion of url pathname
    url = "/sandboxes/" + uuid + "/reports";
    return url;
  };
  
  this.send = function(text, callback) {
    utils.ajax({
      method: "POST",
      body: text,
      json: true
    }, callback);
  };
  
  this.jasmineDone = function() {
    var text, str, meta;
    // send results 
    text = jasmine.getJSReportAsString();
    if(!text) {
      text = "{\"invalid\":true}";
    }
    meta = this.getMeta();
    str = "{\"uuid\":\"" + meta.report + "\",\"raw\":" + text + "}";
    this.send(str, function() {
      //do nothing for now
    });
  };
};