/**
 * 统一数据存储服务
 * 处理所有模块数据的存储、检索和同步
 */

// 存储键名常量
const STORAGE_KEYS = {
  EXERCISE_RECORDS: 'exerciseRecords',
  TRAINING_STATS: 'trainingStats',
  USER_INFO: 'userInfo',
  BOUND_DEVICES: 'boundDevices',
  TRAINING_PLANS: 'trainingPlans',
  AI_PLANS: 'aiPlans',
  USER_FITNESS_INFO: 'userFitnessInfo',
  CHECKIN_RECORDS: 'checkinRecords',
  TRAINING_PLAN: 'trainingPlan',
  WEEKLY_PLAN: 'weeklyPlan',
  DIET_PLAN: 'dietPlan',
  WEIGHT_RECORDS: 'weightRecords',
  AI_GENERATION_RECORDS: 'aiGenerationRecords'
};

// 训练类型常量
const EXERCISE_TYPES = {
  CARDIO: ['跑步', '有氧', '骑行', '游泳'],
  STRENGTH: ['力量', '力量训练', '重训'],
  STRETCH: ['拉伸', '柔韧性', '瑜伽'],
  CUSTOM: 'custom'
};

// 事件类型常量
const EVENT_TYPES = {
  USER_INFO_UPDATED: 'userInfoUpdated',
  TRAINING_STATS_UPDATED: 'trainingStatsUpdated',
  EXERCISE_RECORD_ADDED: 'exerciseRecordAdded',
  EXERCISE_RECORD_UPDATED: 'exerciseRecordUpdated',
  EXERCISE_RECORD_DELETED: 'exerciseRecordDeleted',
  TRAINING_PLAN_UPDATED: 'trainingPlanUpdated',
  DEVICE_INFO_UPDATED: 'deviceInfoUpdated'
};

const TimeUtils = require('../utils/timeUtils');
const { DictionaryConverter, GOAL_MAPPING, LEVEL_MAPPING } = require('../utils/dictionary');

/**
 * 获取训练类型显示名称
 * @param {string} typeId 训练类型ID
 * @returns {string} 训练类型显示名称
 */
function getTypeDisplayName(typeId) {
  const typeMap = {
    'strength': '力量训练',
    'cardio': '有氧训练',
    'flexibility': '柔韧性训练',
    'mixed': '混合训练'
  };
  return typeMap[typeId] || '其他';
}

/**
 * 数据存储类
 */
