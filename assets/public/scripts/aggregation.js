/*global jQuery, alert, _ */

(function(win, $) {
  var markup = function($box, result) {
    var tpl = $("#aggregationTemplate").html();
    $box.html(_.template(tpl, result));
  };
  
  var normallize = function(data) {
    var table = {};
    //flatten
    data = data.map(function(v) {
      v.commit = v._id.commit;
      v.browser  = v._id.browser;
      delete v._id;
      return v;
    });
    //find commits
    table.commits = _.pluck(data, "commit");
    //find browsers
    table.browsers = _.sortBy(_.pluck(data, "borwser"), "browser");
    table.rows =  _.map(table.commits, function(commit) {
      return _.sortBy(_.filter(data, {commit: commit}), "browser");
    });
    return table;
  };
  
  $(".aggregation").each(function() {
    var $reportCard = $(this);
    // $reportCard.load("/data", $reportCard.data());
    $.getJSON("/data", $reportCard.data()).done(function(data) {
      var result = normallize(data.result);
      markup($reportCard, result);
    }).fail(function() {
      alert("fail to load data");
    });
  });
}(window, jQuery));