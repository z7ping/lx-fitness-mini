// 训练完成页面
const app = getApp();

Page({
  data: {
    runningData: null,
    strengthData: null,
    exerciseType: '', // 'cardio' 或 'strength'
    completedTime: '',
    loading: true
  },

  onLoad(options) {
    // 检查登录状态
    if (!app.checkLoginAndAuth()) {
      return;
    }

    // 获取当前时间
    const now = new Date();
    const completedTime = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    this.setData({ completedTime });

    try {
      // 尝试获取有氧训练数据
      const runningData = wx.getStorageSync('tempRunningData');
      
      // 尝试获取力量训练数据
      const strengthData = wx.getStorageSync('currentTrainingExercise');
      
      if (runningData) {
        // 处理有氧训练数据
        this.processCardioData(runningData);
      } else if (strengthData) {
        // 处理力量训练数据
        this.processStrengthData(strengthData);
      } else {
        wx.showToast({
          title: '未找到训练数据',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }
    } catch (error) {
      console.error('训练完成页面加载失败:', error);
      wx.showToast({
        title: '加载训练数据失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  processCardioData(runningData) {
    // 确保数值格式正确
    const distance = parseFloat(runningData.displayDistance) || 0;
    const duration = parseInt(runningData.duration) || 0;
    const calories = parseInt(runningData.calories) || 0;
    
    // 获取数据服务
    const { dataService } = require('../../services/dataService');
    
    // 格式化持续时间
    const durationFormatted = runningData.durationFormatted || dataService.formatDuration(duration);
    
    // 格式化配速
    let avgPaceFormatted = runningData.paceFormatted;
    if (!avgPaceFormatted && distance > 0 && duration > 0) {
      const pace = (duration / 60) / (distance / 1000);
      const paceMinutes = Math.floor(pace);
      const paceSeconds = Math.floor((pace - paceMinutes) * 60);
      avgPaceFormatted = `${paceMinutes}'${paceSeconds < 10 ? '0' : ''}${paceSeconds}"`;
    }
    
    this.setData({
      exerciseType: 'cardio',
      runningData: {
        ...runningData,
        displayDistance: distance.toFixed(2),
        durationFormatted,
        calories,
        paceFormatted: avgPaceFormatted || '--:--'
      }
    });
  },

  processStrengthData(strengthData) {
    this.setData({
      exerciseType: 'strength',
      strengthData: {
        name: strengthData.name || '力量训练',
        sets: parseInt(strengthData.sets) || 3,
        reps: parseInt(strengthData.reps) || 12,
        weight: parseFloat(strengthData.weight) || 0,
        duration: parseInt(strengthData.duration) || 0,
        calories: parseInt(strengthData.calories) || 0
      }
    });
  },

  // 返回首页
  goHome() {
    wx.switchTab({
      url: '/pages/index/index'
    });
  },

  // 返回训练计划页
  goToPlan() {
    wx.switchTab({
      url: '/pages/plan/index'
    });
  },

  // 分享训练成果
  shareResult() {
    wx.showToast({
      title: '分享功能开发中',
      icon: 'none'
    });
  },

  onUnload() {
    // 清除存储的临时训练数据
    try {
      wx.removeStorageSync('tempRunningData');
      wx.removeStorageSync('currentTrainingExercise');
    } catch (error) {
      console.error('清除训练数据失败:', error);
    }
  }
}); 