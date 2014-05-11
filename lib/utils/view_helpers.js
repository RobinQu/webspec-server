module.exports = {
  
  currentUser: function() {
    return this.req.user;
  },
  
  live: function() {
    return require("hc").get().live;
  }
  
};