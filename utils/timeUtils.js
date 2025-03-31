/**
 * 时间工具类
 */
const TimeUtils = {
  /**
   * 格式化运动时长（秒转为时:分:秒）
   * @param {number} seconds 秒数
   * @param {boolean} useColon 是否使用冒号格式（默认为true）
   * @returns {string} 格式化后的时间
   */
  formatDuration(seconds, useColon = true) {
    if (!seconds || isNaN(seconds)) return useColon ? '00:00:00' : '0分钟';
    
    seconds = Math.max(0, Math.floor(seconds)); // 确保为非负整数
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (useColon) {
      // 使用 HH:mm:ss 格式
      const pad = (num) => (num < 10 ? '0' + num : num);
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    } else {
      // 使用智能格式：根据时长选择合适的显示方式
      let text = '';
      if (hours > 0) {
        text += `${hours}小时`;
        if (minutes > 0) text += `${minutes}分钟`;
      } else if (minutes > 0) {
        text += `${minutes}分钟`;
        if (secs > 0 && minutes < 10) text += `${secs}秒`; // 只在分钟数较小时显示秒
      } else {
        text += `${secs}秒`;
      }
      return text;
    }
  },

  /**
   * 格式化运动时长为分钟显示（仅用于统计）
   * @param {number} seconds 秒数
   * @returns {number} 分钟数（向上取整）
   */
  formatDurationToMinutes(seconds) {
    if (!seconds || isNaN(seconds)) return 0;
    return Math.ceil(seconds / 60);
  },

  /**
   * 格式化运动时长为语音播报格式
   * @param {number} seconds 秒数
   * @returns {string} 语音播报格式（X小时X分钟）
   */
  formatDurationToSpeak(seconds) {
    if (!seconds || isNaN(seconds)) return '0分钟';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    let text = '';
    if (hours > 0) {
      text += `${hours}小时`;
    }
    if (minutes > 0 || hours === 0) {
      text += `${minutes}分钟`;
    }
    return text;
  },

  /**
   * 格式化配速（秒/公里 -> 分'秒"）
   * @param {number} pace 配速（秒/公里）
   * @returns {string} 格式化后的配速
   */
  formatPace(pace) {
    if (!pace || isNaN(pace) || pace <= 0) return '--\--';
    
    // 限制配速在合理范围内（2分钟/公里到30分钟/公里）
    pace = Math.min(1800, Math.max(120, pace));
    
    const minutes = Math.floor(pace / 60);
    const seconds = Math.floor(pace % 60);
    return `${minutes}'${seconds.toString().padStart(2, '0')}"`;
  },

  /**
   * 格式化配速为语音播报格式
   * @param {number} pace 配速（秒/公里）
   * @returns {string} 语音播报格式
   */
  formatPaceToSpeak(pace) {
    if (!pace || isNaN(pace) || pace <= 0) return '配速未知';
    
    const minutes = Math.floor(pace / 60);
    const seconds = Math.floor(pace % 60);
    return `${minutes}分${seconds}秒每公里`;
  }
};

module.exports = TimeUtils; 