class DataService {
  constructor() {
    // 初始化缓存对象
    this.cache = {
      exerciseRecords: [],
      trainingStats: null,
      userInfo: null,
      boundDevices: [],
      trainingPlans: []
    };

    // 初始化事件监听器
    this.eventListeners = new Map();

    // 加载初始数据
    this.loadInitialData();
    
    // 添加一条模拟的运动记录
    const mockExerciseRecord = {
      id: Date.now(),
      name: '晨跑',
      date: '2024-03-20T07:30:00',
      timestamp: new Date('2024-03-20T07:30:00').getTime(),
      duration: 1800, // 30分钟
      totalDuration: 1800,
      durationFormatted: '00:30:00',
      distance: 5000, // 5公里
      totalDistance: 5000,
      displayDistance: '5.00',
      calories: 350,
      type: 'running',
      avgPace: 360, // 6分钟/公里
      avgPaceFormatted: '6\'00"',
      avgCadence: 175,
      cadenceStats: {
        avg: 175,
        max: 185,
        min: 165,
        chart: [
          {time: 0, value: 170},
          {time: 300, value: 175},
          {time: 600, value: 180},
          {time: 900, value: 185},
          {time: 1200, value: 175},
          {time: 1500, value: 170},
          {time: 1800, value: 175}
        ]
      },
      paceStats: {
        best: 330, // 5:30配速
        worst: 390, // 6:30配速
        chart: [
          {time: 0, value: 360},
          {time: 300, value: 350},
          {time: 600, value: 330},
          {time: 900, value: 340},
          {time: 1200, value: 370},
          {time: 1500, value: 380},
          {time: 1800, value: 360}
        ]
      },
      heartRateZones: {
        zone1: {name: '热身', range: '99-118', time: 180, percentage: 10},
        zone2: {name: '燃脂', range: '119-137', time: 540, percentage: 30},
        zone3: {name: '有氧', range: '138-156', time: 720, percentage: 40},
        zone4: {name: '无氧', range: '157-175', time: 270, percentage: 15},
        zone5: {name: '极限', range: '176-195', time: 90, percentage: 5}
      },
      powerData: {
        avg: 280,
        max: 320,
        min: 240,
        chart: [
          {time: 0, value: 260},
          {time: 300, value: 280},
          {time: 600, value: 300},
          {time: 900, value: 320},
          {time: 1200, value: 290},
          {time: 1500, value: 270},
          {time: 1800, value: 280}
        ]
      },
      strideData: {
        avgLength: 1.2, // 米
        maxLength: 1.4,
        minLength: 1.0,
        groundContact: {
          avg: 240, // 毫秒
          max: 260,
          min: 220
        },
        verticalOscillation: {
          avg: 8.5, // 厘米
          max: 9.5,
          min: 7.5
        }
      },
      balance: {
        leftRight: "51%/49%",
        chart: [
          {time: 0, left: 51, right: 49},
          {time: 300, left: 50, right: 50},
          {time: 600, left: 52, right: 48},
          {time: 900, left: 51, right: 49},
          {time: 1200, left: 50, right: 50},
          {time: 1500, left: 51, right: 49},
          {time: 1800, left: 51, right: 49}
        ]
      },
      elevationData: {
        gain: 45, // 总爬升(米)
        loss: 45, // 总下降(米)
        maxAltitude: 23, // 最高海拔
        minAltitude: 12, // 最低海拔
        chart: [
          {distance: 0, altitude: 15},
          {distance: 1000, altitude: 18},
          {distance: 2000, altitude: 23},
          {distance: 3000, altitude: 20},
          {distance: 4000, altitude: 15},
          {distance: 5000, altitude: 15}
        ]
      },
      trainingEffect: {
        aerobic: 3.5, // 1-5分
        anaerobic: 2.0,
        load: 125, // 训练负荷
        recovery: 24, // 建议恢复时间(小时)
        vo2max: 52 // 预估最大摄氧量
      },
      environmentData: {
        temperature: 22,
        humidity: 65,
        pressure: 1013.2, // 气压(hPa)
        uvIndex: 3,
        windSpeed: 2.5, // 米/秒
        windDirection: "东北"
      },
      trackPoints: [
        { 
          latitude: 31.229557, 
          longitude: 121.445293,
          speed: 2.5,
          timestamp: new Date('2024-03-20T07:30:00').getTime(),
          pointType: 'start'
        },
        { 
          latitude: 31.230257, 
          longitude: 121.444893,
          speed: 2.8,
          timestamp: new Date('2024-03-20T07:33:20').getTime()
        },
        { 
          latitude: 31.231157, 
          longitude: 121.444593,
          speed: 2.7,
          timestamp: new Date('2024-03-20T07:36:40').getTime()
        },
        { 
          latitude: 31.231857, 
          longitude: 121.445193,
          speed: 2.9,
          timestamp: new Date('2024-03-20T07:40:00').getTime()
        },
        { 
          latitude: 31.232157, 
          longitude: 121.446293,
          speed: 2.6,
          timestamp: new Date('2024-03-20T07:43:20').getTime()
        },
        { 
          latitude: 31.231957, 
          longitude: 121.447393,
          speed: 2.7,
          timestamp: new Date('2024-03-20T07:46:40').getTime()
        },
        { 
          latitude: 31.231257, 
          longitude: 121.447893,
          speed: 2.8,
          timestamp: new Date('2024-03-20T07:50:00').getTime()
        },
        { 
          latitude: 31.230457, 
          longitude: 121.447593,
          speed: 2.6,
          timestamp: new Date('2024-03-20T07:53:20').getTime()
        },
        { 
          latitude: 31.229857, 
          longitude: 121.446793,
          speed: 2.5,
          timestamp: new Date('2024-03-20T07:56:40').getTime()
        },
        { 
          latitude: 31.229557, 
          longitude: 121.445893,
          speed: 2.4,
          timestamp: new Date('2024-03-20T08:00:00').getTime(),
          pointType: 'end'
        }
      ],
      polyline: [{ // 添加路线
        points: [
          { latitude: 31.229557, longitude: 121.445293 },
          { latitude: 31.230257, longitude: 121.444893 },
          { latitude: 31.231157, longitude: 121.444593 },
          { latitude: 31.231857, longitude: 121.445193 },
          { latitude: 31.232157, longitude: 121.446293 },
          { latitude: 31.231957, longitude: 121.447393 },
          { latitude: 31.231257, longitude: 121.447893 },
          { latitude: 31.230457, longitude: 121.447593 },
          { latitude: 31.229857, longitude: 121.446793 },
          { latitude: 31.229557, longitude: 121.445893 }
        ],
        color: '#FF0000DD',
        width: 4,
        arrowLine: true
      }],
      markers: [
        {
          id: 0,
          latitude: 31.229557,
          longitude: 121.445293,
          iconPath: '/assets/images/start_marker.png',
          width: 32,
          height: 32,
          callout: {
            content: '中山公园南门',
            color: '#000000',
            fontSize: 14,
            borderRadius: 4,
            padding: 8,
            display: 'ALWAYS',
            textAlign: 'center'
          }
        },
        {
          id: 1,
          latitude: 31.229557,
          longitude: 121.445893,
          iconPath: '/assets/images/end_marker.png',
          width: 32,
          height: 32,
          callout: {
            content: '中山公园西门',
            color: '#000000',
            fontSize: 14,
            borderRadius: 4,
            padding: 8,
            display: 'ALWAYS',
            textAlign: 'center'
          }
        }
      ],
      weather: { // 添加天气信息
        temperature: 22,
        condition: '晴',
        humidity: 65
      },
      heartRate: { // 添加心率数据
        avg: 145,
        max: 165,
        min: 125
      },
      splits: [ // 添加每公里配速
        { distance: 1000, pace: '5:55', time: 355 },
        { distance: 2000, pace: '6:02', time: 362 },
        { distance: 3000, pace: '5:58', time: 358 },
        { distance: 4000, pace: '6:05', time: 365 },
        { distance: 5000, pace: '6:00', time: 360 }
      ]
    };
    
    // 获取现有记录
    let records = this.getExerciseRecords();
    
    // 检查是否已存在相同时间戳的记录
    const exists = records.some(record => record.timestamp === mockExerciseRecord.timestamp);
    
    // 如果不存在，则添加模拟记录
    if (!exists) {
      records.unshift(mockExerciseRecord);
      this.cache.exerciseRecords = records;
      this.safeSetStorage(STORAGE_KEYS.EXERCISE_RECORDS, records);
      
      // 更新训练统计数据
      this.updateTrainingStats(mockExerciseRecord);
    }
  }
  
  /**
   * 加载初始数据到缓存
   */
  loadInitialData() {
    try {
      this.cache.exerciseRecords = wx.getStorageSync(STORAGE_KEYS.EXERCISE_RECORDS) || [];
      this.cache.trainingStats = wx.getStorageSync(STORAGE_KEYS.TRAINING_STATS) || this.getDefaultTrainingStats();
      this.cache.userInfo = wx.getStorageSync(STORAGE_KEYS.USER_INFO) || null;
      this.cache.boundDevices = wx.getStorageSync(STORAGE_KEYS.BOUND_DEVICES) || [];
      this.cache.trainingPlans = wx.getStorageSync(STORAGE_KEYS.TRAINING_PLANS) || [];
    } catch (error) {
      console.error('加载初始数据失败:', error);
    }
  }
  
