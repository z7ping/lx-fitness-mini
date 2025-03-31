// pages/dashboard/index.js
const app = getApp()
const { dataService } = require('../../services/dataService')
const utils = require('../../utils/utils')

Page({
  data: {
    loading: true,
    healthStats: {
      totalDuration: 0,
      totalCalories: 0,
      totalDistance: 0,
      totalCount: 0
    },
    weeklyStats: {
      duration: 0,
      calories: 0,
      distance: 0,
      count: 0
    },
    monthlyStats: {
      duration: 0,
      calories: 0,
      distance: 0,
      count: 0
    },
    recentRecords: [],
    chartData: {
      duration: [],
      calories: [],
      distance: []
    }
  },

  onLoad() {
    // 检查登录状态
    if (!app.checkLoginAndAuth()) {
      return;
    }
    this.loadData();
  },

  onShow() {
    // 检查登录状态
    if (!app.checkLoginAndAuth()) {
      return;
    }
    // 每次显示页面时更新数据
    this.loadData();
  },

  // 加载数据
  async loadData() {
    try {
      this.setData({ loading: true });
      
      // 获取所有运动记录
      const records = dataService.getExerciseRecords() || [];
      
      // 计算总统计数据
      const totalStats = this.calculateTotalStats(records);
      
      // 计算周统计数据
      const weeklyStats = this.calculateWeeklyStats(records);
      
      // 计算月统计数据
      const monthlyStats = this.calculateMonthlyStats(records);
      
      // 获取最近记录
      const recentRecords = this.getRecentRecords(records);
      
      // 准备图表数据
      const chartData = this.prepareChartData(records);
      
      this.setData({
        healthStats: totalStats,
        weeklyStats,
        monthlyStats,
        recentRecords,
        chartData,
        loading: false
      });
    } catch (error) {
      console.error('加载健康数据失败:', error);
      this.setData({ loading: false });
      app.utils.showToast('加载失败，请重试');
    }
  },

  // 计算总统计数据
  calculateTotalStats(records) {
    return records.reduce((stats, record) => {
      return {
        totalDuration: stats.totalDuration + (record.duration || 0),
        totalCalories: stats.totalCalories + (record.calories || 0),
        totalDistance: stats.totalDistance + (record.distance || 0),
        totalCount: stats.totalCount + 1
      };
    }, {
      totalDuration: 0,
      totalCalories: 0,
      totalDistance: 0,
      totalCount: 0
    });
  },

  // 计算周统计数据
  calculateWeeklyStats(records) {
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    weekStart.setHours(0, 0, 0, 0);
    
    const weekRecords = records.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= weekStart;
    });
    
    return this.calculateTotalStats(weekRecords);
  },

  // 计算月统计数据
  calculateMonthlyStats(records) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const monthRecords = records.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= monthStart;
    });
    
    return this.calculateTotalStats(monthRecords);
  },

  // 获取最近记录
  getRecentRecords(records) {
    const TimeUtils = require('../../utils/timeUtils');
    return records
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(record => ({
        ...record,
        formattedDate: utils.formatDate(new Date(record.date)),
        durationFormatted: TimeUtils.formatDuration(record.duration)
      }));
  },

  // 准备图表数据
  prepareChartData(records) {
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      return utils.formatDate(date, 'MM-DD');
    }).reverse();
    
    const duration = new Array(7).fill(0);
    const calories = new Array(7).fill(0);
    const distance = new Array(7).fill(0);
    
    records.forEach(record => {
      const recordDate = utils.formatDate(new Date(record.date), 'MM-DD');
      const index = last7Days.indexOf(recordDate);
      if (index !== -1) {
        duration[index] += record.duration || 0;
        calories[index] += record.calories || 0;
        distance[index] += record.distance || 0;
      }
    });
    
    return {
      duration,
      calories,
      distance
    };
  },

  // 查看记录详情
  viewRecordDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/exercise/record-detail?id=${id}`
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  }
});