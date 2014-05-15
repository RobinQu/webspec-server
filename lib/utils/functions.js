exports.get = function(f) {
  return function(v) {
    return v[f];
  };
};

exports.sortBy = function(f) {
  return function(a, b) {
    return a[f] - b[f];
  };
};