  /**
   * 获取默认训练统计数据
   */
  getDefaultTrainingStats() {
    return {
      lastTrainingDate: new Date().toISOString(),
      trainingCount: 0,
      totalDistance: 0,
      totalDuration: 0,
      weeklyCount: 0,
      weeklyDuration: 0,
      monthlyCount: 0
    };
  }
  
  /**
   * 保存运动记录
   * @param {Object} exerciseData 运动数据
   * @returns {Object} 保存的记录
   */
  saveExerciseRecord(exerciseData) {
    try {
      const recordDate = new Date(exerciseData.date || Date.now());
      
      // 确保所有数值都是有效的，并进行正确的单位转换
      const distance = parseFloat(exerciseData.distance) || 0; // 输入单位为米
      const duration = parseInt(exerciseData.duration) || 0;
      const calories = parseInt(exerciseData.calories) || 0;
      
      // 保存原始距离（米）
      const totalDistance = distance;
      
      // 计算平均配速（分钟/公里）
      let avgPace = 0;
      let avgPaceFormatted = '--\--';
      if (distance > 0 && duration > 0) {
        avgPace = (duration / 60) / (distance / 1000);
        avgPaceFormatted = TimeUtils.formatPace(avgPace);
      }

      // 计算平均步频
      const avgCadence = exerciseData.cadence || exerciseData.averageCadence || 0;
      
      // 创建新记录
      const newRecord = {
        id: Date.now().toString(),
        title: exerciseData.name || '未命名运动',
        name: exerciseData.name || '未命名运动',
        date: this.formatDateTime(recordDate),
        timestamp: recordDate.getTime(),
        duration: duration,
        totalDuration: duration,
        durationFormatted: TimeUtils.formatDuration(duration, true),
        durationText: TimeUtils.formatDuration(duration, false),
        durationMinutes: TimeUtils.formatDurationToMinutes(duration),
        totalDistance: totalDistance,
        displayDistance: (totalDistance / 1000).toFixed(2),
        displayDistanceUnit: '公里',
        calories: calories,
        type: exerciseData.type || 'running',
        avgPace: avgPace,
        avgPaceFormatted: avgPaceFormatted,
        avgCadence: avgCadence,
        
        // GPS相关数据
        trackPoints: exerciseData.locations || [],
        startLocation: exerciseData.locations?.[0] || null,
        endLocation: exerciseData.locations?.[exerciseData.locations.length - 1] || null,
        
        // 配速分段数据
        splits: exerciseData.splits || [],
        
        // 轨迹数据
        polyline: [{
          points: (exerciseData.locations || []).map(loc => ({
            latitude: loc.latitude,
            longitude: loc.longitude
          })),
          color: '#FF0000DD',
          width: 4,
          arrowLine: true
        }],
        
        // 标记点
        markers: [
          {
            id: 0,
            latitude: exerciseData.locations?.[0]?.latitude,
            longitude: exerciseData.locations?.[0]?.longitude,
            iconPath: '/assets/images/start_marker.png',
            width: 32,
            height: 32,
            callout: {
              content: '起点',
              color: '#000000',
              fontSize: 14,
              borderRadius: 4,
              padding: 8,
              display: 'ALWAYS',
              textAlign: 'center'
            }
          },
          {
            id: 1,
            latitude: exerciseData.locations?.[exerciseData.locations.length - 1]?.latitude,
            longitude: exerciseData.locations?.[exerciseData.locations.length - 1]?.longitude,
            iconPath: '/assets/images/end_marker.png',
            width: 32,
            height: 32,
            callout: {
              content: '终点',
              color: '#000000',
              fontSize: 14,
              borderRadius: 4,
              padding: 8,
              display: 'ALWAYS',
              textAlign: 'center'
            }
          }
        ],
        
        // 天气信息
        weather: exerciseData.weather || {
          temperature: null,
          condition: null,
          humidity: null
        },
        
        // 心率数据
        heartRate: exerciseData.heartRate || {
          avg: null,
          max: null,
          min: null
        },
        
        // 调试数据
        debugData: exerciseData.debugData || {}
      };
      
      // 获取现有记录
      const records = this.getExerciseRecords();
      
      // 检查是否已存在相同时间戳的记录
      const exists = records.some(record => record.timestamp === newRecord.timestamp);
      
      if (!exists) {
        records.unshift(newRecord);
        this.cache.exerciseRecords = records;
        this.safeSetStorage(STORAGE_KEYS.EXERCISE_RECORDS, records);
        
        // 更新训练统计数据
        this.updateTrainingStats(newRecord);
      }
      
      return newRecord;
    } catch (error) {
      console.error('保存运动记录失败:', error);
      return null;
    }
  }
  
  // 查找最佳配速
  findBestPace(kmPaces) {
    if (!kmPaces || kmPaces.length === 0) return '--\--';
    const bestPace = Math.min(...kmPaces.map(p => p.pace));
    return TimeUtils.formatPace(bestPace);
  }

  // 格式化公里配速数据
  formatKmPaces(kmPaces) {
    if (!kmPaces || kmPaces.length === 0) return [];
    
    const paces = kmPaces.map(p => parseFloat(p.pace));
    const maxPace = Math.max(...paces);
    const minPace = Math.min(...paces);
    const range = maxPace - minPace;
    
    return kmPaces.map(p => ({
      pace: TimeUtils.formatPace(p.pace),
      isExcellent: p.pace <= minPace + (range * 0.3),
      percentage: Math.round(((maxPace - p.pace) / range) * 100)
    }));
  }
  
