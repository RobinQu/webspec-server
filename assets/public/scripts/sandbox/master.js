/*global jQuery */

(function(win, $) {
  
  var SpecMaster = function(iframe, container) {
    this.$iframe = $(iframe).eq(0);
    this.$container = $(container).eq(0);
  };
  
  SpecMaster.prototype.listenTo = function (w) {
    // bind events
    w.addEventListener("message", this.hanldeMessageEvent.bind(this), false);
  };
  
  
  SpecMaster.prototype.makeSpec = function () {
    // var $li = $("<li />", {
    //   text: spec
    // });
  };
  
  SpecMaster.prototype.hanldeMessageEvent = function (e) {
    if(e.origin !== window.location.origin) {
      return;
    }
    var update, $currentParent;
    update = e.data;
    $currentParent = this.$container;
    console.log(update);
    switch(update.type) {
    case "spec:start":
      
      break;
    case "spec:end":
      break;
    case "suite:start":
      
      break;
    case "suite:end":
      break;
    case "jasmine:done":
      break;
    }
  };
  
  $(function() {
    var master = new SpecMaster(".sandbox-iframe", ".sandbox-result");
    master.listenTo(win);
  });
  
}(window, jQuery));