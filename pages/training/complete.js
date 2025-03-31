onLoad(options) {
  // 获取运动数据
  const runningData = wx.getStorageSync('tempRunningData');
  
  if (!runningData) {
    wx.showToast({
      title: '未找到运动数据',
      icon: 'none'
    });
    return;
  }
  
  // 确保数值格式正确
  const distance = parseFloat(runningData.displayDistance) || 0;
  const duration = parseInt(runningData.duration) || 0;
  const calories = parseInt(runningData.calories) || 0;
  
  // 获取数据服务
  const dataService = require('../../services/dataService');
  
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
    runningData: {
      ...runningData,
      displayDistance: distance.toFixed(2),
      durationFormatted,
      calories,
      paceFormatted: avgPaceFormatted || '--\--'
    }
  });
} 