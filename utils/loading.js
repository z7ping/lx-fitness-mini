// loading组件
const loading = {
  show: function(options = {}) {
    if (options.floating) {
      // 使用自定义浮动加载样式
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      currentPage.setData({
        'floatingLoading.show': true
      });
    } else {
      // 使用默认全屏加载样式
      wx.showLoading({
        title: '请求中...',
        mask: true
      });
    }
  },
  
  hide: function() {
    // 隐藏默认加载样式
    wx.hideLoading();
    // 隐藏浮动加载样式
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    if (currentPage) {
      currentPage.setData({
        'floatingLoading.show': false
      });
    }
  }
};

module.exports = loading;