// pages/checkin/index.js
Page({
  data: {
    records: [],
    loading: false
  },

  onLoad() {
    this.loadRecords();
  },

  onShow() {
    this.loadRecords();
  },

  // 加载打卡记录
  async loadRecords() {
    try {
      this.setData({ loading: true });
      // TODO: 从服务器获取打卡记录
      this.setData({
        records: [
          {
            id: 1,
            planId: 'plan001',
            planTitle: '上肢力量训练',
            checkinTime: '2024-01-20 09:30',
            location: {
              name: '星光健身房',
              address: '北京市朝阳区星光大厦B1层',
              latitude: 39.9042,
              longitude: 116.4074
            },
            duration: 45,
            calories: 320,
            thoughts: '完成了所有计划动作，感觉不错',
            images: ['/assets/images/record1.png']
          },
          {
            id: 2,
            planId: 'plan002',
            planTitle: '核心训练',
            checkinTime: '2024-01-19 15:45',
            location: {
              name: '家庭健身房',
              address: '北京市海淀区某小区',
              latitude: 39.9842,
              longitude: 116.3174
            },
            duration: 30,
            calories: 250,
            thoughts: '完成基础动作组',
            images: []
          }
        ]
      });
    } catch (error) {
      console.error('加载打卡记录失败:', error);
      getApp().utils.showToast('加载打卡记录失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 创建新打卡
  createRecord() {
    wx.navigateTo({
      url: '/pages/checkin/create'
    });
  },

  // 查看打卡详情
  viewRecordDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/checkin/detail?id=${id}`
    });
  },

  // 预览打卡图片
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({
      urls,
      current
    });
  }
});