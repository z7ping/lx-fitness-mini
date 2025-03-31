// loading组件
const loading = {
  show: function() {
    wx.showLoading({
      title: '请求中...',
      mask: true
    });
  },
  
  hide: function() {
    wx.hideLoading();
  }
};

module.exports = loading;