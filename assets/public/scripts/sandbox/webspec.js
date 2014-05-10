(function(win) {
  var utils = win.__SANDBOX_UTILS__,
      sandbox = win.__SANDBOX__,
      files = [], iterate;
  
  iterate = function(items) {
    var i, len, list = [];
    for(i=0,len=items.length; i<len; i++) {
      if(typeof items[i] === "string") {//assuming it's a filename
        list.push(items[i]);
      } else {//assuming it's an object
        utils.ajax()
      }
    }
  };
  
  
  
}(window));