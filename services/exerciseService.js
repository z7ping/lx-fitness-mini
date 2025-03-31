/**
 * 运动数据管理服务
 * 处理运动数据的计算和更新
 */
const exerciseUtils = require('../utils/exercise');
const locationService = require('./locationService');
const dataService = require('./dataService');

class ExerciseService {
  constructor() {
    this.isRunning = false;
    this.timer = null;
    this.dataCollectionTimer = null;
    this.runningData = this.getInitialRunningData();
    this.trainingInfo = {
      name: '',
      duration: 30,
      type: ''
    };
    this.userWeight = 70; // 默认用户体重(kg)
    
    // 尝试获取用户体重信息
    this.getUserWeight();
  }

  /**
   * 获取初始运动数据
   * @returns {Object} 初始运动数据
   */
  getInitialRunningData() {
    return {
      duration: 0,        // 运动时长（秒）
      distance: 0,        // 总距离（米）
      displayDistance: '0.00', // 用于显示的距离（公里）
      currentPace: 0,     // 实时配速
      currentPaceFormatted: '--\--', // 格式化的实时配速
      avgPace: 0,         // 平均配速
      paceFormatted: '--\--', // 格式化的平均配速
      calories: 0,        // 消耗卡路里
      cadence: 0,         // 实时步频
      avgCadence: 0,      // 平均步频
      stride: 0,          // 平均步幅
      strideFormatted: '0.00', // 格式化的步幅
      steps: 0,           // 总步数
      durationFormatted: '00:00:00' // 格式化的时间
    };
  }

  /**
   * 尝试获取用户体重信息
   */
  getUserWeight() {
    try {
      const userInfo = dataService.getUserInfo();
      if (userInfo && userInfo.weight) {
        this.userWeight = userInfo.weight;
      }
    } catch (error) {
      console.error('获取用户体重信息失败:', error);
    }
  }

  /**
   * 设置训练信息
   * @param {Object} info 训练信息
   */
  setTrainingInfo(info) {
    this.trainingInfo = {
      name: info.name || '快速跑步',
      duration: parseInt(info.duration) || 30,
      type: info.type || ''
    };
  }

  /**
   * 开始运动
   * @param {Function} callback 数据更新回调函数
   * @returns {Promise<boolean>} 是否成功开始
   */
  async startExercise(callback) {
    // 防止重复开始
    if (this.isRunning) {
      return false;
    }
    
    // 重置运动数据
    this.runningData = this.getInitialRunningData();
    this.isRunning = true;
    
    // 开始位置追踪
    const trackingStarted = await locationService.startTracking(this.handleLocationUpdate.bind(this));
    if (!trackingStarted) {
      this.isRunning = false;
      return false;
    }
    
    // 开始计时
    this.startTimer(callback);
    
    // 开始数据采集
    this.startDataCollection(callback);
    
    // 震动提示
    wx.vibrateShort({
      type: 'medium'
    });
    
    return true;
  }

  /**
   * 开始计时
   * @param {Function} callback 数据更新回调函数
   */
  startTimer(callback) {
    // 清除可能存在的旧定时器
    if (this.timer) {
      clearInterval(this.timer);
    }
    
    this.timer = setInterval(() => {
      if (!this.isRunning) return;
      
      this.runningData.duration += 1;
      this.updateRunningData();
      
      // 调用回调函数
      if (callback) {
        callback(this.runningData);
      }
      
      // 检查是否达到目标时间
      if (this.runningData.duration >= this.trainingInfo.duration * 60) {
        wx.vibrateLong(); // 震动提醒
        wx.showToast({
          title: '已达到目标时间',
          icon: 'success',
          duration: 2000
        });
      }
    }, 1000);
  }

  /**
   * 开始数据采集
   * @param {Function} callback 数据更新回调函数
   */
  startDataCollection(callback) {
    // 清除可能存在的旧定时器
    if (this.dataCollectionTimer) {
      clearInterval(this.dataCollectionTimer);
    }
    
    this.dataCollectionTimer = setInterval(() => {
      if (!this.isRunning) return;
      
      // 更新步频（模拟数据）
      this.runningData.cadence = Math.floor(160 + Math.random() * 20);
      
      // 更新平均步频
      if (this.runningData.duration > 0) {
        this.runningData.avgCadence = Math.floor(
          (this.runningData.avgCadence * (this.runningData.duration - 1) + this.runningData.cadence) / 
          this.runningData.duration
        );
      } else {
        this.runningData.avgCadence = this.runningData.cadence;
      }
      
      // 更新步数
      this.runningData.steps = Math.floor(this.runningData.avgCadence * (this.runningData.duration / 60));
      
      // 更新步幅
      this.runningData.stride = exerciseUtils.calculateStride(this.runningData.distance, this.runningData.steps);
      
      // 更新卡路里
      this.runningData.calories = exerciseUtils.calculateCalories(
        this.userWeight, 
        this.runningData.duration, 
        this.runningData.currentPace
      );
      
      this.updateRunningData();
      
      // 调用回调函数
      if (callback) {
        callback(this.runningData);
      }
    }, 1000);
  }

