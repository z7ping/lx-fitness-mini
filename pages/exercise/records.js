// 导入所需服务
const { dataService } = require('../../services/dataService');
const TimeUtils = require('../../utils/timeUtils');

Page({
  data: {
    records: []
  },

  onLoad: function() {
    this.loadRecords();
  },

  onShow: function() {
    this.loadRecords();
  },

  onPullDownRefresh: function() {
    this.loadRecords().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  loadRecords: function() {
    return new Promise((resolve) => {
      try {
        // 从dataService获取运动记录数据
        const records = dataService.getExerciseRecords();
        
        // 格式化记录数据以便显示
        const formattedRecords = records.map(record => {
          // 格式化日期显示
          const recordDate = new Date(record.date);
          const formattedDate = `${recordDate.getFullYear()}-${String(recordDate.getMonth() + 1).padStart(2, '0')}-${String(recordDate.getDate()).padStart(2, '0')}`;
          
          // 返回格式化后的记录
          return {
            id: record.id,
            date: formattedDate,
            type: this.getTypeDisplayName(record.type),
            duration: record.durationMinutes || Math.floor(record.duration / 60),
            calories: record.calories || 0
          };
        });
        
        // 按日期降序排序
        formattedRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        this.setData({
          records: formattedRecords
        });
        resolve();
      } catch (error) {
        console.error('加载运动记录失败:', error);
        wx.showToast({
          title: '加载数据失败',
          icon: 'none'
        });
        resolve();
      }
    });
  },
  
  // 获取运动类型显示名称
  getTypeDisplayName: function(typeId) {
    const typeMap = {
      'running': '跑步',
      'walking': '步行',
      'cycling': '骑行',
      'swimming': '游泳',
      'strength': '力量训练',
      'yoga': '瑜伽',
      'hiit': '高强度间歇训练',
      'cardio': '有氧训练'
    };
    return typeMap[typeId] || '其他运动';
  },

  onRecordTap: function(e) {
    const recordId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/exercise/record-detail?id=${recordId}`
    });
  },
  
  // 跳转到创建运动页面
  onCreateExercise: function() {
    wx.navigateTo({
      url: '/pages/exercise/select'
    });
  }
});