/*global jQuery */

(function(win, $) {
  
  var SpecMaster = function(iframe, container) {
    this.$iframe = $(iframe).eq(0);
    this.$container = $(container).eq(0);
    this.$loading = this.$container.find(".loading");
    
    this.counts = {
      suite: 0,
      spec: 0,
      failedSpec: 0
    };
    
    this.$currentParent = $("<ul />").appendTo(this.$container);
    // this.$currentParent = this.$container;
  };
  
  SpecMaster.prototype.listenTo = function (w) {
    var handler = this.hanldeMessageEvent.bind(this);
    // bind events
    if(w.postMessage) {
      w.addEventListener("message", handler, false);
    } else {
      w.__MASTER__HOOK__ = handler;
    }
  };
  
  SpecMaster.prototype.startSpec = function(spec, $parent) {
    var $li;
    
    $li = $("<li />", {
      id: spec.id,
      "class": "spec"
    });
    $li.append($("<span />", {
      text: spec.description,
      "class": "description"
    }));
    $parent.append($li);
    return $li;
  };
  
  SpecMaster.prototype.finishSpec = function (spec, $parent) {
    var $exceptionList, i, len, $exception, expand;
    
    this.counts.spec ++;
    expand = function(e) {
      if(e.target.tagName.toLowerCase() !== "pre") {
        $(this).find("pre").toggle();
      }
    };
    if(spec.failedExpectations && spec.failedExpectations.length) {
      this.counts.failedSpec ++;
      $parent.addClass("failed");
      $exceptionList = $("<ul />");
      for(i=0,len=spec.failedExpectations.length; i<len; i++) {
        $exception = $("<li />", {
          "class": "exception",
          on: {
            click: expand
          }
        });
        $exception.append($("<span />", {
          text: spec.failedExpectations[i].message,
          "class": "message"
        }));
        $exception.append($("<pre />", {
          text: spec.failedExpectations[i].stack,
          style: "display:none"
        }));
        $exceptionList.append($exception);
      }
      $parent.append($exceptionList);
    } else {
      $parent.addClass("ok");
    }
    return $parent.closest(".specs");
  };
  
  SpecMaster.prototype.startSuite = function (suite, $parent) {
    var $suite, $specs;
    $suite = $("<li />", {
      "class": "suite"
    });
    $suite.append($("<span />", {
      "text": suite.description,
      "class": "description"
    }));
    $specs = $("<ul />", {"class": "specs"});
    $specs.appendTo($suite);
    $suite.appendTo($parent);
    return $specs;
  };
  
  SpecMaster.prototype.finishSuite = function (suite, $parent) {
    this.counts.suite++;
    return $parent.closest(".suite").parent();
  };
  
  SpecMaster.prototype.writeSummary = function () {
    var $summary = $("<div />", {
      "class":  this.counts.failedSpec ? "alert alert-danger" : "alert alert-success",
      text: "Runned: " + this.counts.suite + " suites, " + this.counts.spec + " specs; \n Failed: " + this.counts.failedSpec + " specs"
    });
    this.$container.prepend($summary);
  };
  
  SpecMaster.prototype.hanldeMessageEvent = function (e) {
    if(e.origin !== window.location.origin) {
      return;
    }
    var update, $currentParent, detail;
    update = e.data;
    $currentParent = this.$currentParent;
    // console.log(update);
    detail = update.detail;
    switch(update.type) {
    case "spec:start":
      $currentParent = this.startSpec(detail, $currentParent);
      break;
    case "spec:done":
      $currentParent = this.finishSpec(detail, $currentParent);
      break;
    case "suite:start":
      $currentParent = this.startSuite(detail, $currentParent);
      break;
    case "suite:done":
      $currentParent = this.finishSuite(detail, $currentParent);
      break;
    case "jasmine:done":
      this.writeSummary();
      this.$loading.hide();
      break;
    }
    this.$currentParent = $currentParent;
  };
  
  $(function() {
    var master = new SpecMaster(".sandbox-iframe", ".sandbox-result");
    master.listenTo(win);
  });
  
}(window, jQuery));