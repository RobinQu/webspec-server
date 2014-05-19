/*global jasmine, jasmineRequire */

jasmineRequire.SandboxReporter = function() {
  
  var utils = window._SANDBOX_UTILS_;
    
  this.getMeta = function() {
    var report = document.body.getAttribute("data-report");
    var ref = document.body.getAttribute("data-ref");
    
    return {report: report, ref: ref};
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
      json: true,
      url: this.getReportURL()
    }, callback);
  };
  
  this.syncToParent = function(update) {
    var win = window.parent;
    if(win) {
      if(win.postMessage) {
        win.postMessage(update, window.location.origin);
      } else if(win.__MASTER_HOOK__) {
        win.__MASTER__HOOK__.call(null, {//mimick message event
          data: update,
          source: window,
          origin: window.location.origin
        });
      }
    }
  };
  
  this.suiteStarted = function(suite) {
    this.syncToParent({
      type: "suite:start",
      detail: suite
    });
  };
  
  this.suiteDone = function(suite) {
    this.syncToParent({
      type: "suite:done",
      detail: suite
    });
  };
  
  this.specStarted = function(spec) {
    this.syncToParent({
      type: "spec:start",
      detail: spec
    });
  };
  
  this.specDone = function(spec) {
    this.syncToParent({
      type: "spec:done",
      detail: spec
    });
  };
  
  this.jasmineDone = function() {
    this.syncToParent({
      type: "jasmine:done"
    });
    
    
    var text, str, meta;
    // send results 
    text = jasmine.getJSReportAsString();
    if(!text) {
      text = "{\"invalid\":true}";
    }
    meta = this.getMeta();
    if(!meta.report) {//skip
      return;
    }
    str = "{\"uuid\":\"" + meta.report + "\",\"commit\": \""+ meta.ref +"\", \"raw\":" + text + "}";
    this.send(str, function() {
      //do nothing for now
    });
  };
};