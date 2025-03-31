Page({
  data: {
    imagePath: '',
    recordId: null
  },

  onLoad(options) {
    if (options.imagePath) {
      this.setData({
        imagePath: decodeURIComponent(options.imagePath),
        recordId: options.recordId
      });
    }
  },

  // 分享给朋友
  onShareAppMessage() {
    return {
      title: '我的运动记录',
      imageUrl: this.data.imagePath,
      path: `/pages/exercise/record-detail?id=${this.data.recordId}`
    };
  },

  // 分享到朋友圈
  onShareToMoments() {
    wx.showToast({
      title: '分享到朋友圈功能开发中',
      icon: 'none'
    });
  },

  // 保存到相册
  onSaveToAlbum() {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.imagePath,
      success: () => {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '保存失败，请检查权限',
          icon: 'none'
        });
      }
    });
  }
}); 