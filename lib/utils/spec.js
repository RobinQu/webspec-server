exports.group = function(files) {
  var spec = [], source = [];
  files.forEach(function(file) {
    if(file.type === "file") {//should be a file
      if(/spec.js$/.test(file.name.toLowerCase())) {//including a `spec` substring
        spec.push(file);
      } else {
        spec.push(file);
      }
    }
  });
  return {spec: spec, source: source};
};