  /**
   * 处理位置更新
   * @param {Array} locations 位置记录数组
   */
  handleLocationUpdate(locations) {
    if (!this.isRunning || locations.length < 2) return;
    
    // 获取最后两个位置点
    const lastTwo = locations.slice(-2);
    
    // 计算距离
    const distance = exerciseUtils.calculateDistance(
      lastTwo[0].latitude,
      lastTwo[0].longitude,
      lastTwo[1].latitude,
      lastTwo[1].longitude
    );
    
    // 如果距离异常大，可能是GPS漂移，忽略此次更新
    if (exerciseUtils.isGpsDrift(distance)) {
      console.warn('检测到可能的GPS漂移，忽略此次距离更新');
      return;
    }
    
    // 更新总距离
    this.runningData.distance += distance;
    
    // 更新显示距离（转换为公里并保留两位小数）
    this.runningData.displayDistance = (this.runningData.distance / 1000).toFixed(2);
    
    // 更新配速
    this.runningData.currentPace = exerciseUtils.calculatePace(this.runningData.distance, this.runningData.duration);
    this.runningData.avgPace = this.runningData.currentPace;
    
    // 更新运动数据
    this.updateRunningData();
  }

  /**
   * 更新运动数据
   */
  updateRunningData() {
    // 使用工具类格式化数据
    const formattedData = exerciseUtils.formatRunningData(this.runningData);
    
    // 更新运行数据
    this.runningData = formattedData;
  }

  /**
   * 停止运动
   * @returns {Object} 保存的运动记录
   */
  stopExercise() {
    if (!this.isRunning) {
      return null;
    }
    
    this.isRunning = false;
    
    // 清除计时器
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    if (this.dataCollectionTimer) {
      clearInterval(this.dataCollectionTimer);
      this.dataCollectionTimer = null;
    }
    
    // 停止位置追踪
    locationService.stopTracking();
    
    // 保存运动数据
    const savedRecord = this.saveExerciseData();
    
    // 震动提示
    wx.vibrateLong();
    
    return savedRecord;
  }

  /**
   * 保存运动数据
   * @returns {Object} 保存的运动记录
   */
  saveExerciseData() {
    // 获取轨迹点数据
    const trackPoints = locationService.getLocations().map(loc => ({
      latitude: loc.latitude,
      longitude: loc.longitude
    }));
    
    // 准备运动数据
    const exerciseData = {
      ...this.runningData,
      date: new Date().toISOString(),
      type: this.trainingInfo.type,
      name: this.trainingInfo.name,
      trackPoints: trackPoints,
      deviceId: this.connectedDeviceId // 如果有连接设备，记录设备ID
    };
    
    try {
      // 保存到统一数据服务
      const savedRecord = dataService.saveExerciseRecord(exerciseData);
      
      wx.showToast({
        title: '运动数据已保存',
        icon: 'success'
      });
      
      return savedRecord;
    } catch (error) {
      console.error('保存运动数据失败:', error);
      wx.showToast({
        title: '保存数据失败',
        icon: 'none'
      });
      return null;
    }
  }

  /**
   * 获取当前运动数据
   * @returns {Object} 当前运动数据
   */
  getRunningData() {
    return this.runningData;
  }

  /**
   * 获取当前训练信息
   * @returns {Object} 当前训练信息
   */
  getTrainingInfo() {
    return this.trainingInfo;
  }

  /**
   * 获取当前轨迹线数据
   * @returns {Array} 轨迹线数据
   */
  getPolyline() {
    return locationService.getPolyline();
  }

  /**
   * 获取当前位置
   * @returns {Promise} 当前位置的Promise
   */
  getCurrentLocation() {
    return locationService.getInitialLocation();
  }

  /**
   * 是否正在运动
   * @returns {boolean} 是否正在运动
   */
  isExercising() {
    return this.isRunning;
  }

  /**
   * 清理资源
   */
  cleanup() {
    // 停止运动
    if (this.isRunning) {
      this.stopExercise();
    }
    
    // 清除计时器
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    if (this.dataCollectionTimer) {
      clearInterval(this.dataCollectionTimer);
      this.dataCollectionTimer = null;
    }
  }
}

module.exports = new ExerciseService(); 