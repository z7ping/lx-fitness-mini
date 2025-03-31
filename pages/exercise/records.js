const TimeUtils = require('../../utils/timeUtils');

Page({
  data: {
    records: [],
    loading: true
  },

  onLoad() {
    this.loadRecords();
  },

  onShow() {
    // 每次显示页面时重新加载记录，以确保数据最新
    this.loadRecords();
  },

  // 加载运动记录
  async loadRecords() {
    try {
      this.setData({ loading: true });
      
      const dataService = require('../../services/dataService');
      const records = dataService.getExerciseRecords();
      
      // 格式化记录数据
      const formattedRecords = records.map(record => {
        // 获取工具类
        const utils = getApp().utils;
        
        // 解析日期
        let recordDate;
        if (record.timestamp) {
          // 如果有时间戳，直接使用
          recordDate = new Date(record.timestamp);
        } else {
          // 否则尝试解析日期字符串
          recordDate = new Date(record.date);
        }
        
        // 检查日期是否有效
        if (isNaN(recordDate.getTime())) {
          console.error('无效的日期:', record.date);
          recordDate = new Date();
        }
        
        // 格式化日期和时间
        const formattedDate = record.date || utils.formatDateTime(recordDate, 'YYYY-MM-DD HH:mm:ss');
        const formattedTime = utils.formatTime(recordDate);
        const relativeTime = utils.formatRelativeTime(recordDate);
        
        // 确保数值格式正确
        const distance = parseFloat(record.displayDistance) || 0;
        const duration = parseInt(record.duration) || 0;
        const calories = parseInt(record.calories) || 0;
        
        // 格式化持续时间（使用智能格式）
        const durationFormatted = record.durationFormatted || TimeUtils.formatDuration(duration, false);
        const durationMinutes = TimeUtils.formatDurationToMinutes(duration);
        
        return {
          ...record,
          formattedDate,
          formattedTime,
          relativeTime,
          displayDistance: distance.toFixed(2),
          durationFormatted,
          durationMinutes,
          calories: calories
        };
      });
      
      this.setData({
        records: formattedRecords,
        loading: false,
        hasRecords: formattedRecords.length > 0
      });
    } catch (error) {
      console.error('加载运动记录失败:', error);
      this.setData({
        loading: false,
        hasRecords: false
      });
      getApp().utils.showToast('加载失败');
    }
  },

  // 查看记录详情
  viewRecordDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/exercise/record-detail?id=${id}`
    });
  },

  // 删除记录
  deleteRecord(e) {
    const { id, index } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条运动记录吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            const dataService = require('../../services/dataService');
            const records = dataService.getExerciseRecords();
            // 删除指定记录
            const newRecords = records.filter(record => record.id != id);
            // 使用 dataService 更新数据
            dataService.updateExerciseRecords(newRecords);
            
            // 更新页面数据
            this.loadRecords(); // 重新加载以确保数据同步
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          } catch (error) {
            console.error('删除记录失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadRecords();
    wx.stopPullDownRefresh();
  },

  // 添加点击记录跳转方法
  handleRecordClick(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/exercise/record-detail?id=${id}`
    });
  }
}); 