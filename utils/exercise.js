/**
 * 运动数据工具类
 * 包含运动数据计算、格式化等通用方法
 */

// 计算两点之间的距离（米）
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // 地球半径（米）
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 角度转弧度
function toRad(degree) {
  return degree * Math.PI / 180;
}

// 格式化配速（秒/公里 -> 分'秒"）
function formatPace(pace) {
  if (!pace || isNaN(pace) || pace <= 0) return '--\--';
  
  // 限制配速在合理范围内
  pace = Math.min(1800, Math.max(120, pace)); // 2分钟/公里到30分钟/公里
  
  const minutes = Math.floor(pace / 60);
  const seconds = Math.floor(pace % 60);
  return minutes + '\'' + seconds.toString().padStart(2, '0') + '"';
}

// 格式化时间（秒 -> HH:MM:SS）
function formatDuration(duration) {
  if (!duration || isNaN(duration)) return '00:00:00';
  
  duration = Math.max(0, duration); // 确保时间不为负
  
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor(duration / 60) % 60;
  const seconds = duration % 60;
  return hours.toString().padStart(2, '0') + ':' + 
         minutes.toString().padStart(2, '0') + ':' + 
         seconds.toString().padStart(2, '0');
}

// 计算卡路里消耗
function calculateCalories(weight, duration, pace) {
  // MET值(代谢当量)：慢跑约为7，快跑约为12
  const MET = pace < 360 ? 12 : 7; // 配速小于6分钟/公里为快跑
  // 卡路里(kcal) = 体重(kg) × MET × 时间(小时)
  return Math.floor(weight * MET * (duration / 3600));
}

// 检测GPS漂移
function isGpsDrift(distance, timeInterval = 1) {
  // 默认时间间隔为1秒，最大合理速度为50米/秒（180km/h）
  const maxReasonableSpeed = 50; // 米/秒
  return distance > maxReasonableSpeed * timeInterval;
}

// 更新运动数据，添加格式化的值
function formatRunningData(data) {
  const formattedData = { ...data };
  
  // 添加格式化的实时配速
  formattedData.currentPaceFormatted = formatPace(data.currentPace);
  // 添加格式化的平均配速
  formattedData.paceFormatted = formatPace(data.avgPace);
  // 添加格式化的时间
  formattedData.durationFormatted = formatDuration(data.duration);
  // 添加格式化的步幅
  formattedData.strideFormatted = data.stride ? data.stride.toFixed(2) : '0.00';
  
  return formattedData;
}

// 计算合理的步幅
function calculateStride(distance, steps) {
  if (steps > 10) {
    // 限制步幅在合理范围内（0.3米到2.5米）
    return Math.min(2.5, Math.max(0.3, distance / steps));
  } else {
    // 默认步幅
    return 0.7;
  }
}

// 计算配速（秒/公里）
function calculatePace(distance, duration) {
  const minDistance = 0.01; // 10米
  if (distance > minDistance * 1000 && duration > 0) {
    const paceInSeconds = (duration / (distance / 1000));
    // 限制配速在合理范围内（2分钟/公里到30分钟/公里）
    return Math.min(1800, Math.max(120, paceInSeconds));
  }
  return 0;
}

module.exports = {
  calculateDistance,
  formatPace,
  formatDuration,
  calculateCalories,
  isGpsDrift,
  formatRunningData,
  calculateStride,
  calculatePace
}; 