  /**
   * 更新设备同步时间
   * @param {string} deviceId 设备ID
   */
  updateDeviceSyncTime(deviceId) {
    try {
      const devices = this.getBoundDevices();
      const deviceIndex = devices.findIndex(d => d.id === deviceId);
      
      if (deviceIndex >= 0) {
        // 格式化日期时间函数
        const formatDateTime = (date, format = 'YYYY/MM/DD HH:mm:ss') => {
          const d = date;
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
        };
        
        // 更新设备最后同步时间
        devices[deviceIndex].lastSync = formatDateTime(new Date(), 'YYYY/MM/DD HH:mm:ss');
        this.cache.boundDevices = devices;
        this.safeSetStorage(STORAGE_KEYS.BOUND_DEVICES, devices);
      }
    } catch (error) {
      console.error('更新设备同步时间失败:', error);
    }
  }
  
  /**
   * 更新训练统计数据
   * @param {Object} exerciseData 运动数据
   */
  updateTrainingStats(exerciseData) {
    try {
      // 获取现有统计数据
      const stats = this.getTrainingStats();
      
      // 格式化日期函数
      const formatDate = (date, format = 'YYYY/MM/DD') => {
        const d = date;
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const day = d.getDate();
        
        const pad = (num) => (num < 10 ? '0' + num : num);
        
        return format
          .replace('YYYY', year)
          .replace('MM', pad(month))
          .replace('DD', pad(day));
      };
      
      // 格式化日期时间函数
      const formatDateTime = (date, format = 'YYYY/MM/DD HH:mm:ss') => {
        const d = date;
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
      };
      
      // 更新统计数据
      stats.lastTrainingDate = formatDateTime(new Date(), 'YYYY/MM/DD HH:mm:ss');
      stats.trainingCount += 1;
      stats.totalDistance += parseFloat(exerciseData.distance) || 0;
      stats.totalDuration += parseInt(exerciseData.duration) || 0;
      
      // 更新周统计和月统计
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1)); // 周一为一周开始
      
      // 如果没有周开始日期或者周开始日期不是本周，则重置周统计
      if (!stats.weekStartDate || new Date(stats.weekStartDate) < weekStart) {
        stats.weekStartDate = formatDate(weekStart);
        stats.weeklyCount = 0;
        stats.weeklyDuration = 0;
        stats.weeklyDistance = 0;
      }
      
      // 更新周统计
      stats.weeklyCount += 1;
      stats.weeklyDuration += parseInt(exerciseData.duration) || 0;
      stats.weeklyDistance += parseFloat(exerciseData.distance) || 0;
      
      // 如果没有月开始日期或者月开始日期不是本月，则重置月统计
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      if (!stats.monthStartDate || new Date(stats.monthStartDate) < monthStart) {
        stats.monthStartDate = formatDate(monthStart);
        stats.monthlyCount = 0;
        stats.monthlyDuration = 0;
        stats.monthlyDistance = 0;
      }
      
      // 更新月统计
      stats.monthlyCount += 1;
      stats.monthlyDuration += parseInt(exerciseData.duration) || 0;
      stats.monthlyDistance += parseFloat(exerciseData.distance) || 0;
      
      // 更新缓存和存储
      this.cache.trainingStats = stats;
      this.safeSetStorage(STORAGE_KEYS.TRAINING_STATS, stats);
      
