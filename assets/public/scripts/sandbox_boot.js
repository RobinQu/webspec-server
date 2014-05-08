/*global jasmine */
(function() {
  
  var jasmineEnv = jasmine.getEnv();

  // Register reporters
  jasmineEnv.addReporter(new jasmine.JSReporter2());//< for jsreporter
  jasmineEnv.updateInterval = 1000;

  // Launch test on "window.body.onload"
  if (window.attachEvent) {
    window.attachEvent("onload", function() {     //< IE
      setTimeout(function() {
        jasmine.getEnv().execute();
      }, 50);
    });
  } else {
    window.addEventListener("load", function() {  //< everything else
      setTimeout(function() {
        jasmine.getEnv().execute();
      }, 50);
    }, false);
  }
  
}());