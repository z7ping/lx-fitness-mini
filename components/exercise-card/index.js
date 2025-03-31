// 组件属性监听器
observers: {
  'record': function(record) {
    if (!record) return;
    
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
    const formattedDate = record.date || utils.formatDateTime(recordDate, 'YYYY-MM-DD');
    const formattedTime = utils.formatTime(recordDate);
    const relativeTime = utils.formatRelativeTime(recordDate);
    
    // 确保数值格式正确
    const distance = parseFloat(record.displayDistance) || 0;
    const duration = parseInt(record.duration) || 0;
    const calories = parseInt(record.calories) || 0;
    
    // 获取数据服务
    const dataService = require('../../services/dataService');
    
    // 格式化持续时间
    const durationFormatted = record.durationFormatted || dataService.formatDuration(duration);
    
    this.setData({
      formattedRecord: {
        ...record,
        formattedDate,
        formattedTime,
        relativeTime,
        displayDistance: distance.toFixed(2),
        durationFormatted,
        calories
      }
    });
  }
} 