      console.log('运动统计数据已更新:', stats);
    } catch (error) {
      console.error('更新训练统计数据失败:', error);
    }
  }
  
  /**
   * 获取所有运动记录
   * @returns {Array} 运动记录数组
   */
  getExerciseRecords() {
    if (this.cache.exerciseRecords) {
      return this.cache.exerciseRecords;
    }
    
    try {
      const records = wx.getStorageSync(STORAGE_KEYS.EXERCISE_RECORDS) || [];
      this.cache.exerciseRecords = records;
      return records;
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
  getRecentExerciseRecords(limit = 5) {
    const records = this.getExerciseRecords();
    return records.slice(0, limit);
  }
  
  /**
   * 获取训练统计数据
   * @returns {Object} 训练统计数据
   */
  getTrainingStats() {
    if (this.cache.trainingStats) {
      return this.cache.trainingStats;
    }
    
    try {
      const stats = wx.getStorageSync(STORAGE_KEYS.TRAINING_STATS) || this.getDefaultTrainingStats();
      this.cache.trainingStats = stats;
      return stats;
    } catch (error) {
      console.error('获取训练统计数据失败:', error);
      return this.getDefaultTrainingStats();
    }
  }
  
  /**
   * 将目标从英文转换为中文
   * @param {string} goal - 英文目标
   * @returns {string} 中文目标
   */
  static goalToCn(goal) {
    return DictionaryConverter.convertGoal(goal, 'storage', 'display');
  }

  /**
   * 将目标从中文转换为英文
   * @param {string} goal - 中文目标
   * @returns {string} 英文目标
   */
  static goalToEn(goal) {
    return DictionaryConverter.convertGoal(goal, 'display', 'storage');
  }

  /**
   * 将训练水平从英文转换为中文
   * @param {string} level - 英文训练水平
   * @returns {string} 中文训练水平
   */
  static levelToCn(level) {
    return DictionaryConverter.convertLevel(level, 'storage', 'display');
  }

  /**
   * 将训练水平从中文转换为英文
   * @param {string} level - 中文训练水平
   * @returns {string} 英文训练水平
   */
  static levelToEn(level) {
    return DictionaryConverter.convertLevel(level, 'display', 'storage');
  }

  /**
   * 获取用户信息（用于提示词）
   * @returns {Object} 用户信息
   */
  getUserInfoForPrompt() {
    const userInfo = this.getUserInfo();
    if (!userInfo) return null;

    return {
      ...userInfo,
      goal: DictionaryConverter.convertGoal(userInfo.goal, 'storage', 'prompt'),
      level: DictionaryConverter.convertLevel(userInfo.level, 'storage', 'prompt')
    };
  }

  /**
   * 保存用户信息（转换为英文存储）
   * @param {Object} userInfo 用户信息
   * @returns {boolean} 是否保存成功
   */
  saveUserInfo(userInfo) {
    try {
      // 转换目标和训练水平为存储格式
      const enUserInfo = {
        ...userInfo,
        goal: DictionaryConverter.convertGoal(userInfo.goal, 'display', 'storage'),
        level: DictionaryConverter.convertLevel(userInfo.level, 'display', 'storage')
      };
      
      this.cache.userInfo = enUserInfo;
      this.safeSetStorage(STORAGE_KEYS.USER_INFO, enUserInfo);
      // 触发用户信息更新事件
      this.triggerEvent(EVENT_TYPES.USER_INFO_UPDATED, enUserInfo);
      return true;
    } catch (error) {
      console.error('保存用户信息失败:', error);
      return false;
    }
  }
  
  /**
   * 获取用户信息（转换为中文显示）
   * @returns {Object} 用户信息
   */
  getUserInfo() {
    try {
      const userInfo = this.cache.userInfo || this.safeGetStorage(STORAGE_KEYS.USER_INFO);
      if (!userInfo) return null;

      // 转换目标和训练水平为显示格式
      return {
        ...userInfo,
        goal: DictionaryConverter.convertGoal(userInfo.goal, 'storage', 'display'),
        level: DictionaryConverter.convertLevel(userInfo.level, 'storage', 'display')
      };
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }

  /**
   * 保存设备信息
   * @param {Object} deviceInfo 设备信息
   */
  saveDeviceInfo(deviceInfo) {
    try {
      const devices = this.getBoundDevices();
      const existingIndex = devices.findIndex(d => d.deviceId === deviceInfo.deviceId);
      
      if (existingIndex >= 0) {
        devices[existingIndex] = deviceInfo;
      } else {
        devices.push(deviceInfo);
      }
      
      this.cache.boundDevices = devices;
      this.safeSetStorage(STORAGE_KEYS.BOUND_DEVICES, devices);
      return deviceInfo;
    } catch (error) {
      console.error('保存设备信息失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取绑定的设备列表
   * @returns {Array} 设备列表
   */
  getBoundDevices() {
    try {
      const devices = wx.getStorageSync(STORAGE_KEYS.BOUND_DEVICES) || [];
      return devices;
    } catch (error) {
      console.error('获取绑定设备列表失败:', error);
      return [];
    }
  }
  
  /**
   * 保存训练计划
   * @param {Object} plan 训练计划数据
   */
  saveTrainingPlan(plan) {
    try {
      // 1. 保存训练计划
      const plans = this.getTrainingPlans() || [];
      const planIndex = plans.findIndex(p => p.id === plan.id);
      
      if (planIndex >= 0) {
        plans[planIndex] = plan;
      } else {
        plans.push(plan);
      }
      
      this.safeSetStorage(STORAGE_KEYS.TRAINING_PLANS, plans);
      console.log('保存的训练计划列表:', plans);

      // 2. 获取或创建周计划
      let weeklyPlan = this.getWeeklyPlan();
      if (!weeklyPlan) {
        weeklyPlan = this.createDefaultWeeklyPlan();
      }
      
      // 3. 更新周计划中的训练
      // 首先，清除该计划的所有现有训练
      weeklyPlan.days.forEach(day => {
        if (day.plans) {
          day.plans.forEach(timePlan => {
            if (timePlan.exercises) {
              timePlan.exercises = timePlan.exercises.filter(e => e.planId !== plan.id);
            }
          });
          // 清理空的时间段
          day.plans = day.plans.filter(timePlan => 
            timePlan.exercises && timePlan.exercises.length > 0
          );
        }
      });

      if (plan.exercises) {
        // 然后，添加新的训练
        plan.exercises.forEach(exercise => {
          if (exercise.scheduledDay) {
            const dayPlan = weeklyPlan.days.find(d => d.day === exercise.scheduledDay);
            if (dayPlan) {
              // 确保plans数组存在
              if (!dayPlan.plans) {
                dayPlan.plans = [];
              }
              
              // 查找或创建对应时间段的计划
              let timePlan = dayPlan.plans.find(p => p.timeSlot === exercise.timeSlot);
              if (!timePlan) {
                timePlan = {
                  timeSlot: exercise.timeSlot,
                  exercises: [],
                  completed: false
                };
                dayPlan.plans.push(timePlan);
              }
  
              // 确保exercises数组存在
              if (!timePlan.exercises) {
                timePlan.exercises = [];
              }
  
              // 添加训练，只保留必要的信息
              const exerciseExists = timePlan.exercises.some(e => 
                e.id === exercise.id && e.planId === plan.id
              );
              
              if (!exerciseExists) {
                timePlan.exercises.push({
                  ...exercise,
                  planId: plan.id,
                  planName: plan.name
                });
              }
            }
          }
        });
      } else {
        wx.showToast({
          title: '计划格式错误，请检查',
          icon: 'error'
        })
        return false
      }

      
      // 4. 保存更新后的周计划
      this.saveWeeklyPlan(weeklyPlan);
      console.log('更新后的周计划:', weeklyPlan);

      return plan;
    } catch (error) {
      console.error('保存训练计划失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建默认周计划
   * @returns {Object} 默认的周计划
   */
  createDefaultWeeklyPlan() {
    try {
      const utils = require('../utils/utils');
      const currentWeek = utils.getCurrentWeek();
      
      // 创建新的周计划
      const weeklyPlan = {
        week: currentWeek,
        weekRange: utils.getCurrentWeekRange(),
        days: [
          { day: '周一', plans: [] },
          { day: '周二', plans: [] },
          { day: '周三', plans: [] },
          { day: '周四', plans: [] },
          { day: '周五', plans: [] },
          { day: '周六', plans: [] },
          { day: '周日', plans: [] }
        ]
      };

      // 获取所有自定义计划并整合
      const trainingPlans = this.getTrainingPlans() || [];
      trainingPlans.forEach(plan => {
        if (plan && plan.exercises) {
          plan.exercises.forEach(exercise => {
            if (exercise.scheduledDay) {
              const dayPlan = weeklyPlan.days.find(d => d.day === exercise.scheduledDay);
              if (dayPlan) {
                // 如果没有对应的时间段计划，创建一个
                let timePlan = dayPlan.plans.find(p => p.timeSlot === (exercise.timeSlot || '上午'));
                if (!timePlan) {
                  timePlan = {
                    timeSlot: exercise.timeSlot || '上午',
                    exercises: [],
                    completed: false
                  };
                  dayPlan.plans.push(timePlan);
                }
                
                // 添加训练到时间段计划中
                timePlan.exercises.push({
                  ...exercise,
                  planId: plan.id,
                  planName: plan.name,
                  source: 'custom',
                  type: exercise.type || '自定义训练'
                });
              }
            }
          });
        }
      });

      // 保存周计划
      this.safeSetStorage(STORAGE_KEYS.WEEKLY_PLAN, weeklyPlan);
      
      return weeklyPlan;
    } catch (error) {
      console.error('创建默认周计划失败:', error);
      return null;
    }
  }
  
  /**
   * 获取训练计划列表
   * @returns {Array} 训练计划列表
   */
  getTrainingPlans() {
    try {
      const plans = this.safeGetStorage(STORAGE_KEYS.TRAINING_PLANS) || [];
      return plans;
    } catch (error) {
      console.error('获取训练计划失败:', error);
      return [];
    }
  }
  
  /**
   * 清除所有数据（慎用）
   */
  clearAllData() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        wx.removeStorageSync(key);
      });
      
      // 清除API密钥和选中的模型
      wx.removeStorageSync('ai_api_keys');
      wx.removeStorageSync('selected_ai_model');
      
      // 重置缓存
      this.cache = {
        exerciseRecords: [],
        trainingStats: this.getDefaultTrainingStats(),
        userInfo: null,
        boundDevices: [],
        trainingPlans: [],
        aiGenerationRecords: []
      };
      
      console.log('所有数据已清除');
    } catch (error) {
      console.error('清除数据失败:', error);
      throw error;
    }
  }
  
  /**
   * 保存周计划
   * @param {Object} weeklyPlan 周计划数据
   * @returns {Object} 保存后的周计划
   */
  saveWeeklyPlan(weeklyPlan) {
    try {
      // 确保周计划有有效的周数
      if (!weeklyPlan.week) {
        const utils = require('../utils/utils');
        weeklyPlan.week = utils.getCurrentWeek();
        weeklyPlan.weekRange = utils.getCurrentWeekRange();
      }
      
      // 保存到缓存
      this.cache.weeklyPlan = weeklyPlan;
      
      // 保存到存储
      const success = this.safeSetStorage(STORAGE_KEYS.WEEKLY_PLAN, weeklyPlan);
      
      if (!success) {
        console.error('保存周计划失败: 存储操作失败');
      }
      
      return weeklyPlan;
    } catch (error) {
      console.error('保存周计划失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取周计划
   * @returns {Object} 周计划数据
   */
  getWeeklyPlan() {
    try {
      const weeklyPlan = wx.getStorageSync(STORAGE_KEYS.WEEKLY_PLAN);
      if (!weeklyPlan) {
        // 如果没有周计划，创建并返回默认的周计划
        return this.createDefaultWeeklyPlan();
      }
      return weeklyPlan;
    } catch (error) {
      console.error('获取周计划失败:', error);
      return this.createDefaultWeeklyPlan();
    }
  }

  /**
   * 获取当前周数
   */
  getCurrentWeek() {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now - start;
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    return Math.ceil(diff / oneWeek);
  }

  /**
   * 获取本周开始日期
   */
  getWeekStartDate() {
    const now = new Date();
    const day = now.getDay() || 7;
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff)).toISOString().split('T')[0];
  }

  /**
   * 获取本周结束日期
   */
  getWeekEndDate() {
    const now = new Date();
    const day = now.getDay() || 7;
    const diff = now.getDate() - day + (day === 0 ? 0 : 7);
    return new Date(now.setDate(diff)).toISOString().split('T')[0];
  }
  
  /**
   * 保存活动训练计划
   * @param {Object} plan 训练计划
   */
  saveActiveTrainingPlan(plan) {
    try {
      this.safeSetStorage(STORAGE_KEYS.TRAINING_PLAN, plan);
      return plan;
    } catch (error) {
      console.error('保存活动训练计划失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取活动训练计划
   * @returns {Object|null} 活动训练计划
   */
  getActiveTrainingPlan() {
    try {
      return wx.getStorageSync(STORAGE_KEYS.TRAINING_PLAN) || null;
    } catch (error) {
      console.error('获取活动训练计划失败:', error);
      return null;
    }
  }
  
  /**
   * 更新训练计划列表
   * @param {Array} plans 训练计划列表
   */
  updateTrainingPlans(plans) {
    try {
      this.cache.trainingPlans = plans;
      this.safeSetStorage(STORAGE_KEYS.TRAINING_PLANS, plans);
    } catch (error) {
      console.error('更新训练计划列表失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新训练完成状态
   */
  updateExerciseCompletion(exerciseId, planId, completed) {
    try {
      let updated = false;

      // 1. 更新训练计划中的状态
      const plans = this.getTrainingPlans();
      const plan = plans.find(p => p.id === planId);
      if (plan) {
        const exercise = plan.exercises.find(e => e.id === exerciseId);
        if (exercise) {
          exercise.completed = completed;
          this.saveTrainingPlan(plan);
          updated = true;
        }
      }

      // 2. 更新周计划中的状态
      const weeklyPlan = this.getWeeklyPlan();
      if (weeklyPlan) {
        weeklyPlan.days.forEach(day => {
          const exercise = day.exercises.find(e => 
            e.id === exerciseId && e.planId === planId
          );
          if (exercise) {
            exercise.completed = completed;
            updated = true;
          }
        });
        if (updated) {
          this.saveWeeklyPlan(weeklyPlan);
        }
      }

      return updated;
    } catch (error) {
      console.error('更新训练完成状态失败:', error);
      throw error;
    }
  }
  
  /**
   * 安全存储方法，确保键名有效
   * @param {string} key 存储键名
   * @param {any} data 要存储的数据
   */
  safeSetStorage(key, data) {
    try {
      // 检查是否为用户相关数据
      if (key === 'exerciseRecords' || key === 'trainingStats') {
        const userInfo = wx.getStorageSync('userInfo');
        if (!userInfo) {
          console.warn(`存储数据失败 [${key}]: 用户未登录`);
          return false;
        }
      }
      
      wx.setStorageSync(key, data);
      return true;
    } catch (error) {
      console.error(`存储数据失败 [${key}]:`, error);
      return false;
    }
  }
  
  /**
   * 保存饮食计划
   * @param {Object} dietPlan 饮食计划数据
   * @returns {Object} 保存后的饮食计划
   */
  saveDietPlan(dietPlan) {
    try {
      const success = this.safeSetStorage(STORAGE_KEYS.DIET_PLAN, dietPlan);
      if (!success) {
        console.error('保存饮食计划失败: 存储操作失败');
      }
      return dietPlan;
    } catch (error) {
      console.error('保存饮食计划失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取饮食计划
   * @returns {Object|null} 饮食计划
   */
  getDietPlan() {
    try {
      return wx.getStorageSync(STORAGE_KEYS.DIET_PLAN) || null;
    } catch (error) {
      console.error('获取饮食计划失败:', error);
      return null;
    }
  }

  /**
   * 格式化日期
   * @param {Date} date 日期对象
   * @param {string} format 格式化模板
   * @returns {string} 格式化后的日期字符串
   */
  formatDate(date, format = 'YYYY/MM/DD') {
    if (!date) return '';
    
    const d = date;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    
    const pad = (num) => (num < 10 ? '0' + num : num);
    
    return format
      .replace('YYYY', year)
      .replace('MM', pad(month))
      .replace('DD', pad(day));
  }

  /**
   * 格式化日期时间
   * @param {Date} date 日期对象
   * @param {string} format 格式化模板
   * @returns {string} 格式化后的日期时间字符串
   */
  formatDateTime(date, format = 'YYYY/MM/DD HH:mm:ss') {
    if (!date) return '';
    
    const d = date;
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const seconds = d.getSeconds();
    
    const pad = (num) => (num < 10 ? '0' + num : num);

    // 如果是完整的日期时间格式，使用斜杠分隔的格式
    if (format.includes('HH:mm:ss')) {
      return `${year}/${pad(month)}/${pad(day)} ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    
    // 如果只是日期格式，使用斜杠分隔
    return `${year}/${pad(month)}/${pad(day)}`;
  }

  /**
   * 解析日期字符串为 Date 对象
   * @param {string} dateStr 日期字符串
   * @returns {Date} 日期对象
   */
  parseDate(dateStr) {
    if (!dateStr) return null;
    
    // 尝试不同的日期格式
    const formats = [
      // ISO 格式
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/,
      // 带时区的 ISO 格式
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})[+-]\d{2}:\d{2}$/,
      // 标准日期格式
      /^(\d{4})-(\d{2})-(\d{2})$/,
      // 斜杠分隔的日期格式
      /^(\d{4})\/(\d{2})\/(\d{2})$/,
      // 带时间的格式
      /^(\d{4})[/-](\d{2})[/-](\d{2}) (\d{2}):(\d{2}):(\d{2})$/
    ];

    // 尝试匹配每种格式
    for (const format of formats) {
      if (format.test(dateStr)) {
        // 对于非 ISO 格式的日期时间字符串，转换为 ISO 格式
        if (dateStr.includes(' ')) {
          dateStr = dateStr.replace(' ', 'T');
        }
        // 使用 ISO 格式创建日期对象
        return new Date(dateStr);
      }
    }

    // 如果所有格式都不匹配，返回 null
    console.error('无效的日期格式:', dateStr);
    return null;
  }

  /**
   * 安全获取存储方法，确保键名有效
   * @param {string} key 存储键名
   * @returns {any|null} 获取的数据
   */
  safeGetStorage(key) {
    if (!key) {
      console.error('获取键名无效:', key);
      return null;
    }
    
    try {
      return wx.getStorageSync(key);
    } catch (error) {
      console.error(`获取数据失败 [${key}]:`, error);
      return null;
    }
  }

  /**
   * 更新运动记录列表
   * @param {Array} records 新的记录列表
   */
  updateExerciseRecords(records) {
    try {
      this.cache.exerciseRecords = records;
      this.safeSetStorage(STORAGE_KEYS.EXERCISE_RECORDS, records);
      
      // 同时更新训练统计数据
      this.updateTrainingStats();
    } catch (error) {
      console.error('更新运动记录失败:', error);
      throw error;
    }
  }

  /**
   * 添加事件监听器
   * @param {string} eventType 事件类型
   * @param {Function} callback 回调函数
   */
  addEventListener(eventType, callback) {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType).add(callback);
  }

  /**
   * 移除事件监听器
   * @param {string} eventType 事件类型
   * @param {Function} callback 回调函数
   */
  removeEventListener(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).delete(callback);
    }
  }

  /**
   * 触发事件
   * @param {string} eventType 事件类型
   * @param {*} data 事件数据
   */
  triggerEvent(eventType, data) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${eventType}:`, error);
        }
      });
    }
  }

  /**
   * 保存体重记录
   * @param {Object} weightRecord 体重记录数据
   */
  saveWeightRecord(weightRecord) {
    try {
      const records = this.getWeightRecords() || [];
      const now = new Date();
      
      // 创建新记录
      const newRecord = {
        id: Date.now().toString(),
        weight: parseFloat(weightRecord.weight),
        date: this.formatDateTime(now),
        timestamp: now.getTime(),
        note: weightRecord.note || '',
        bodyFat: weightRecord.bodyFat ? parseFloat(weightRecord.bodyFat) : null,
        bmi: this.calculateBMI(weightRecord.weight)
      };

      // 添加到记录列表
      records.unshift(newRecord);
      
      // 保存记录
      this.safeSetStorage(STORAGE_KEYS.WEIGHT_RECORDS, records);
      
      return newRecord;
    } catch (error) {
      console.error('保存体重记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取体重记录列表
   * @returns {Array} 体重记录列表
   */
  getWeightRecords() {
    try {
      return this.safeGetStorage(STORAGE_KEYS.WEIGHT_RECORDS) || [];
    } catch (error) {
      console.error('获取体重记录失败:', error);
      return [];
    }
  }

  /**
   * 删除体重记录
   * @param {string} recordId 记录ID
   */
  deleteWeightRecord(recordId) {
    try {
      const records = this.getWeightRecords();
      const newRecords = records.filter(record => record.id !== recordId);
      this.safeSetStorage(STORAGE_KEYS.WEIGHT_RECORDS, newRecords);
    } catch (error) {
      console.error('删除体重记录失败:', error);
      throw error;
    }
  }

  /**
   * 计算BMI
   * @param {number} weight 体重(kg)
   * @returns {number} BMI值
   */
  calculateBMI(weight) {
    const userInfo = this.getUserInfo();
    if (!userInfo || !userInfo.height) return null;
    
    const height = userInfo.height / 100; // 转换为米
    return parseFloat((weight / (height * height)).toFixed(1));
  }

  /**
   * 获取体重统计数据
   * @returns {Object} 统计数据
   */
  getWeightStats() {
    try {
      const records = this.getWeightRecords();
      if (!records || records.length === 0) {
        return {
          currentWeight: 0,
          startWeight: 0,
          weightChange: 0,
          trend: 'none'
        };
      }

      const currentWeight = records[0].weight;
      const startWeight = records[records.length - 1].weight;
      const weightChange = parseFloat((currentWeight - startWeight).toFixed(1));
      
      return {
        currentWeight,
        startWeight,
        weightChange,
        trend: weightChange > 0 ? 'up' : weightChange < 0 ? 'down' : 'stable'
      };
    } catch (error) {
      console.error('获取体重统计失败:', error);
      return null;
    }
  }

  /**
   * 根据出生日期计算年龄
   * @param {string|Date} birthDate 出生日期
   * @returns {number} 年龄
   */
  calculateAge(birthDate) {
    if (!birthDate) return null;
    
    const birthDateObj = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
    
    // 检查日期是否有效
    if (isNaN(birthDateObj.getTime())) {
      console.error('无效的出生日期:', birthDate);
      return null;
    }
    
    const today = new Date();
    let age = today.getFullYear() - birthDateObj.getFullYear();
    const monthDiff = today.getMonth() - birthDateObj.getMonth();
    
    // 如果当前月份小于出生月份，或者当前月份等于出生月份但当前日期小于出生日期，则年龄减1
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * 保存AI生成记录
   * @param {Object} generationData 生成数据
   * @returns {Object} 保存的记录
   */
  saveAIGenerationRecord(generationData) {
    try {
      // 创建新记录
      const newRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        model: generationData.model || '',
        prompt: generationData.prompt || '',
        response: generationData.response || '',
        type: generationData.type || 'training', // 可以是 'training', 'diet' 等
        feedback: generationData.feedback || null
      };
      
      // 获取现有记录
      const records = this.safeGetStorage(STORAGE_KEYS.AI_GENERATION_RECORDS) || [];
      
      // 添加新记录到开头
      records.unshift(newRecord);
      
      // 保存回存储
      this.safeSetStorage(STORAGE_KEYS.AI_GENERATION_RECORDS, records);
      
      console.log('AI生成记录已保存:', newRecord);
      return newRecord;
    } catch (error) {
      console.error('保存AI生成记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取AI生成记录
   * @param {number} limit 记录数量限制，默认返回所有记录
   * @returns {Array} AI生成记录数组
   */
  getAIGenerationRecords(limit = null) {
    try {
      const records = this.safeGetStorage(STORAGE_KEYS.AI_GENERATION_RECORDS) || [];
      return limit ? records.slice(0, limit) : records;
    } catch (error) {
      console.error('获取AI生成记录失败:', error);
      return [];
    }
  }

  /**
   * 删除AI生成记录
   * @param {number} id 记录ID
   * @returns {boolean} 是否删除成功
   */
  deleteAIGenerationRecord(id) {
    try {
      const records = this.getAIGenerationRecords();
      const index = records.findIndex(record => record.id === id);
      
      if (index === -1) {
        return false;
      }
      
      // 从数组中删除记录
      records.splice(index, 1);
      
      // 保存回存储
      this.safeSetStorage(STORAGE_KEYS.AI_GENERATION_RECORDS, records);
      
      return true;
    } catch (error) {
      console.error('删除AI生成记录失败:', error);
      return false;
    }
  }
}

// 创建单例实例
const dataService = new DataService();

// 导出
module.exports = {
  dataService,
  STORAGE_KEYS,
  EXERCISE_TYPES,
  EVENT_TYPES,
  GOAL_MAPPING,
  LEVEL_MAPPING,
  goalToEn: DataService.goalToEn,
  goalToCn: DataService.goalToCn,
  levelToEn: DataService.levelToEn,
  levelToCn: DataService.levelToCn
};