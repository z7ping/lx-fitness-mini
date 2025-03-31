/**
 * 数据存储服务
 * 处理运动数据的存储和检索
 */

// 存储键名常量
const STORAGE_KEYS = {
  EXERCISE_RECORDS: 'exerciseRecords',
  TRAINING_STATS: 'trainingStats',
  USER_INFO: 'userInfo'
};

/**
 * 保存运动记录
 * @param {Object} exerciseData 运动数据
 * @returns {Object} 保存的记录
 */
function saveExerciseRecord(exerciseData) {
  try {
    // 确保所有数值都是有效的
    const distance = parseFloat(exerciseData.distance) || 0;
    const displayDistance = parseFloat(exerciseData.displayDistance) || 0;
    const duration = parseInt(exerciseData.duration) || 0;
    const calories = parseInt(exerciseData.calories) || 0;
    
    // 创建新记录
    const newRecord = {
      id: Date.now(),
      name: exerciseData.name,
      date: exerciseData.date || new Date().toISOString(),
      duration: duration,
      distance: distance,
      displayDistance: displayDistance.toFixed(2), // 确保显示距离格式正确
      calories: calories,
      trackPoints: exerciseData.trackPoints || []
    };
    
    // 获取现有记录
    const records = wx.getStorageSync(STORAGE_KEYS.EXERCISE_RECORDS) || [];
    
    // 添加新记录到开头
    records.unshift(newRecord);
    
    // 保存回存储
    wx.setStorageSync(STORAGE_KEYS.EXERCISE_RECORDS, records);
    
    // 更新训练统计数据
    updateTrainingStats(newRecord);
    
    console.log('运动数据已保存:', newRecord);
    return newRecord;
  } catch (error) {
    console.error('保存运动数据失败:', error);
    throw error;
  }
}

/**
 * 更新训练统计数据
 * @param {Object} exerciseData 运动数据
 */
function updateTrainingStats(exerciseData) {
  try {
    // 获取现有统计数据
    let stats = wx.getStorageSync(STORAGE_KEYS.TRAINING_STATS);
    
    if (!stats) {
      // 如果没有，则创建新的统计数据
      stats = {
        lastTrainingDate: new Date().toISOString(),
        trainingCount: 0,
        totalDistance: 0,
        totalDuration: 0
      };
    }
    
    // 更新统计数据
    stats.lastTrainingDate = exerciseData.date || new Date().toISOString();
    stats.trainingCount += 1;
    stats.totalDistance += exerciseData.distance;
    stats.totalDuration += exerciseData.duration;
    
    // 保存回存储
    wx.setStorageSync(STORAGE_KEYS.TRAINING_STATS, stats);
    
    console.log('运动统计数据已更新:', stats);
  } catch (error) {
    console.error('更新运动统计数据失败:', error);
    throw error;
  }
}

/**
 * 获取所有运动记录
 * @returns {Array} 运动记录数组
 */
function getExerciseRecords() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.EXERCISE_RECORDS) || [];
  } catch (error) {
    console.error('获取运动记录失败:', error);
    return [];
  }
}

/**
 * 获取最近的运动记录
 * @param {number} limit 记录数量限制
 * @returns {Array} 最近的运动记录数组
 */
function getRecentExerciseRecords(limit = 5) {
  const records = getExerciseRecords();
  return records.slice(0, limit);
}

/**
 * 获取运动记录详情
 * @param {number} id 记录ID
 * @returns {Object|null} 运动记录详情
 */
function getExerciseRecordById(id) {
  const records = getExerciseRecords();
  return records.find(record => record.id === id) || null;
}

/**
 * 删除运动记录
 * @param {number} id 记录ID
 * @returns {boolean} 是否删除成功
 */
function deleteExerciseRecord(id) {
  try {
    const records = getExerciseRecords();
    const index = records.findIndex(record => record.id === id);
    
    if (index === -1) {
      return false;
    }
    
    // 获取要删除的记录
    const recordToDelete = records[index];
    
    // 从数组中删除记录
    records.splice(index, 1);
    
    // 保存回存储
    wx.setStorageSync(STORAGE_KEYS.EXERCISE_RECORDS, records);
    
    // 更新训练统计数据
    updateTrainingStatsAfterDelete(recordToDelete);
    
    return true;
  } catch (error) {
    console.error('删除运动记录失败:', error);
    return false;
  }
}

/**
 * 删除记录后更新训练统计数据
 * @param {Object} deletedRecord 被删除的记录
 */
function updateTrainingStatsAfterDelete(deletedRecord) {
  try {
    // 获取现有统计数据
    let stats = wx.getStorageSync(STORAGE_KEYS.TRAINING_STATS);
    
    if (!stats) {
      return;
    }
    
    // 更新统计数据
    stats.trainingCount = Math.max(0, stats.trainingCount - 1);
    stats.totalDistance = Math.max(0, stats.totalDistance - deletedRecord.distance);
    stats.totalDuration = Math.max(0, stats.totalDuration - deletedRecord.duration);
    
    // 如果删除的是最后一次训练记录，需要更新最后训练日期
    if (stats.lastTrainingDate === deletedRecord.date) {
      const records = getExerciseRecords();
      stats.lastTrainingDate = records.length > 0 ? records[0].date : new Date().toISOString();
    }
    
    // 保存回存储
    wx.setStorageSync(STORAGE_KEYS.TRAINING_STATS, stats);
    
    console.log('删除后更新运动统计数据:', stats);
  } catch (error) {
    console.error('更新运动统计数据失败:', error);
  }
}

/**
 * 获取训练统计数据
 * @returns {Object} 训练统计数据
 */
function getTrainingStats() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.TRAINING_STATS) || {
      lastTrainingDate: new Date().toISOString(),
      trainingCount: 0,
      totalDistance: 0,
      totalDuration: 0
    };
  } catch (error) {
    console.error('获取训练统计数据失败:', error);
    return {
      lastTrainingDate: new Date().toISOString(),
      trainingCount: 0,
      totalDistance: 0,
      totalDuration: 0
    };
  }
}

/**
 * 保存用户信息
 * @param {Object} userInfo 用户信息
 */
function saveUserInfo(userInfo) {
  try {
    wx.setStorageSync(STORAGE_KEYS.USER_INFO, userInfo);
  } catch (error) {
    console.error('保存用户信息失败:', error);
    throw error;
  }
}

/**
 * 获取用户信息
 * @returns {Object|null} 用户信息
 */
function getUserInfo() {
  try {
    return wx.getStorageSync(STORAGE_KEYS.USER_INFO) || null;
  } catch (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
}

/**
 * 清除所有数据（慎用）
 */
function clearAllData() {
  try {
    wx.removeStorageSync(STORAGE_KEYS.EXERCISE_RECORDS);
    wx.removeStorageSync(STORAGE_KEYS.TRAINING_STATS);
    console.log('所有数据已清除');
  } catch (error) {
    console.error('清除数据失败:', error);
    throw error;
  }
}

module.exports = {
  STORAGE_KEYS,
  saveExerciseRecord,
  getExerciseRecords,
  getRecentExerciseRecords,
  getExerciseRecordById,
  deleteExerciseRecord,
  getTrainingStats,
  saveUserInfo,
  getUserInfo,
  clearAllData
}; 