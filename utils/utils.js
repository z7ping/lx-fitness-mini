/**
 * 工具函数集合
 */
module.exports = {
  /**
   * 格式化日期时间
   * @param {Date|string} date 日期对象或日期字符串
   * @param {string} format 格式化模板，如 'YYYY/MM/DD HH:mm:ss'
   * @returns {string} 格式化后的日期字符串
   */
  formatDateTime(date, format = 'YYYY/MM/DD HH:mm:ss') {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // 检查日期是否有效
    if (isNaN(d.getTime())) {
      console.error('无效的日期:', date);
      return '';
    }
    
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();
    
    const pad = (num) => (num < 10 ? '0' + num : num);
    
    return format
      .replace('YYYY', year)
      .replace('MM', pad(month))
      .replace('DD', pad(day))
      .replace('HH', pad(hours))
      .replace('mm', pad(minutes))
      .replace('ss', pad(seconds));
  },

  /**
   * 格式化相对时间（如：3小时前，昨天等）
   * @param {Date|string} date 日期对象或日期字符串
   * @returns {string} 相对时间字符串
   */
  formatRelativeTime(date) {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = now - d;
    
    // 检查日期是否有效
    if (isNaN(d.getTime())) {
      console.error('无效的日期:', date);
      return '';
    }
    
    // 小于1分钟
    if (diff < 60 * 1000) {
      return '刚刚';
    }
    
    // 小于1小时
    if (diff < 60 * 60 * 1000) {
      return Math.floor(diff / (60 * 1000)) + '分钟前';
    }
    
    // 小于24小时
    if (diff < 24 * 60 * 60 * 1000) {
      return Math.floor(diff / (60 * 60 * 1000)) + '小时前';
    }
    
    // 小于48小时
    if (diff < 48 * 60 * 60 * 1000) {
      return '昨天';
    }
    
    // 小于7天
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前';
    }
    
    // 大于7天，返回具体日期
    return this.formatDateTime(d, 'MM-DD HH:mm');
  },
  
  /**
   * 格式化日期
   * @param {Date|string} date 日期对象或日期字符串
   * @param {string} format 格式化模板
   * @returns {string} 格式化后的日期字符串
   */
  formatDate(date, format = 'YYYY/MM/DD') {
    if (!date) return '';
    
    const d = typeof date === 'string' ? new Date(date) : date;
    
    // 检查日期是否有效
    if (isNaN(d.getTime())) {
      console.error('无效的日期:', date);
      return '';
    }
    
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    
    const pad = (num) => (num < 10 ? '0' + num : num);
    
    return format
      .replace('YYYY', year)
      .replace('MM', pad(month))
      .replace('DD', pad(day));
  },
  
  /**
   * 显示提示
   * @param {string} title 提示内容
   * @param {string} icon 图标类型
   */
  showToast(title, icon = 'none') {
    wx.showToast({
      title,
      icon,
      duration: 2000
    });
  },

  /**
   * 显示加载
   * @param {string} title 加载提示文字
   */
  showLoading(title = '加载中...') {
    wx.showLoading({
      title,
      mask: true
    });
  },

  /**
   * 隐藏加载
   */
  hideLoading() {
    wx.hideLoading();
  },
  
  /**
   * 获取当前是第几周
   * @returns {number} 当前周数
   */
  getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil((((now - start) / 86400000) + start.getDay() + 1) / 7);
    return week;
  },

  /**
   * 获取本周的日期范围
   * @returns {Object} 包含开始和结束日期的对象
   */
  getCurrentWeekRange() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(now.setDate(diff + 6));
    return {
      start: this.formatDate(monday),
      end: this.formatDate(sunday)
    };
  },

  /**
   * 获取指定日期是星期几
   * @param {Date|string} date 日期对象或日期字符串
   * @returns {string} 星期几
   */
  getDayOfWeek(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    // 注意：这里的顺序要与 dataService 中的格式一致
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    // JavaScript 中 getDay() 返回 0-6，其中 0 是周日
    // 我们需要将其转换为 1-7，其中 1 是周一
    const dayIndex = d.getDay();
    return days[dayIndex === 0 ? 6 : dayIndex - 1];
  },

/**
 * 格式化时间
 * @param {Date|string} date 日期对象或日期字符串
 * @returns {string} 格式化后的时间字符串 (HH:mm)
 */
formatTime(date) {
  if (!date) return '';
  
  const d = typeof date === 'string' ? new Date(date) : date;
  
  // 检查日期是否有效
  if (isNaN(d.getTime())) {
    console.error('无效的日期:', date);
    return '';
  }
  
  const hours = d.getHours();
  const minutes = d.getMinutes();
  
  const pad = (num) => (num < 10 ? '0' + num : num);
  
  return `${pad(hours)}:${pad(minutes)}`;
}

}; 
