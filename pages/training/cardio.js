const app = getApp();
const { dataService } = require('../../services/dataService');
const utils = require('../../utils/utils');
// 卡尔曼滤波器类 - 增强版
class KalmanFilter {
  constructor(q = 0.1, r = 1, p = 1, x = 0, dim_z = 1, dim_x = 2) {
    this.q = q; // 过程噪声
    this.r = r; // 测量噪声
    this.p = Array(dim_x).fill().map(() => Array(dim_x).fill(0)); // 协方差矩阵
    this.x = Array(dim_x).fill(0); // 状态向量 [位置, 速度]
    this.F = Array(dim_x).fill().map(() => Array(dim_x).fill(0)); // 状态转移矩阵
    this.H = Array(dim_z).fill().map(() => Array(dim_x).fill(0)); // 观测矩阵
    
    // 初始化状态转移矩阵 (位置 + 速度模型)
    for (let i = 0; i < dim_x; i++) {
      this.F[i][i] = 1;
      if (i + 1 < dim_x) {
        this.F[i][i+1] = 1; // 假设时间步长为1
      }
    }
    
    // 初始化观测矩阵
    this.H[0][0] = 1; // 只观测位置
    
    // 初始化协方差矩阵
    for (let i = 0; i < dim_x; i++) {
      this.p[i][i] = p;
    }
  }

  // 矩阵乘法
  matrixMultiply(a, b) {
    const aRows = a.length;
    const aCols = a[0].length;
    const bRows = b.length;
    const bCols = b[0].length;
    
    if (aCols !== bRows) {
      throw new Error('矩阵维度不匹配');
    }
    
    const result = Array(aRows).fill().map(() => Array(bCols).fill(0));
    
    for (let i = 0; i < aRows; i++) {
      for (let j = 0; j < bCols; j++) {
        for (let k = 0; k < aCols; k++) {
          result[i][j] += a[i][k] * b[k][j];
        }
      }
    }
    
    return result;
  }
  
  // 矩阵转置
  transpose(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = Array(cols).fill().map(() => Array(rows).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[j][i] = matrix[i][j];
      }
    }
    
    return result;
  }
  
  // 矩阵加法
  matrixAdd(a, b) {
    const rows = a.length;
    const cols = a[0].length;
    const result = Array(rows).fill().map(() => Array(cols).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[i][j] = a[i][j] + b[i][j];
      }
    }
    
    return result;
  }
  
  // 矩阵减法
  matrixSubtract(a, b) {
    const rows = a.length;
    const cols = a[0].length;
    const result = Array(rows).fill().map(() => Array(cols).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[i][j] = a[i][j] - b[i][j];
      }
    }
    
    return result;
  }
  
  // 矩阵标量乘法
  scalarMultiply(matrix, scalar) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = Array(rows).fill().map(() => Array(cols).fill(0));
    
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        result[i][j] = matrix[i][j] * scalar;
      }
    }
    
    return result;
  }

  // 更新滤波器
  update(measurement, dt = 1) {
    // 更新状态转移矩阵，考虑时间步长
    this.F[0][1] = dt;
    
    // 预测步骤
    // x = F * x
    const predicted_x = this.matrixMultiply(this.F, [[this.x[0]], [this.x[1]]]);
    
    // P = F * P * F^T + Q
    const Q = [[this.q * dt * dt / 4, this.q * dt / 2], [this.q * dt / 2, this.q]]; // 过程噪声协方差
    const F_P = this.matrixMultiply(this.F, this.p);
    const F_P_FT = this.matrixMultiply(F_P, this.transpose(this.F));
    const predicted_p = this.matrixAdd(F_P_FT, Q);
    
    // 更新步骤
    // y = z - H * x
    const z = [[measurement]];
    const Hx = this.matrixMultiply(this.H, predicted_x);
    const y = this.matrixSubtract(z, Hx);
    
    // S = H * P * H^T + R
    const H_P = this.matrixMultiply(this.H, predicted_p);
    const H_P_HT = this.matrixMultiply(H_P, this.transpose(this.H));
    const R = [[this.r]];
    const S = this.matrixAdd(H_P_HT, R);
    
    // K = P * H^T * S^-1
    const P_HT = this.matrixMultiply(predicted_p, this.transpose(this.H));
    const S_inv = [[1 / S[0][0]]]; // 简化的逆矩阵计算，因为S是1x1矩阵
    const K = this.matrixMultiply(P_HT, S_inv);
    
    // x = x + K * y
    const K_y = this.matrixMultiply(K, y);
    const new_x = this.matrixAdd(predicted_x, K_y);
    
    // P = (I - K * H) * P
    const I = [[1, 0], [0, 1]];
    const K_H = this.matrixMultiply(K, this.H);
    const I_KH = this.matrixSubtract(I, K_H);
    const new_p = this.matrixMultiply(I_KH, predicted_p);
    
    // 更新状态和协方差
    this.x[0] = new_x[0][0];
    this.x[1] = new_x[1][0];
    this.p = new_p;
    
    return this.x[0]; // 返回过滤后的位置
  }

  // 获取当前速度估计
  getVelocity() {
    return this.x[1];
  }

  reset() {
    this.x = [0, 0];
    this.p = [[1, 0], [0, 1]];
  }
}

// 改进的GPS信号质量检查
const checkGPSAccuracy = (location) => {
  // 放宽精度要求，从100改为200
  if (!location.horizontalAccuracy || location.horizontalAccuracy > 200) {
    return {
      isAccurate: false,
      reason: 'poor_accuracy',
      accuracy: location.horizontalAccuracy || 0
    };
  }
  
  // 放宽速度限制，从15改为30
  if (location.speed !== undefined && (location.speed < 0 || location.speed > 30)) {
    return {
      isAccurate: false,
      reason: 'unreasonable_speed',
      speed: location.speed
    };
  }
  
  // 检查坐标的有效性
  if (!location.latitude || !location.longitude ||
      Math.abs(location.latitude) < 0.000001 || Math.abs(location.longitude) < 0.000001) {
    return {
      isAccurate: false,
      reason: 'invalid_coordinates',
      coordinates: [location.latitude, location.longitude]
    };
  }
  
  // 调整GPS信号质量评级标准
  let signalQuality = 'moderate';
  if (location.horizontalAccuracy <= 20) {
    signalQuality = 'good';
  } else if (location.horizontalAccuracy > 100) {
    signalQuality = 'poor';
  }
  
  return {
    isAccurate: true,
    accuracy: location.horizontalAccuracy || 0,
    signalQuality: signalQuality
  };
};

// 改进的Haversine距离计算函数
const calculateHaversineDistance = (lat1, lon1, lat2, lon2, timeDiff) => {
  // 检查输入有效性
  if (!lat1 || !lon1 || !lat2 || !lon2) {
    return 0;
  }
  
  // 检查坐标是否相同或非常接近
  if (Math.abs(lat1 - lat2) < 0.000005 && Math.abs(lon1 - lon2) < 0.000005) {
    return 0;
  }
  
  const R = 6371000; // 地球半径(米)
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  // 放宽距离限制，从50改为100，最大距离从100改为500
  const maxAllowedDistance = timeDiff ? Math.min(100 * (timeDiff / 1000), 500) : 100;
  
  if (distance > maxAllowedDistance) {
    console.warn('距离超出合理范围:', {
      distance,
      maxAllowedDistance,
      timeDiff,
      coordinates: [[lat1, lon1], [lat2, lon2]]
    });
    return maxAllowedDistance;
  }
  
  return distance;
};

// 有氧训练页面（跑步、骑行等）
Page({
  data: {
    exercise: null,
    timer: null,
    // 添加卡尔曼滤波器实例
    filters: {
      latFilter: null,
      lonFilter: null,
      speedFilter: null,
      altitudeFilter: null
    },
    // 添加传感器数据
    sensorData: {
      acceleration: {x: 0, y: 0, z: 0},
      steps: 0,
      lastStepTime: 0,
      stepInterval: [],
      cadence: 0,
      gyroscope: {x: 0, y: 0, z: 0}
    },
    // 添加GPS质量数据
    gpsQuality: {
      accuracy: 0,
      satellites: 0,
      signal: 'poor', // poor, moderate, good
      accuracyHistory: [], // 记录精度历史
      lastAccurateLocation: null, // 最后一个准确的位置
      consecutiveInvalidCount: 0, // 连续无效点计数
      accuracyRate: '0.0' // 添加GPS准确率
    },
    runningData: {
      duration: 0,
      durationFormatted: '00:00:00',
      distance: 0,
      distanceFormatted: '0.00',
      filteredDistanceKm: '0.00',
      pace: 0,
      paceFormatted: '0\'00"',
      calories: 0,
      speed: 0,
      speedFormatted: '0.0',
      filteredSpeed: 0,
      steps: 0,
      avgPace: 0,
      avgPaceFormatted: '0\'00"',
      maxPace: 0,
      maxPaceFormatted: '0\'00"',
      avgSpeed: 0,
      avgSpeedFormatted: '0.0',
      maxSpeed: 0,
      maxSpeedFormatted: '0.0',
      heartRate: 0,
      elevation: 0,
      elevationGain: 0,
      cadence: 0,
      // 添加新的数据字段
      cadenceStats: {
        avg: 0,
        max: 0,
        min: 999,
        chart: []
      },
      paceStats: {
        best: 999,
        worst: 0,
        chart: []
      },
      heartRateZones: {
        zone1: {time: 0, percentage: 0},
        zone2: {time: 0, percentage: 0},
        zone3: {time: 0, percentage: 0},
        zone4: {time: 0, percentage: 0},
        zone5: {time: 0, percentage: 0}
      },
      strideData: {
        avgLength: 0,
        maxLength: 0,
        minLength: 999,
        groundContact: {
          avg: 0,
          max: 0,
          min: 999,
          samples: []
        },
        verticalOscillation: {
          avg: 0,
          max: 0,
          min: 999,
          samples: []
        }
      },
      balance: {
        leftRight: "50%/50%",
        chart: []
      },
      elevationData: {
        gain: 0,
        loss: 0,
        maxAltitude: -999,
        minAltitude: 999,
        chart: []
      },
      trainingEffect: {
        aerobic: 0,
        anaerobic: 0,
        load: 0,
        recovery: 0,
        vo2max: 0
      },
      environmentData: {
        temperature: null,
        humidity: null,
        pressure: null,
        uvIndex: null,
        windSpeed: null,
        windDirection: null
      }
    },
    isRunning: false,
    isPaused: false,
    showCountdown: false,
    countdown: 3,
    countdownProgress: 0,
    countdownTimer: null,
    locations: [],
    lastLocation: null,
    mapData: {
      latitude: 0,
      longitude: 0,
      scale: 16,
      polyline: [{
        points: [],
        color: "#1989fa",
        width: 4,
        arrowLine: true,
        dottedLine: false
      }]
    },
    startTime: 0,
    pauseStartTime: 0,  // 修改变量名以更清晰
    totalPauseDuration: 0,  // 修改变量名以更清晰
    lastMovingTime: 0,
    voiceEnabled: true,  // 是否开启语音
    lastVoiceTime: 0,    // 上次语音提示时间
    voiceInterval: 1000,  // 语音提示间隔（毫秒）
    lastDistance: 0,      // 上次播报的距离
    lastDuration: 0,      // 上次播报的时间
    goals: {
      distance: 5,    // 目标距离（公里）
      duration: 30,   // 目标时间（分钟）
      calories: 300   // 目标消耗（千卡）
    },
    achievedGoals: {
      distance: false,
      duration: false,
      calories: false
    },
    completeTimer: null,
    completeProgress: 0,
    voiceSettings: {
      enabled: true,
      interval: 1, // 播报间隔（分钟）
      items: {
        distance: true,
        pace: true,
        duration: true,
        calories: false
      }
    },
    resumeCountdown: {
      show: false,
      time: 5,
      timer: null
    },
    isPressingComplete: false,
    completeCountdown: '3.0',  // 新增完成倒计时显示属性
    showDebugPanel: true, // 是否显示调试面板
    debugInfo: {
      fusion: {
        gpsDistance: '0.00',
        stepDistance: '0.00',
        fusedDistance: '0.00',
        gpsReliability: '0.00%',
        stepReliability: '0.00%',
        strideLength: '0.00',
        environment: 'normal',
        gyroCorrection: '0.0°'
      }
    },
    lastActiveTime: 0,  // 添加最后活动时间记录
    screenLockedTime: 0,  // 添加锁屏时间记录
    timeCompensation: 0,  // 添加时间补偿值
  },

  onLoad(options) {
    // 获取页面参数
    const { type, name, duration, planId } = options;
    
    // 初始化运动类型和名称
    const exercise = {
      id: options.exerciseId,
      planId: options.planId,
      name: options.name || '跑步训练',
      type: options.type || 'running',
      duration: parseInt(options.duration) || 30,
      distance: parseFloat(options.distance) || 0,
      description: options.description
    };
    
    // 初始化地图数据
    const mapData = {
      latitude: 39.908823,
      longitude: 116.397470,
      scale: 16,
      polyline: [{
        points: [],
        color: '#FF9800',
        width: 8,
        dottedLine: false,
        arrowLine: false,
        borderColor: '#FF9800',
        borderWidth: 1
      }]
    };
    
    this.setData({
      exercise,
      mapData
    });
    
    // 初始化卡尔曼滤波器 - 使用优化后的参数
    this.setData({
      'filters.latFilter': new KalmanFilter(0.05, 0.3, 1, 0, 1, 2),
      'filters.lonFilter': new KalmanFilter(0.05, 0.3, 1, 0, 1, 2),
      'filters.speedFilter': new KalmanFilter(0.1, 0.5, 1, 0, 1, 2),
      'filters.altitudeFilter': new KalmanFilter(0.05, 0.5, 1, 0, 1, 2)
    });
    
    // 初始化步数相关变量
    this.initialWeRunSteps = 0;
    this.lastMockStepCount = 0;
    this.previousWeRunSteps = 0;
    
    // 检查定位权限并初始化
    this.checkLocationAuth();
    
    // 获取当前位置
    wx.getLocation({
      type: 'gcj02',
      altitude: true,
      isHighAccuracy: true,
      highAccuracyExpireTime: 3000,
      success: (res) => {
        this.setData({
          'mapData.latitude': res.latitude,
          'mapData.longitude': res.longitude,
          'gpsQuality.accuracy': res.accuracy || 0,
          'gpsQuality.signal': this.getGPSSignalQuality(res)
        });
      }
    });
    
    // 初始化音频上下文
    this.initAudioContext();
    
    // 初始化语音设置
    const voiceSettings = wx.getStorageSync('voiceSettings');
    if (voiceSettings) {
      this.setData({ voiceSettings });
    }

    // 监听返回按键事件
    wx.enableAlertBeforeUnload({
      message: '训练正在进行中，确定要退出吗？'
    });
    
    // 初始化微信运动步数API
    this.initWeRunAuthorization();
    
    // 初始化加速度计
    this.initAccelerometer();
    
    // 初始化陀螺仪传感器
    this.initGyroscope();
  },

  // 初始化陀螺仪传感器
  initGyroscope() {
    try {
      // 检查设备是否支持陀螺仪
      wx.startGyroscope({
        interval: 'game', // 游戏级频率，约为20ms一次
        success: () => {
          console.log('陀螺仪初始化成功');
          this.hasGyroscope = true;
          
          // 监听陀螺仪数据变化
          wx.onGyroscopeChange((res) => {
            // 只在运动中且非暂停状态处理陀螺仪数据
            if (!this.data.isRunning || this.data.isPaused) return;
            
            this.handleGyroscopeData(res);
          });
        },
        fail: (err) => {
          console.error('陀螺仪初始化失败:', err);
          this.hasGyroscope = false;
        }
      });
    } catch (error) {
      console.error('初始化陀螺仪出错:', error);
      this.hasGyroscope = false;
    }
  },
  
  // 处理陀螺仪数据
  handleGyroscopeData(res) {
    try {
      // 获取传感器数据副本
      const sensorData = { ...this.data.sensorData };
      
      // 更新陀螺仪数据
      sensorData.gyroscope = {
        x: res.x,
        y: res.y,
        z: res.z
      };
      
      // 初始化陀螺仪累积数据
      if (!this.gyroData) {
        this.gyroData = {
          lastTimestamp: Date.now(),
          cumulativeAngle: 0, // 累积角度变化
          heading: 0 // 估计的朝向 (0-359度，北为0，顺时针)
        };
      }
      
      // 计算时间差（秒）
      const now = Date.now();
      const timeDiff = (now - this.gyroData.lastTimestamp) / 1000;
      
      // 防止时间间隔过小导致计算不稳定
      if (timeDiff < 0.01) return;
      
      // 计算Z轴(垂直于设备平面)的旋转变化，用于估算用户转向
      // 角速度(rad/s)乘以时间(s)得到角度变化(rad)
      const angleChange = res.z * timeDiff;
      
      // 累积角度变化（转换为度）
      this.gyroData.cumulativeAngle += angleChange * (180 / Math.PI);
      
      // 更新朝向，确保在0-359范围内
      this.gyroData.heading = (this.gyroData.heading + angleChange * (180 / Math.PI)) % 360;
      if (this.gyroData.heading < 0) this.gyroData.heading += 360;
      
      // 更新时间戳
      this.gyroData.lastTimestamp = now;
      
      // 更新传感器数据
      sensorData.heading = Math.round(this.gyroData.heading);
      this.setData({ sensorData });
      
      // 确保runningData和locations存在
      if (!this.data.runningData || !this.data.runningData.locations) {
        return;
      }
      
      // 只在GPS信号不佳时使用陀螺仪数据修正轨迹
      if (this.data.gpsQuality && this.data.gpsQuality.signal !== 'good' && Math.abs(angleChange) > 0.05) {
        this.correctPathWithGyro(angleChange);
      }
      
    } catch (error) {
      console.error('处理陀螺仪数据出错:', error);
    }
  },
  
  // 使用陀螺仪数据修正轨迹
  correctPathWithGyro(angleChange) {
    try {
      // 获取运动数据和GPS质量
      const runningData = this.data.runningData;
      const gpsQuality = this.data.gpsQuality;
      
      // 确保runningData和locations存在
      if (!runningData || !runningData.locations) {
        console.log('无法修正轨迹：位置数据不存在');
        return;
      }
      
      // 只有当我们有至少两个定位点且GPS信号不佳时才尝试修正
      if (runningData.locations.length < 2 || gpsQuality.signal === 'good') {
        return;
      }
      
      // 获取最后两个位置点
      const locations = runningData.locations;
      const lastLocation = locations[locations.length - 1];
      const previousLocation = locations[locations.length - 2];
      
      // 计算当前运动方向
      const bearingRad = Math.atan2(
        lastLocation.longitude - previousLocation.longitude,
        lastLocation.latitude - previousLocation.latitude
      );
      
      // 将弧度转换为角度(0-359，北为0，顺时针)
      let bearing = (bearingRad * 180 / Math.PI + 360) % 360;
      
      // 应用陀螺仪检测到的角度变化调整方向
      bearing = (bearing + angleChange * (180 / Math.PI)) % 360;
      if (bearing < 0) bearing += 360;
      
      // 只在大角度转弯或GPS信号较差时应用修正
      if (Math.abs(angleChange * (180 / Math.PI)) > 15 || gpsQuality.signal === 'poor') {
        // 记录陀螺仪方向修正信息
        console.log(`应用陀螺仪方向修正: ${angleChange.toFixed(2)} rad, 新方向: ${bearing.toFixed(1)}°`);
        
        // 可以在这里更新UI显示陀螺仪修正状态
        this.setData({
          'runningData.usingGyroCorrection': true
        });
        
        // 更新调试信息
        if (this.data.debugInfo && this.data.debugInfo.fusion) {
          this.setData({
            'debugInfo.fusion.gyroCorrection': `${(angleChange * (180 / Math.PI)).toFixed(1)}°`
          });
        }
      }
    } catch (error) {
      console.error('使用陀螺仪修正轨迹出错:', error);
    }
  },

  // 处理加速度计数据
  handleAccelerometerData(res) {
    try {
      const { x, y, z } = res;
      const now = Date.now();
      const sensorData = this.data.sensorData;
      
      // 计算合加速度
      const acceleration = Math.sqrt(x * x + y * y + z * z);
      
      // 更新加速度历史
      const accHistory = sensorData.accHistory || [];
      accHistory.push({
        timestamp: now,
        acceleration
      });
      
      // 只保留最近100个记录
      if (accHistory.length > 100) {
        accHistory.shift();
      }
      
      // 检测步数
      if (accHistory.length >= 3) {
        const lastAcc = accHistory[accHistory.length - 2].acceleration;
        const prevAcc = accHistory[accHistory.length - 3].acceleration;
        
        // 使用峰值检测算法
        if (acceleration > lastAcc && acceleration > prevAcc && 
            acceleration > 12 && // 加速度阈值
            now - (sensorData.lastStepTime || 0) > 200) { // 最小步频间隔
          
          // 记录步数
          const steps = (sensorData.steps || 0) + 1;
          const stepInterval = now - (sensorData.lastStepTime || now);
          
          // 更新步频历史
          const stepIntervalHistory = sensorData.stepInterval || [];
          stepIntervalHistory.push(stepInterval);
          if (stepIntervalHistory.length > 20) {
            stepIntervalHistory.shift();
          }
          
          this.setData({
            'sensorData.steps': steps,
            'sensorData.lastStepTime': now,
            'sensorData.stepInterval': stepIntervalHistory,
            'sensorData.accHistory': accHistory
          });
          
          // 更新运动数据
          const runningData = this.data.runningData;
          runningData.steps = steps;
          runningData.cadence = this.calculateCurrentCadence();
          runningData.strideLength = this.calculateStrideLength();
          
          this.setData({
            runningData
          });
        }
      }
    } catch (error) {
      console.error('处理加速度计数据失败:', error);
    }
  },
  
  // 基于步数更新距离和配速
  updateDistanceFromSteps(sensorData) {
    if (!this.data.isRunning || this.data.isPaused || !sensorData.steps) return;
    
    try {
      // 获取当前运动数据
      const runningData = { ...this.data.runningData };
      
      // 如果GPS位置更新不频繁或信号较差，使用步数来估算距离
      if (!runningData.lastLocationUpdateTime || 
          Date.now() - runningData.lastLocationUpdateTime > 5000 || 
          this.data.gpsQuality.signal === 'poor') {
          
        // 计算步幅(米/步)
        let strideLength = this.learnedStrideLength || 0.7; // 使用学习的步幅或默认值
        
        // 如果有步频数据，根据步频调整步幅
        if (sensorData.cadence > 0) {
          const cadenceSpeedFactor = Math.min(Math.max(sensorData.cadence / 170, 0.9), 1.1);
          strideLength *= cadenceSpeedFactor;
        }
        
        // 计算总距离(米)
        const estimatedDistance = sensorData.steps * strideLength;
        
        // 只有当估算距离大于当前距离时才更新
        if (estimatedDistance > runningData.distance) {
          // 计算新增距离
          const distanceIncrement = estimatedDistance - runningData.distance;
          
          // 更新总距离和格式化距离
          runningData.distance = estimatedDistance;
          runningData.distanceFormatted = (estimatedDistance / 1000).toFixed(2);
          runningData.filteredDistance = estimatedDistance;
          runningData.filteredDistanceKm = (estimatedDistance / 1000).toFixed(2);
          
          // 更新配速
          if (runningData.duration > 0) {
            // 计算平均配速(分钟/公里)
            const avgPace = (runningData.duration / 60) / (estimatedDistance / 1000);
            runningData.avgPace = avgPace;
            runningData.avgPaceFormatted = this.formatPace(avgPace);
            
            // 计算当前配速(使用最近30秒的数据)
            if (this.lastStepBasedDistanceUpdateTime) {
              const timeDiff = (Date.now() - this.lastStepBasedDistanceUpdateTime) / 1000; // 秒
              if (timeDiff > 0) {
                const currentSpeed = (distanceIncrement / timeDiff) * 3.6; // 转换为km/h
                const currentPace = currentSpeed > 0 ? 60 / currentSpeed : 0; // 分钟/公里
                
                // 平滑处理配速
                if (!runningData.paceBuffer) {
                  runningData.paceBuffer = [];
                }
                
                runningData.paceBuffer.push(currentPace);
                if (runningData.paceBuffer.length > 5) {
                  runningData.paceBuffer.shift();
                }
                
                const avgCurrentPace = runningData.paceBuffer.reduce((a, b) => a + b, 0) / runningData.paceBuffer.length;
                
                runningData.pace = avgCurrentPace;
                runningData.paceFormatted = this.formatPace(avgCurrentPace);
                runningData.speed = currentSpeed;
                runningData.speedFormatted = currentSpeed.toFixed(1);
              }
            }
          }
          
          this.lastStepBasedDistanceUpdateTime = Date.now();
          
          // 更新状态
          this.setData({ runningData });
        }
      }
    } catch (error) {
      console.error('基于步数更新距离出错:', error);
    }
  },

  // 获取GPS信号质量
  getGPSSignalQuality(location) {
    if (!location || !location.horizontalAccuracy || location.horizontalAccuracy < 0) {
      return 'poor';
    }
    
    if (location.horizontalAccuracy <= 5) {
      return 'good';
    } else if (location.horizontalAccuracy <= 15) {
      return 'moderate';
    } else {
      return 'poor';
    }
  },

  // 初始化音频上下文
  initAudioContext() {
    try {
      // 安全地销毁之前的实例
      if (this.audioContext) {
        try {
          if (typeof this.audioContext.stop === 'function') {
            this.audioContext.stop();
          }
          if (typeof this.audioContext.destroy === 'function') {
            this.audioContext.destroy();
          }
        } catch (e) {
          console.warn('销毁旧音频实例失败:', e);
        }
        this.audioContext = null;
      }

      this.audioQueue = [];
      this.isPlaying = false;
      this.audioRetryCount = 0;
      this.maxRetries = 3;

      // 创建新的音频上下文
      try {
        this.audioContext = wx.createInnerAudioContext();
        
        if (this.audioContext) {
          this.audioContext.volume = 1.0;
          this.audioContext.obeyMuteSwitch = false;
          
          this.audioContext.onEnded(() => {
            console.log('音频播放结束');
            this.isPlaying = false;
            this.audioRetryCount = 0;
            this.playNextAudio();
          });

          this.audioContext.onError((res) => {
            console.error('音频播放失败：', res);
            this.handleAudioError();
          });
        }
      } catch (error) {
        console.error('创建音频上下文失败：', error);
        this.audioContext = null;
      }

      // 添加音频加载超时处理
      this.audioLoadTimeout = null;

    } catch (error) {
      console.error('初始化音频上下文失败：', error);
      this.audioContext = null;
    }
  },

  // 检查定位权限
  checkLocationAuth() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              console.log('获取定位权限成功');
            },
            fail: () => {
              wx.showToast({
                title: '需要定位权限来记录运动轨迹',
                icon: 'none'
              });
            }
          });
        }
      }
    });
  },

  // 开始训练
  startTraining() {
    // 清理可能存在的倒计时
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
    }

    this.setData({ 
      showCountdown: true,
      countdown: 3 
    });

    // 预加载倒计时音频
    const countdownTexts = ['准备开始', '3', '2', '1', '开始跑步'];
    countdownTexts.forEach(text => {
      const encodedText = encodeURIComponent(text);
      wx.request({
        url: `https://dict.youdao.com/dictvoice?audio=${encodedText}&le=zh`,
        method: 'HEAD'
      });
    });

    // 开始前的语音提示
    this.textToSpeech('准备开始');
    
    setTimeout(() => {
      this.startCountdown();
    }, 1500);

    // 重置地图数据和轨迹
    this.setData({
      'mapData.polyline': [{
        points: [],
        color: '#FF9800',
        width: 8,
        dottedLine: false,
        arrowLine: false,
        borderColor: '#FF9800',
        borderWidth: 1
      }],
      locations: [],
      lastLocation: null
    });

    // 设置语音播报定时器
    if (this.data.voiceSettings.enabled) {
      this.voiceTimer = setInterval(() => {
        this.speakStatus();
      }, this.data.voiceSettings.interval * 60 * 1000);
    }
  },

  // 开始倒计时
  startCountdown() {
    this.setData({ 
      countdown: 3,
      showCountdown: true,
      countdownProgress: 0
    });

    // 使用 setTimeout 替代 setInterval 以获得更精确的控制
    const playCountdown = (count) => {
      if (count >= 0) {
        this.setData({ 
          countdown: count,
          countdownProgress: ((3 - count) / 3) * 100
        });
        
        if (count > 0) {
          this.textToSpeech(count.toString());
          setTimeout(() => playCountdown(count - 1), 1000);
        } else {
          // 倒计时结束
          setTimeout(() => {
            this.setData({ 
              showCountdown: false,
              countdown: 3,
              countdownTimer: null,
              isRunning: true,
              isPaused: false,
              countdownProgress: 0
            });

            this.textToSpeech('开始跑步');
            wx.vibrateShort();
            this.startTimer();
            this.startLocationUpdate();
          }, 300);
        }
      }
    };

    setTimeout(() => {
      playCountdown(3);
    }, 100);
  },

  // 开始计时
  startTimer() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    const startTime = Date.now();
    this.setData({
      startTime,
      lastActiveTime: startTime
    });

    this.timer = setInterval(() => {
      if (!this.data.isRunning || this.data.isPaused) {
        return;
      }

      const now = Date.now();
      const elapsed = (now - startTime + this.data.timeCompensation) / 1000;
      
      // 更新运动数据
      const runningData = this.data.runningData;
      runningData.duration = elapsed;
      runningData.durationFormatted = this.formatDuration(elapsed);
      
      // 更新配速
      if (runningData.distance > 0) {
        runningData.pace = this.calculatePace(runningData.distance / elapsed);
        runningData.paceFormatted = this.formatPace(runningData.pace);
      }
      
      this.setData({
        runningData
      });

      // 检查目标
      this.checkGoals();
      
      // 语音播报
      if (this.data.voiceEnabled && this.data.voiceInterval > 0) {
        const interval = this.data.voiceInterval * 60;
        if (elapsed % interval < 1) {
          this.speakStatus();
        }
      }
    }, 1000);
  },

  // 开始位置更新
  startLocationUpdate() {
    // 先停止可能存在的位置更新
    wx.stopLocationUpdate({
      complete: () => {
        console.log('尝试启动位置更新服务...');
        
        // 添加自动恢复机制
        this.locationUpdateFailCount = 0;
        
        // 解除可能存在的老监听器
        try {
          wx.offLocationChange();
        } catch (e) {
          console.log('解除位置监听器失败，可能不存在:', e);
        }
        
        // 使用高精度定位
    wx.startLocationUpdate({
          type: 'gcj02',
          altitude: true,
          isHighAccuracy: true,
          highAccuracyExpireTime: 20000, // 延长高精度超时时间
      success: () => {
            console.log('开启高精度位置更新成功');
            // 绑定位置更新处理函数
            wx.onLocationChange((loc) => {
              this.handleLocationChange(loc);
            });
            
            // 重置失败计数
            this.locationUpdateFailCount = 0;
      },
      fail: (error) => {
            console.error('开启高精度位置更新失败:', error);
            this.locationUpdateFailCount++;
            
            // 尝试使用普通精度
            wx.startLocationUpdate({
              type: 'gcj02',
              success: () => {
                console.log('开启普通精度位置更新成功');
                wx.onLocationChange((loc) => {
                  this.handleLocationChange(loc);
                });
                
                // 重置失败计数但标记降级
                this.locationUpdateFailCount = 0;
                this.isLocationUpdateDowngraded = true;
              },
              fail: (retryError) => {
                console.error('开启普通精度位置更新也失败:', retryError);
        wx.showToast({
                  title: '定位功能不可用，请检查权限和GPS设置',
                  icon: 'none',
                  duration: 3000
                });
                
                // 增加自动重试机制
                if (this.locationUpdateFailCount < 3) {
                  console.log(`将在3秒后第${this.locationUpdateFailCount+1}次尝试重启位置服务`);
                  setTimeout(() => {
                    this.startLocationUpdate();
                  }, 3000);
                }
              }
            });
          }
        });
        
        // 启动GPS质量监测
        this.initGPSQualityMonitoring();
        
        // 设置安全检查定时器，定期检查位置更新是否还在工作
        this.locationUpdateWatchdog = setInterval(() => {
          const now = Date.now();
          // 如果超过30秒没有位置更新，尝试重启
          if (this.data.isRunning && 
              !this.data.isPaused && 
              this.data.runningData.totalLocationCount > 0 &&
              this.lastLocationUpdateTime && 
              (now - this.lastLocationUpdateTime) > 30000) {
            console.log('位置更新似乎已停止工作，尝试重启...');
            this.startLocationUpdate();
          }
        }, 10000);
      }
    });
  },

  // 初始化GPS质量监测
  initGPSQualityMonitoring() {
    // 每30秒检查一次GPS质量
    this.gpsQualityTimer = setInterval(() => {
      const { gpsQuality, runningData } = this.data;
      
      // 计算GPS准确率
      const accuracyRate = runningData.totalLocationCount > 0 
        ? (runningData.accurateLocationCount / runningData.totalLocationCount) * 100 
        : 0;
      
      // 如果GPS准确率低于60%，提示用户（原来是70%）
      if (accuracyRate < 60 && runningData.totalLocationCount > 20) {
        wx.showToast({
          title: 'GPS信号较弱，请尝试到开阔区域',
          icon: 'none',
          duration: 3000
        });
        
        // 如果开启了语音，播报GPS信号弱
        if (this.data.voiceSettings && this.data.voiceSettings.enabled) {
          this.textToSpeech('GPS信号较弱，可能影响轨迹记录准确性');
        }
      }
      
      // 更新GPS质量状态
      this.setData({
        'gpsQuality.accuracyRate': accuracyRate.toFixed(1)
      });
    }, 30000);
  },
  
  // 停止GPS质量监测
  stopGPSQualityMonitoring() {
    if (this.gpsQualityTimer) {
      clearInterval(this.gpsQualityTimer);
      this.gpsQualityTimer = null;
    }
  },

  // 处理位置变化 - 优化版本
  handleLocationChange(location) {
    if (!this.data.isRunning || this.data.isPaused) {
      return;
    }

    try {
      const now = Date.now();
      
      // 记录最后位置更新时间，用于监控位置服务是否工作
      this.lastLocationUpdateTime = now;
      
      // 添加时间戳
      location.timestamp = now;
      
      // 增加位置计数
      const totalLocationCount = (this.data.runningData.totalLocationCount || 0) + 1;
      
      // 检查GPS精度
      const gpsCheck = checkGPSAccuracy(location);
      let gpsQuality = { ...this.data.gpsQuality };
      gpsQuality.accuracy = gpsCheck.accuracy;
      
      // 更新GPS信号质量
      gpsQuality.signal = gpsCheck.signalQuality || this.getGPSSignalQuality(location);
      
      // 记录精度历史
      gpsQuality.accuracyHistory = [...(gpsQuality.accuracyHistory || []).slice(-19), gpsCheck.accuracy];
      
      // 更新连续无效点计数
      if (!gpsCheck.isAccurate) {
        gpsQuality.consecutiveInvalidCount = (gpsQuality.consecutiveInvalidCount || 0) + 1;
      } else {
        gpsQuality.consecutiveInvalidCount = 0;
        gpsQuality.lastAccurateLocation = location;
      }
      
      // 放宽连续无效点的处理条件，从5改为8
      if (gpsQuality.consecutiveInvalidCount > 8 && gpsQuality.lastAccurateLocation) {
        console.log('使用最后一个有效位置点替代当前无效点');
        location = { ...gpsQuality.lastAccurateLocation, timestamp: now };
        gpsCheck.isAccurate = true;
      }
      
      // 获取上一个位置点
      const lastLocation = this.data.locations && this.data.locations.length > 0 
        ? this.data.locations[this.data.locations.length - 1] 
        : null;
      
      // 如果是第一个点，直接添加
      if (!lastLocation) {
        const filteredLocation = {
          latitude: location.latitude,
          longitude: location.longitude,
          altitude: location.altitude || 0,
          speed: location.speed || 0,
          timestamp: now,
          distance: 0,
          pace: 0,
          isFiltered: false,
          accuracy: gpsCheck.accuracy
        };
        
        this.setData({
          locations: [filteredLocation],
          'mapData.latitude': filteredLocation.latitude,
          'mapData.longitude': filteredLocation.longitude,
          'mapData.polyline[0].points': [{
            latitude: filteredLocation.latitude,
            longitude: filteredLocation.longitude
          }],
          gpsQuality,
          'runningData.totalLocationCount': totalLocationCount,
          'runningData.lastValidLocation': filteredLocation
        });
        return;
      }
      
      // 计算时间差（秒）
      const timeDiff = (now - lastLocation.timestamp) / 1000;
      
      // 放宽时间差限制，从0.3和15改为0.2和30
      if (timeDiff < 0.2 || timeDiff > 30) {
        console.log(`时间差异常: ${timeDiff}秒，忽略此点`);
        return;
      }
      
      // 应用卡尔曼滤波器
      let filteredLat, filteredLon, filteredSpeed, filteredAlt;
      
      // 如果GPS精度良好，使用原始值初始化滤波器
      if (gpsCheck.isAccurate && this.data.runningData.accurateLocationCount === 0) {
        this.data.filters.latFilter.x[0] = location.latitude;
        this.data.filters.lonFilter.x[0] = location.longitude;
        this.data.filters.speedFilter.x[0] = location.speed || 0;
        this.data.filters.altitudeFilter.x[0] = location.altitude || 0;
        
        filteredLat = location.latitude;
        filteredLon = location.longitude;
        filteredSpeed = location.speed || 0;
        filteredAlt = location.altitude || 0;
      } else {
        // 应用滤波器，使用时间差作为dt参数
        filteredLat = this.data.filters.latFilter.update(location.latitude, timeDiff);
        filteredLon = this.data.filters.lonFilter.update(location.longitude, timeDiff);
        filteredSpeed = this.data.filters.speedFilter.update(location.speed || 0, timeDiff);
        filteredAlt = this.data.filters.altitudeFilter.update(location.altitude || 0, timeDiff);
      }
      
      // 创建过滤后的位置对象
      const filteredLocation = {
        latitude: filteredLat,
        longitude: filteredLon,
        altitude: filteredAlt,
        speed: filteredSpeed,
        timestamp: now,
        originalLocation: { ...location },
        isFiltered: true,
        accuracy: gpsCheck.accuracy
      };
      
      // 计算与上一个点的距离
      let distance = 0;
      let isValidDistance = true;
      
      // 计算原始距离和过滤后的距离
      const rawDistance = calculateHaversineDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        location.latitude,
        location.longitude,
        timeDiff
      );
      
      const filteredDistance = calculateHaversineDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        filteredLat,
        filteredLon,
        timeDiff
      );
      
      // 选择更合理的距离值
      if (gpsCheck.isAccurate) {
        // 如果GPS精度良好，使用过滤后的距离
        distance = filteredDistance;
        
        // 检查距离是否合理（基于时间和速度）
        const maxReasonableDistance = timeDiff * 10; // 最大10m/s (约36km/h)
        if (distance > maxReasonableDistance) {
          console.log(`距离异常: ${distance}m in ${timeDiff}s, 速度: ${distance/timeDiff}m/s`);
          
          // 使用速度估计距离
          if (filteredSpeed > 0) {
            distance = filteredSpeed * timeDiff;
            console.log(`使用速度估计距离: ${distance}m`);
          } else if (this.data.runningData.lastValidSpeed > 0) {
            distance = this.data.runningData.lastValidSpeed * timeDiff;
            console.log(`使用上次有效速度估计距离: ${distance}m`);
          } else {
            // 距离明显不合理，但允许少量累积以避免完全没有距离变化
            distance = Math.min(rawDistance, filteredDistance) * 0.5;
            isValidDistance = false;
          }
        }
      } else {
        // GPS精度不佳时，结合步数数据和陀螺仪数据进行修正
        const stepBasedDistance = this.calculateStepBasedDistance(timeDiff);
        const gyroBasedDistance = this.calculateGyroBasedDistance(timeDiff);
        
        if (stepBasedDistance > 0 && gyroBasedDistance > 0) {
          // 使用加权平均
          distance = stepBasedDistance * 0.7 + gyroBasedDistance * 0.3;
        } else if (stepBasedDistance > 0) {
          distance = stepBasedDistance;
        } else if (gyroBasedDistance > 0) {
          distance = gyroBasedDistance;
        } else if (this.data.runningData.lastValidSpeed > 0) {
          distance = this.data.runningData.lastValidSpeed * timeDiff;
        } else {
          distance = 0;
          isValidDistance = false;
        }
      }
      
      // 如果距离太小（小于0.3米），视为静止
      if (distance < 0.3) {
        distance = 0;
      }
      
      // 更新累计距离
      const totalRawDistance = (this.data.runningData.rawDistance || 0) + rawDistance;
      const totalFilteredDistance = (this.data.runningData.filteredDistance || 0) + distance;
      
      // 更新位置对象的距离属性
      filteredLocation.distance = totalFilteredDistance;
      
      // 更新运动数据
      const runningData = {
        ...this.data.runningData,
        distance: totalFilteredDistance,
        distanceFormatted: (totalFilteredDistance / 1000).toFixed(2),
        rawDistance: totalRawDistance,
        effectiveDistance: totalFilteredDistance,
        filteredDistanceKm: (totalFilteredDistance / 1000).toFixed(2),
        totalLocationCount,
        lastValidLocation: gpsCheck.isAccurate ? filteredLocation : this.data.runningData.lastValidLocation,
        lastValidSpeed: gpsCheck.isAccurate ? filteredSpeed : this.data.runningData.lastValidSpeed
      };
      
      // 更新状态
      this.setData({
        locations: [...this.data.locations, filteredLocation],
        gpsQuality,
        runningData,
        'mapData.polyline[0].points': [...this.data.mapData.polyline[0].points, {
          latitude: filteredLat,
          longitude: filteredLon
        }],
        'mapData.latitude': filteredLat,
        'mapData.longitude': filteredLon
      });
      
      // 更新地图视野
      if (this.data.locations.length % 10 === 0) {
        this.updateMapViewport();
      }
      
      // 每5秒进行一次传感器数据融合
      if (this.data.locations.length % 5 === 0) {
        this.advancedSensorFusion();
      }
      
    } catch (error) {
      console.error('处理位置更新失败:', error);
    }
  },

  calculateKilometerPaces(locations) {
    const kmPaces = [];
    
    // 检查locations是否存在且不为空
    if (!locations || locations.length === 0) {
      return kmPaces;
    }
    
    let currentKm = 1;
    let kmStartTime = locations[0].timestamp;
    let kmStartDistance = 0;
    
    locations.forEach((location, index) => {
      const distance = location.distance || 0;
      if (distance >= currentKm * 1000) {
        const kmEndTime = location.timestamp;
        const duration = (kmEndTime - kmStartTime) / 1000; // 转换为秒
        const pace = duration / 60; // 转换为分钟
        
        kmPaces.push({
          km: currentKm,
          pace: pace,
          duration: duration,
          startTime: kmStartTime,
          endTime: kmEndTime,
          paceFormatted: this.formatPace(pace)
        });
        
        currentKm++;
        kmStartTime = kmEndTime;
        kmStartDistance = distance;
      }
    });
    
    return kmPaces;
  },

  // 格式化时间
  formatDuration(seconds) {
    if (!seconds && seconds !== 0) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  },

  // 格式化配速
  formatPace(pace) {
    if (!pace) return '0\'00"';
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}'${String(seconds).padStart(2, '0')}"`;
  },

  // 计算距离 - 使用改进的Haversine公式
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // 地球半径，单位为米
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // 距离，单位为米
    
    return distance;
  },
  
  /**
   * 将角度转换为弧度
   * @param {number} deg 角度
   * @return {number} 弧度
   */
  deg2rad(deg) {
    return deg * (Math.PI/180);
  },

  // 暂停训练
  pauseTraining() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    
    if (this.voiceTimer) {
      clearInterval(this.voiceTimer);
      this.voiceTimer = null;
    }
    
    const now = Date.now();
    
    this.setData({ 
      isRunning: true,  // 保持运行状态，但是暂停
      isPaused: true,
      pauseStartTime: now
    });
    
    this.textToSpeech('训练已暂停', true);
    this.stopLocationUpdate();
    this.clearTimers();
  },

  // 停止位置更新
  stopLocationUpdate() {
    // 解绑位置监听
    try {
      wx.offLocationChange();
    } catch (e) {
      console.log('解除位置监听器失败:', e);
    }
    
    // 停止位置更新
    wx.stopLocationUpdate({
      complete: () => {
        console.log('位置更新已停止');
      }
    });
    
    // 停止GPS质量监测
    this.stopGPSQualityMonitoring();
    
    // 停止位置更新监控
    if (this.locationUpdateWatchdog) {
      clearInterval(this.locationUpdateWatchdog);
      this.locationUpdateWatchdog = null;
    }
  },

  // 添加地图视野更新方法
  updateMapViewport() {
    const mapContext = wx.createMapContext('runningMap');
    const points = this.data.mapData.polyline[0].points;
    
    if (points.length > 1) {
      mapContext.includePoints({
        points,
        padding: [50, 50, 50, 50]
      });
    }
  },

  // 完成训练
  completeTraining() {
    try {
      // 停止位置更新和传感器
      this.stopLocationUpdate();

      if (this.hasAccelerometer) {
        wx.stopAccelerometer();
        wx.offAccelerometerChange();
      }
      
      if (this.hasGyroscope) {
        wx.stopGyroscope();
        wx.offGyroscopeChange();
      }
      
      // 设置状态为已完成，但未保存
      this.setData({
        isRunning: false,
        isPaused: false,
        isCompleted: true
      });
      
      // 清除所有定时器
      this.clearTimers();
      
      // 优化轨迹
      this.optimizeTrackBeforeComplete();
      
      // 生成公里配速数据
      const kmPaces = this.calculateKilometerPaces(this.data.runningData.locations);
      this.setData({
        'runningData.kmPaces': kmPaces
      });
      
      // 确保传感器融合数据被正确保存
      const runningData = this.data.runningData;
      
      // 获取最终的融合数据
      if (runningData.usingFusedDistance) {
        console.log('使用了传感器融合数据计算最终距离:', runningData.distance, 'km');
      }
      
      // 保存记录
      this.saveExerciseRecord();
      
      // 禁用返回提示
      wx.disableAlertBeforeUnload();
      
      // 语音播报完成信息
      if (this.data.voiceSettings.enabled) {
        const completionText = `恭喜您完成本次运动，总距离${runningData.distanceFormatted}公里，用时${this.formatDurationToSpeak(runningData.duration)}。`;
        this.textToSpeech(completionText, true);
      }
    } catch (error) {
      console.error('完成训练出错:', error);
      wx.showToast({
        title: '完成训练时发生错误',
        icon: 'none',
        duration: 2000
      });
    }
  },

  // 页面卸载时清理资源
  onUnload() {
    // 停止位置更新和监听器
    this.stopLocationUpdate();
    
    // 停止GPS质量监控
    this.stopGPSQualityMonitoring();
    
    // 停止计时器
    this.clearTimers();
    
    // 停止语音播放
    if (this.audioContext) {
      this.audioContext.stop();
    }
    
    // 停止加速度计
    if (this.hasAccelerometer) {
    wx.stopAccelerometer({
        success: () => {
          console.log('已停止加速度计');
      }
    });
    wx.offAccelerometerChange();
    }
    
    // 停止陀螺仪
    if (this.hasGyroscope) {
      wx.stopGyroscope({
        success: () => {
          console.log('已停止陀螺仪');
        }
      });
      wx.offGyroscopeChange();
    }
    
    // 如果有获取微信运动步数的定时器，清除它
    if (this.weRunTimer) {
      clearInterval(this.weRunTimer);
      this.weRunTimer = null;
    }
    
    // 关闭离开页面前确认
    wx.disableAlertBeforeUnload();
  },

  // 添加语音提示方法
  speakStatus() {
    if (!this.data.voiceSettings.enabled || this.data.isPaused) return;
    
    const { distance, duration, pace, calories } = this.data.runningData;
    const { items } = this.data.voiceSettings;
    
    // 检查是否有有效数据
    if (distance === 0 && duration === 0) {
      return;
    }
    
    let text = '当前';
    if (items.distance && distance > 0) {
      text += `，距离${(distance/1000).toFixed(2)}公里`;
    }
    if (items.pace && pace > 0) {
      text += `，配速${this.formatPaceToSpeak(pace)}`;
    }
    if (items.duration && duration > 0) {
      // 确保duration不为0时至少显示几秒
      const durationText = duration < 60 ? `${Math.ceil(duration)}秒` : this.formatDurationToSpeak(duration);
      text += `，用时${durationText}`;
    }
    
    this.textToSpeech(text);
  },

  // 语音播报方法
  textToSpeech(text, priority = false) {
    if (!this.data.voiceEnabled || !text || !this.audioContext) return;
    
    // 检查是否是重复的提示
    if (this.lastSpeechText === text && Date.now() - this.lastSpeechTime < 3000) {
      console.log('忽略重复语音提示');
      return;
    }
    
    const encodedText = encodeURIComponent(text);
    const audioUrl = `https://dict.youdao.com/dictvoice?audio=${encodedText}&le=zh`;
    
    // 优先级消息直接清空队列
    if (priority) {
      this.audioQueue = [];
      this.isPlaying = false;
      if (this.audioContext) {
        try {
          this.audioContext.stop();
        } catch (error) {
          console.warn('停止音频播放失败:', error);
        }
      }
    }
    
    this.audioQueue.push(audioUrl);
    this.lastSpeechText = text;
    this.lastSpeechTime = Date.now();
    
    if (!this.isPlaying) {
      this.playNextAudio();
    }
  },

  // 添加音频队列播放方法
  playNextAudio() {
    if (this.audioQueue.length === 0 || this.isPlaying) return;
    
    const nextAudio = this.audioQueue.shift();
    if (!nextAudio) return;

    try {
      this.isPlaying = true;
      this.audioContext.stop();
      
      // 设置加载超时
      if (this.audioLoadTimeout) {
        clearTimeout(this.audioLoadTimeout);
      }
      
      this.audioLoadTimeout = setTimeout(() => {
        console.error('音频加载超时');
        this.handleAudioError();
      }, 5000);

      this.audioContext.src = nextAudio;
      
      this.audioContext.onCanplay(() => {
        // 清除加载超时
        if (this.audioLoadTimeout) {
          clearTimeout(this.audioLoadTimeout);
        }
        
        setTimeout(() => {
          if (this.isPlaying) { // 确保还在播放状态
            this.audioContext.play();
          }
        }, 100);
      });
    } catch (error) {
      console.error('播放失败:', error);
      this.handleAudioError();
    }
  },

  // 格式化配速到语音播报格式
  formatPaceToSpeak(pace) {
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}分${seconds}秒每公里`;
  },

  // 检查目标达成
  checkGoals() {
    const { runningData, goals, achievedGoals } = this.data;
    const newAchievedGoals = { ...achievedGoals };
    let hasNewAchievement = false;

    // 检查距离目标
    if (!achievedGoals.distance && runningData.distance >= goals.distance) {
      newAchievedGoals.distance = true;
      hasNewAchievement = true;
      this.textToSpeech(`恭喜达成${goals.distance}公里目标！`);
    }

    // 检查时间目标
    if (!achievedGoals.duration && runningData.duration >= goals.duration * 60) {
      newAchievedGoals.duration = true;
      hasNewAchievement = true;
      this.textToSpeech(`恭喜运动时间达到${goals.duration}分钟！`);
    }

    // 检查卡路里目标
    if (!achievedGoals.calories && runningData.calories >= goals.calories) {
      newAchievedGoals.calories = true;
      hasNewAchievement = true;
      this.textToSpeech(`恭喜消耗${goals.calories}千卡！`);
    }

    if (hasNewAchievement) {
      this.setData({ achievedGoals: newAchievedGoals });
      wx.vibrateShort();
    }
  },

  // 修改恢复训练方法
  resumeTraining() {
    const now = Date.now();
    
    // 计算暂停时长并累加到总暂停时间
    if (this.data.pauseStartTime) {
      const pauseDuration = now - this.data.pauseStartTime;
      this.setData({
        totalPauseDuration: this.data.totalPauseDuration + pauseDuration,
        pauseStartTime: 0  // 重置暂停开始时间
      });
    }
    
    this.setData({
      isRunning: true,
      isPaused: false,
      lastMovingTime: now
    });

    // 重新开始计时器
    this.startTimer();
    
    // 重新开始位置更新
    this.startLocationUpdate();
    
    // 如果启用了语音，重新开始语音播报
    if (this.data.voiceSettings.enabled) {
      this.voiceTimer = setInterval(() => {
        this.speakStatus();
      }, this.data.voiceSettings.interval * 60 * 1000);
    }
    
    this.textToSpeech('训练已恢复', true);
  },

  // 修改完成按钮的长按处理
  handleCompleteLongPress() {
    // 设置按下状态
    this.setData({ 
      isPressingComplete: true,
      completeProgress: 0
    });
    
    // 开始长按计时
    const startTime = Date.now();
    const duration = 3000; // 3秒
    
    this.completeTimer = setInterval(() => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      this.setData({
        completeProgress: progress
      });
      
      // 到3秒就结束
      if (progress >= 1) {
        clearInterval(this.completeTimer);
        this.completeTimer = null;
        this.completeTraining();
      }
    }, 50);

    // 震动反馈
    wx.vibrateShort({ type: 'medium' });
  },

  handleCompleteTouchEnd() {
    // 清理计时器
    if (this.completeTimer) {
      clearInterval(this.completeTimer);
      this.completeTimer = null;
    }
    
    // 重置进度和按下状态
    this.setData({ 
      completeProgress: 0,
      isPressingComplete: false
    });
  },

  // 修改配速计算
  calculatePace(speed) {
    try {
      // 速度单位：km/h
      if (!speed || speed <= 0) return 0;
      
      // 计算配速（分钟/公里）
      const pace = 60 / speed;
      
      // 限制配速在合理范围内（3-30分钟/公里）
      return Math.max(3, Math.min(30, pace));
    } catch (error) {
      console.error('计算配速失败:', error);
      return 0;
    }
  },

  // 修改卡路里计算（考虑体重和坡度）
  calculateCalories(distance, duration, elevation) {
    // 尝试从全局获取用户信息
    const app = getApp();
    let weight = 65; // 默认体重
    
    try {
      // 从用户信息中获取体重数据
      if (app && app.globalData && app.globalData.userInfo && app.globalData.userInfo.weight) {
        weight = app.globalData.userInfo.weight;
      }
    } catch (error) {
      console.error('获取用户体重失败，使用默认值:', error);
    }
    
    // 根据活动强度调整MET值
    let MET = 7.5; // 默认跑步代谢当量
    
    // 基于配速调整MET (慢走~快跑范围)
    if (this.data && this.data.runningData && this.data.runningData.pace) {
      const pace = this.data.runningData.pace; // 分钟/公里
      if (pace > 10) { // 慢走 (~6km/h)
        MET = 4.0;
      } else if (pace > 8) { // 快走/慢跑
        MET = 6.0;
      } else if (pace > 6) { // 中速跑
        MET = 8.0;
      } else if (pace > 4) { // 快跑
        MET = 10.0;
      } else { // 极速跑
        MET = 12.0;
      }
    }
    
    // 考虑坡度对能量消耗的影响
    const elevationFactor = elevation > 0 ? 1 + (elevation / 100) * 0.2 : 1;
    
    // 计算卡路里（千卡）
    // 公式: 卡路里 = MET * 体重(kg) * 时间(小时) * 坡度因子
    const caloriesBase = (MET * weight * (duration / 3600));
    const caloriesWithElevation = caloriesBase * elevationFactor; 
    
    return Math.round(caloriesWithElevation);
  },

  // 计算轨迹总距离
  calculateTotalDistance(locations) {
    let total = 0;
    for (let i = 1; i < locations.length; i++) {
      total += this.calculateDistance(
        locations[i-1].latitude,
        locations[i-1].longitude,
        locations[i].latitude,
        locations[i].longitude
      );
    }
    return total;
  },

  // 显示语音设置面板
  showVoiceSettings() {
    const itemList = [
      '调整播报间隔', 
      '选择播报内容',
      this.data.voiceSettings.enabled ? '关闭语音播报' : '开启语音播报'
    ];
    
    wx.showActionSheet({
      itemList,
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.showIntervalPicker();
            break;
          case 1:
            this.showItemSelector();
            break;
          case 2:
            // 切换语音播报状态
            const newEnabled = !this.data.voiceSettings.enabled;
            this.setData({
              'voiceSettings.enabled': newEnabled
            });
            // 保存设置
            wx.setStorageSync('voiceSettings', this.data.voiceSettings);
            // 播报状态变化
            if (newEnabled) {
              this.textToSpeech('语音播报已开启');
              // 如果正在运动，重新设置语音播报定时器
              if (this.data.isRunning && !this.voiceTimer) {
                this.voiceTimer = setInterval(() => {
                  this.speakStatus();
                }, this.data.voiceSettings.interval * 60 * 1000);
              }
            } else {
              wx.showToast({
                title: '已关闭语音播报',
                icon: 'none'
              });
              // 清除语音播报定时器
              if (this.voiceTimer) {
                clearInterval(this.voiceTimer);
                this.voiceTimer = null;
              }
            }
            break;
        }
      }
    });
  },

  // 显示间隔选择器
  showIntervalPicker() {
    wx.showActionSheet({
      itemList: ['每1分钟', '每3分钟', '每5分钟', '每10分钟'],
      success: (res) => {
        const intervals = [1, 3, 5, 10];
        this.setData({
          'voiceSettings.interval': intervals[res.tapIndex]
        });
        wx.setStorageSync('voiceSettings', this.data.voiceSettings);
        wx.showToast({
          title: `已设置${intervals[res.tapIndex]}分钟播报`,
          icon: 'none'
        });
      }
    });
  },

  // 显示播报内容选择器
  showItemSelector() {
    const items = this.data.voiceSettings.items;
    wx.showModal({
      title: '选择播报内容',
      content: '请在下方选择需要播报的内容',
      showCancel: false,
      success: () => {
        wx.showActionSheet({
          itemList: [
            `${items.distance ? '✓ ' : ''}距离`,
            `${items.pace ? '✓ ' : ''}配速`,
            `${items.duration ? '✓ ' : ''}时长`,
            `${items.calories ? '✓ ' : ''}卡路里`
          ],
          success: (res) => {
            const keys = ['distance', 'pace', 'duration', 'calories'];
            const key = keys[res.tapIndex];
            this.setData({
              [`voiceSettings.items.${key}`]: !items[key]
            });
            wx.setStorageSync('voiceSettings', this.data.voiceSettings);
          }
        });
      }
    });
  },

  // 添加日期格式化方法
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}/${month}/${day} ${hours}:${minutes}`; // 例如：2024/03/21 15:30
  },

  // 添加音频错误处理方法
  handleAudioError() {
    this.audioRetryCount++;
    if (this.audioRetryCount <= this.maxRetries) {
      console.log(`重试播放音频 (${this.audioRetryCount}/${this.maxRetries})`);
      setTimeout(() => this.playNextAudio(), 500);
    } else {
      console.error('音频播放失败次数过多，跳过当前音频');
      this.isPlaying = false;
      this.audioRetryCount = 0;
      this.playNextAudio(); // 尝试播放下一条
    }
  },

  // 添加时长语音播报格式化方法
  formatDurationToSpeak(seconds) {
    if (!seconds) return '0分钟';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    let text = '';
    if (hours > 0) {
      text += `${hours}小时`;
    }
    if (minutes > 0 || hours > 0) {
      text += `${minutes}分钟`;
    }
    if (secs > 0 && hours === 0) { // 只在没有小时的情况下报秒数
      text += `${secs}秒`;
    }
    return text || '0分钟';
  },

  // 添加定时器清理方法
  clearTimers() {
    if (this.data.countdownTimer) {
      clearInterval(this.data.countdownTimer);
      this.setData({ countdownTimer: null });
    }

    if (this.voiceTimer) {
      clearInterval(this.voiceTimer);
      this.voiceTimer = null;
    }

    if (this.audioLoadTimeout) {
      clearTimeout(this.audioLoadTimeout);
      this.audioLoadTimeout = null;
    }
    
    if (this.gpsQualityTimer) {
      clearInterval(this.gpsQualityTimer);
      this.gpsQualityTimer = null;
    }
    
    if (this.data.resumeCountdown && this.data.resumeCountdown.timer) {
      clearInterval(this.data.resumeCountdown.timer);
      this.setData({
        'resumeCountdown.timer': null
      });
    }
    
    // 安全地清理音频资源
    try {
      if (this.audioContext) {
        if (typeof this.audioContext.stop === 'function') {
          this.audioContext.stop();
        }
        if (typeof this.audioContext.destroy === 'function') {
          this.audioContext.destroy();
        }
        this.audioContext = null;
      }
    } catch (error) {
      console.warn('清理音频上下文失败:', error);
    }
  },

  // 完成训练前优化轨迹
  optimizeTrackBeforeComplete() {
    const { locations } = this.data;
    
    if (locations.length < 3) {
      return; // 不足3个点无法优化
    }
    
    // 应用Ramer-Douglas-Peucker算法简化轨迹
    const simplifiedLocations = this.simplifyTrack(locations, 0.00001);
    
    // 更新地图轨迹
    const polylinePoints = simplifiedLocations.map(loc => ({
      latitude: loc.latitude,
      longitude: loc.longitude
    }));
    
    // 更新状态
    this.setData({
      'mapData.polyline[0].points': polylinePoints
    });
    
    console.log(`轨迹优化: 从${locations.length}个点简化到${simplifiedLocations.length}个点`);
  },
  
  // 使用Ramer-Douglas-Peucker算法简化轨迹
  simplifyTrack(points, epsilon) {
    if (points.length <= 2) {
      return points;
    }
    
    // 查找最大距离点
    let maxDistance = 0;
    let maxDistanceIndex = 0;
    
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    
    for (let i = 1; i < points.length - 1; i++) {
      const distance = this.perpendicularDistance(
        points[i], 
        firstPoint, 
        lastPoint
      );
      
      if (distance > maxDistance) {
        maxDistance = distance;
        maxDistanceIndex = i;
      }
    }
    
    // 如果最大距离大于阈值，递归简化
    if (maxDistance > epsilon) {
      // 递归处理两部分
      const firstPart = this.simplifyTrack(
        points.slice(0, maxDistanceIndex + 1), 
        epsilon
      );
      
      const secondPart = this.simplifyTrack(
        points.slice(maxDistanceIndex), 
        epsilon
      );
      
      // 合并结果（去除重复点）
      return [...firstPart.slice(0, -1), ...secondPart];
    } else {
      // 如果所有点都在阈值内，只保留首尾点
      return [firstPoint, lastPoint];
    }
  },
  
  // 计算点到线段的垂直距离
  perpendicularDistance(point, lineStart, lineEnd) {
    const lat1 = lineStart.latitude;
    const lon1 = lineStart.longitude;
    const lat2 = lineEnd.latitude;
    const lon2 = lineEnd.longitude;
    const lat3 = point.latitude;
    const lon3 = point.longitude;
    
    // 如果线段长度为0，返回点到起点的距离
    if (lat1 === lat2 && lon1 === lon2) {
      return calculateHaversineDistance(lat1, lon1, lat3, lon3);
    }
    
    // 计算线段长度
    const lineLength = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    
    // 计算叉积面积
    const area = Math.abs(
      (lat1 * (lon2 - lon3) + lat2 * (lon3 - lon1) + lat3 * (lon1 - lon2)) / 2
    );
    
    // 计算垂直距离
    return (2 * area) / lineLength;
  },

  // 切换调试面板显示状态
  toggleDebugPanel() {
    this.setData({
      showDebugPanel: !this.data.showDebugPanel
    });
  },

  // 更新运动数据处理方法
  handleLocationChange(location) {
    if (!this.data.isRunning || this.data.isPaused) return;
    
    const now = Date.now();
    const runningData = { ...this.data.runningData };
    
    // 更新基础数据
    this.updateBasicMetrics(location, runningData, now);
    
    // 更新步频数据
    this.updateCadenceStats(runningData, now);
    
    // 更新配速数据
    this.updatePaceStats(runningData, now);
    
    // 更新心率区间
    this.updateHeartRateZones(runningData, now);
    
    // 更新步态数据
    this.updateStrideData(runningData, now);
    
    // 更新平衡数据
    this.updateBalanceData(runningData, now);
    
    // 更新海拔数据
    this.updateElevationData(location, runningData);
    
    // 更新训练效果
    this.updateTrainingEffect(runningData);
    
    // 更新环境数据
    this.updateEnvironmentData(runningData);
    
    this.setData({ runningData });
  },
  
  // 更新基础指标
  updateBasicMetrics(location, runningData, now) {
    // 原有的基础指标更新逻辑
    // ... existing code ...
  },
  
  // 更新步频统计
  updateCadenceStats(runningData, now) {
    try {
      const cadenceHistory = runningData.cadenceHistory || [];
      const currentCadence = runningData.cadence;
      
      // 只记录有效的步频数据（60-200步/分钟）
      if (currentCadence >= 60 && currentCadence <= 200) {
        cadenceHistory.push({
          timestamp: now,
          cadence: currentCadence
        });
        
        // 只保留最近30分钟的数据
        const thirtyMinutesAgo = now - 30 * 60 * 1000;
        while (cadenceHistory.length > 0 && cadenceHistory[0].timestamp < thirtyMinutesAgo) {
          cadenceHistory.shift();
        }
        
        // 计算平均步频
        if (cadenceHistory.length > 0) {
          const avgCadence = cadenceHistory.reduce((sum, record) => sum + record.cadence, 0) / cadenceHistory.length;
          runningData.avgCadence = Math.round(avgCadence);
        }
        
        // 计算步频区间分布
        const cadenceZones = {
          '140以上': 0,
          '130-140': 0,
          '120-130': 0,
          '110-120': 0,
          '100-110': 0,
          '90-100': 0,
          '90以下': 0
        };
        
        cadenceHistory.forEach(record => {
          const cadence = record.cadence;
          if (cadence > 140) cadenceZones['140以上']++;
          else if (cadence > 130) cadenceZones['130-140']++;
          else if (cadence > 120) cadenceZones['120-130']++;
          else if (cadence > 110) cadenceZones['110-120']++;
          else if (cadence > 100) cadenceZones['100-110']++;
          else if (cadence > 90) cadenceZones['90-100']++;
          else cadenceZones['90以下']++;
        });
        
        runningData.cadenceZones = cadenceZones;
      }
    } catch (error) {
      console.error('更新步频统计失败:', error);
    }
  },
  
  // 更新配速统计
  updatePaceStats(runningData, now) {
    try {
      const paceHistory = runningData.paceHistory || [];
      const currentPace = runningData.pace;
      
      // 只记录有效的配速数据
      if (currentPace > 0 && currentPace < 30) {
        paceHistory.push({
          timestamp: now,
          pace: currentPace
        });
        
        // 只保留最近30分钟的数据
        const thirtyMinutesAgo = now - 30 * 60 * 1000;
        while (paceHistory.length > 0 && paceHistory[0].timestamp < thirtyMinutesAgo) {
          paceHistory.shift();
        }
        
        // 计算平均配速
        if (paceHistory.length > 0) {
          const avgPace = paceHistory.reduce((sum, record) => sum + record.pace, 0) / paceHistory.length;
          runningData.avgPace = avgPace;
          runningData.avgPaceFormatted = this.formatPace(avgPace);
        }
        
        // 计算配速区间分布
        const paceZones = {
          '5:00以内': 0,
          '5:00-6:00': 0,
          '6:00-7:00': 0,
          '7:00-8:00': 0,
          '8:00-9:00': 0,
          '9:00-10:00': 0,
          '10:00以上': 0
        };
        
        paceHistory.forEach(record => {
          const pace = record.pace;
          if (pace < 5) paceZones['5:00以内']++;
          else if (pace < 6) paceZones['5:00-6:00']++;
          else if (pace < 7) paceZones['6:00-7:00']++;
          else if (pace < 8) paceZones['7:00-8:00']++;
          else if (pace < 9) paceZones['8:00-9:00']++;
          else if (pace < 10) paceZones['9:00-10:00']++;
          else paceZones['10:00以上']++;
        });
        
        runningData.paceZones = paceZones;
      }
    } catch (error) {
      console.error('更新配速统计失败:', error);
    }
  },
  
  // 更新心率区间
  updateHeartRateZones(runningData, now) {
    const hr = runningData.heartRate;
    if (hr > 0) {
      const zone = this.determineHeartRateZone(hr);
      runningData.heartRateZones[zone].time += 1;
      this.updateHeartRateZonePercentages(runningData);
    }
  },
  
  // 更新步态数据
  updateStrideData(runningData, now) {
    const strideLength = this.calculateStrideLength();
    if (strideLength > 0) {
      runningData.strideData.maxLength = Math.max(runningData.strideData.maxLength, strideLength);
      runningData.strideData.minLength = Math.min(runningData.strideData.minLength, strideLength);
      // 更新平均值
      const total = runningData.strideData.avgLength * (runningData.steps - 1) + strideLength;
      runningData.strideData.avgLength = total / runningData.steps;
    }
  },
  
  // 计算当前步幅
  calculateStrideLength() {
    const runningData = this.data.runningData;
    const sensorData = this.data.sensorData;
    
    // 如果没有足够的步数或距离，返回默认值
    if (!runningData || !sensorData || !sensorData.steps || sensorData.steps < 10 || !runningData.distance) {
      return 0.7; // 默认步幅
    }
    
    // 计算步幅 = 总距离 / 总步数
    const strideLength = runningData.distance / sensorData.steps;
    
    // 限制步幅在合理范围内（0.3米到2.5米）
    return Math.min(2.5, Math.max(0.3, strideLength));
  },
  
  // 计算当前左右平衡
  calculateCurrentBalance() {
    const sensorData = this.data.sensorData;
    
    // 如果没有加速度数据，返回默认平衡值
    if (!sensorData || !sensorData.acceleration) {
      return { left: 50, right: 50 };
    }
    
    // 使用加速度计数据估算左右平衡
    // 这里使用一个简单的算法，实际应用中可能需要更复杂的算法
    const { x } = sensorData.acceleration;
    
    // 根据横向加速度估算左右平衡
    // x值为正表示向右倾斜，为负表示向左倾斜
    let rightPercentage = 50 + (x * 10); // 简单线性映射
    
    // 确保百分比在合理范围内
    rightPercentage = Math.min(80, Math.max(20, rightPercentage));
    const leftPercentage = 100 - rightPercentage;
    
    return {
      left: Math.round(leftPercentage),
      right: Math.round(rightPercentage)
    };
  },
  
  // 更新平衡数据
  updateBalanceData(runningData, now) {
    const balance = this.calculateCurrentBalance();
    if (balance) {
      runningData.balance.chart.push({
        time: runningData.duration,
        left: balance.left,
        right: balance.right
      });
      runningData.balance.leftRight = `${balance.left}%/${balance.right}%`;
    }
  },
  
  // 更新海拔数据
  updateElevationData(location, runningData) {
    if (location.altitude) {
      runningData.elevationData.maxAltitude = Math.max(runningData.elevationData.maxAltitude, location.altitude);
      runningData.elevationData.minAltitude = Math.min(runningData.elevationData.minAltitude, location.altitude);
      
      // 计算爬升和下降
      if (this.lastAltitude) {
        const diff = location.altitude - this.lastAltitude;
        if (diff > 0) {
          runningData.elevationData.gain += diff;
        } else {
          runningData.elevationData.loss += Math.abs(diff);
        }
      }
      this.lastAltitude = location.altitude;
      
      runningData.elevationData.chart.push({
        distance: runningData.distance,
        altitude: location.altitude
      });
    }
  },
  
  // 更新训练效果
  updateTrainingEffect(runningData) {
    try {
      const intensity = this.calculateTrainingIntensity(runningData);
      const aerobicEffect = this.calculateAerobicEffect(intensity);
      const anaerobicEffect = this.calculateAnaerobicEffect(intensity);
      const trainingLoad = this.calculateTrainingLoad(intensity);
      const recoveryTime = this.estimateRecoveryTime(intensity);
      const vo2max = this.estimateVO2Max(runningData);

      // 更新训练效果数据
      runningData.trainingEffect = {
        intensity,
        aerobicEffect,
        anaerobicEffect,
        trainingLoad,
        recoveryTime,
        vo2max,
        timestamp: Date.now()
      };

      // 计算训练负荷趋势
      const loadTrend = this.calculateLoadTrend(runningData);
      runningData.trainingEffect.loadTrend = loadTrend;

      // 更新训练建议
      runningData.trainingEffect.suggestions = this.generateTrainingSuggestions(
        runningData.trainingEffect
      );

      console.log('训练效果分析:', {
        intensity: intensity.toFixed(1),
        aerobicEffect: aerobicEffect.toFixed(1),
        anaerobicEffect: anaerobicEffect.toFixed(1),
        trainingLoad: trainingLoad.toFixed(1),
        recoveryTime: recoveryTime + '小时',
        vo2max: vo2max.toFixed(1)
      });
    } catch (error) {
      console.error('更新训练效果失败:', error);
    }
  },

  // 计算训练强度
  calculateTrainingIntensity(runningData) {
    try {
      const { pace, cadence, duration } = runningData;
      if (!pace || !cadence || !duration) return 0;

      // 基于配速的强度因子
      const paceFactor = Math.max(0, 1 - (pace - 5) / 10); // 5分配速为1，15分配速为0

      // 基于步频的强度因子
      const cadenceFactor = Math.min(1, (cadence - 90) / 50); // 90步频为0，140步频为1

      // 基于持续时间的疲劳因子
      const durationFactor = Math.max(0, 1 - (duration - 30) / 120); // 30分钟为1，150分钟为0

      // 综合计算训练强度（0-1）
      const intensity = (paceFactor * 0.5 + cadenceFactor * 0.3 + durationFactor * 0.2);
      return Math.max(0, Math.min(1, intensity));
    } catch (error) {
      console.error('计算训练强度失败:', error);
      return 0;
    }
  },

  // 计算有氧效果
  calculateAerobicEffect(intensity) {
    // 有氧效果与训练强度呈正相关，但存在边际效应
    return Math.pow(intensity, 0.8) * 5; // 0-5分
  },

  // 计算无氧效果
  calculateAnaerobicEffect(intensity) {
    // 无氧效果在较高强度时更明显
    return Math.pow(intensity, 1.2) * 3; // 0-3分
  },

  // 计算训练负荷
  calculateTrainingLoad(intensity) {
    // 训练负荷与强度呈指数关系
    return Math.pow(intensity, 1.5) * 100; // 0-100
  },

  // 估算恢复时间
  estimateRecoveryTime(intensity) {
    // 恢复时间与训练负荷呈正相关
    return Math.round(intensity * 24); // 0-24小时
  },

  // 估算最大摄氧量
  estimateVO2Max(runningData) {
    try {
      const { pace, duration } = runningData;
      if (!pace || !duration) return 0;

      // 基于配速和持续时间的简单VO2max估算
      // 这个公式是一个简化版本，实际应用中可能需要更复杂的模型
      const baseVO2max = 40; // 基础VO2max值
      const paceFactor = Math.max(0, 1 - (pace - 5) / 10); // 5分配速为1，15分配速为0
      const durationFactor = Math.min(1, duration / 60); // 1小时为1

      return baseVO2max + (paceFactor * 20) + (durationFactor * 10); // 40-70 ml/kg/min
    } catch (error) {
      console.error('估算最大摄氧量失败:', error);
      return 0;
    }
  },

  // 计算训练负荷趋势
  calculateLoadTrend(runningData) {
    try {
      const loadHistory = runningData.loadHistory || [];
      const currentLoad = runningData.trainingEffect.trainingLoad;

      // 添加当前负荷
      loadHistory.push({
        timestamp: Date.now(),
        load: currentLoad
      });

      // 只保留最近7天的数据
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      while (loadHistory.length > 0 && loadHistory[0].timestamp < sevenDaysAgo) {
        loadHistory.shift();
      }

      // 计算趋势
      if (loadHistory.length >= 2) {
        const recentLoads = loadHistory.slice(-3);
        const trend = recentLoads.reduce((sum, record, index) => 
          sum + (record.load * (index + 1)), 0) / 6;
        
        return {
          value: trend,
          direction: trend > currentLoad ? 'decreasing' : 'increasing',
          history: loadHistory
        };
      }

      return {
        value: currentLoad,
        direction: 'stable',
        history: loadHistory
      };
    } catch (error) {
      console.error('计算训练负荷趋势失败:', error);
      return null;
    }
  },

  // 生成训练建议
  generateTrainingSuggestions(trainingEffect) {
    const suggestions = [];
    const { intensity, aerobicEffect, anaerobicEffect, trainingLoad, recoveryTime } = trainingEffect;

    // 基于训练强度的建议
    if (intensity > 0.8) {
      suggestions.push({
        type: 'intensity',
        level: 'high',
        message: '本次训练强度较高，建议适当降低配速或缩短训练时间'
      });
    } else if (intensity < 0.3) {
      suggestions.push({
        type: 'intensity',
        level: 'low',
        message: '本次训练强度较低，可以适当提高配速或增加训练时间'
      });
    }

    // 基于有氧效果的建议
    if (aerobicEffect > 4) {
      suggestions.push({
        type: 'aerobic',
        level: 'high',
        message: '有氧效果很好，建议保持当前训练计划'
      });
    }

    // 基于无氧效果的建议
    if (anaerobicEffect > 2) {
      suggestions.push({
        type: 'anaerobic',
        level: 'high',
        message: '无氧效果明显，建议在下次训练中增加恢复时间'
      });
    }

    // 基于恢复时间的建议
    if (recoveryTime > 12) {
      suggestions.push({
        type: 'recovery',
        level: 'high',
        message: `需要${recoveryTime}小时恢复，建议适当休息后再进行高强度训练`
      });
    }

    return suggestions;
  },
  
  // 更新环境数据
  updateEnvironmentData(runningData) {
    // 微信小程序没有直接的天气API，这里使用模拟数据
    runningData.environmentData = {
      temperature: '25°C',
      humidity: '65%',
      pressure: '1013hPa',
      uvIndex: '中等',
      windSpeed: '3.5km/h',
      windDirection: '东北'
    };
    
    // 也可以考虑使用第三方天气API
    // 例如：调用自己的服务器API，然后服务器去请求天气数据
    // 或者不显示这部分数据
  },
  
  // 保存运动记录时的处理
  saveExerciseRecord() {
    try {
      const runningData = this.data.runningData;
      const sensorData = this.data.sensorData;
      const gpsQuality = this.data.gpsQuality;
      
      // 格式化运动记录
      const exerciseRecord = this.formatExerciseRecord();
      
      // 添加传感器融合和陀螺仪相关数据
      exerciseRecord.fusionData = {
        usingFusedDistance: runningData.usingFusedDistance || false,
        usingGyroCorrection: runningData.usingGyroCorrection || false,
        learnedStrideLength: this.learnedStrideLength || 0,
        detectedEnvironment: this.environmentState ? this.environmentState.detectedEnvironment : 'normal'
      };
      
      // 添加更详细的传感器数据
      exerciseRecord.sensorDetails = {
        accelerometer: sensorData.acceleration,
        gyroscope: sensorData.gyroscope,
        heading: sensorData.heading,
        weRunSteps: sensorData.weRunSteps
      };
      
      // 保存记录到缓存或数据库
      console.log('保存运动记录:', exerciseRecord);
      
      // 使用dataService保存记录
      const savedRecord = dataService.saveExerciseRecord(exerciseRecord);
      
      // 显示成功提示
      wx.showToast({
        title: '运动记录已保存',
        icon: 'success',
        duration: 2000
      });
      
      // 延迟返回
      setTimeout(() => {
        wx.navigateBack({
          delta: 1,
          fail: (err) => {
            console.error('返回失败:', err);
            wx.switchTab({
              url: '/pages/index/index'
            });
          }
        });
      }, 2000);
      
    } catch (error) {
      console.error('保存运动记录失败:', error);
      wx.showToast({
        title: '保存记录失败',
        icon: 'none',
        duration: 2000
      });
    }
  },
  
  // 格式化运动记录
  formatExerciseRecord() {
    const runningData = this.data.runningData;
    const locations = runningData.locations || [];
    
    // 创建友好的日期格式
    const now = new Date();
    let formattedDate;
    
    try {
      if (dataService && typeof dataService.formatDateTime === 'function') {
        formattedDate = dataService.formatDateTime(now);
      } else {
        // 备用方法：手动格式化日期
        formattedDate = this.formatDateToFriendly(now);
      }
    } catch (error) {
      console.error('获取dataService失败，使用备用日期格式化:', error);
      formattedDate = this.formatDateToFriendly(now);
    }
    
    return {
      id: Date.now(),
      name: '跑步',
      date: formattedDate,
      timestamp: Date.now(),
      duration: runningData.duration,
      totalDuration: runningData.duration,
      durationFormatted: runningData.durationFormatted,
      distance: runningData.distance,
      totalDistance: runningData.distance,
      displayDistance: runningData.distanceFormatted,
      calories: runningData.calories,
      type: 'running',
      avgPace: runningData.avgPace,
      avgPaceFormatted: runningData.avgPaceFormatted,
      avgCadence: this.data.sensorData.cadence,
      cadenceStats: runningData.cadenceStats || { max: 0, min: 0, chart: [] },
      paceStats: runningData.paceStats || { max: 0, min: 0, chart: [] },
      heartRateZones: runningData.heartRateZones || { easy: 0, moderate: 0, intense: 0, maximum: 0 },
      strideData: runningData.strideData || { maxLength: 0, minLength: 0, avgLength: 0 },
      balance: runningData.balance || { leftRight: '50/50' },
      elevationData: runningData.elevationData || { gain: 0, loss: 0, max: 0, min: 0 },
      trainingEffect: runningData.trainingEffect || { aerobic: 0, anaerobic: 0 },
      environmentData: runningData.environmentData || { temperature: '--', humidity: '--', condition: '未知' },
      kmPaces: runningData.kmPaces || [],
      trackPoints: locations.map(loc => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        speed: loc.speed,
        timestamp: loc.timestamp,
        accuracy: loc.accuracy
      })),
      polyline: [{
        points: locations.map(loc => ({
          latitude: loc.latitude,
          longitude: loc.longitude
        })),
        color: "#FF0000DD",
        width: 4,
        arrowLine: true
      }],
      markers: this.generateMarkers(locations),
      // 添加传感器融合和GPS质量数据
      gpsQuality: {
        signal: this.data.gpsQuality.signal,
        accuracy: this.data.gpsQuality.accuracy,
        accuracyRate: this.data.gpsQuality.accuracyRate
      }
    };
  },

  /**
   * 高级传感器融合策略 - 结合GPS和步数数据
   * 动态调整权重以获得最准确的轨迹和距离估计
   */
  advancedSensorFusion() {
    try {
      const now = Date.now();
      const sensorData = this.data.sensorData;
      const runningData = this.data.runningData;
      const gpsQuality = this.data.gpsQuality;

      // 计算各个传感器的可靠性权重
      const gpsReliability = this.calculateGPSReliability();
      const stepReliability = this.calculateStepReliability();
      const gyroReliability = this.calculateGyroReliability();

      // 计算融合后的距离
      let fusedDistance = runningData.distance;
      let fusionMethod = 'gps';

      if (gpsQuality.signal === 'poor') {
        // GPS信号差时，主要依赖步数和陀螺仪
        const stepDistance = this.calculateStepBasedDistance(5); // 使用5秒的数据
        const gyroDistance = this.calculateGyroBasedDistance(5);

        if (stepDistance > 0 && gyroDistance > 0) {
          fusedDistance = stepDistance * 0.7 + gyroDistance * 0.3;
          fusionMethod = 'step_gyro';
        } else if (stepDistance > 0) {
          fusedDistance = stepDistance;
          fusionMethod = 'step';
        } else if (gyroDistance > 0) {
          fusedDistance = gyroDistance;
          fusionMethod = 'gyro';
        }
      }

      // 更新融合后的数据
      const updatedRunningData = {
        ...runningData,
        distance: fusedDistance,
        distanceFormatted: (fusedDistance / 1000).toFixed(2),
        filteredDistanceKm: (fusedDistance / 1000).toFixed(2)
      };

      // 更新调试信息
      const debugInfo = {
        ...this.data.debugInfo,
        fusion: {
          gpsDistance: (runningData.distance / 1000).toFixed(2),
          stepDistance: (this.calculateStepBasedDistance(5) / 1000).toFixed(2),
          gyroDistance: (this.calculateGyroBasedDistance(5) / 1000).toFixed(2),
          fusedDistance: (fusedDistance / 1000).toFixed(2),
          gpsReliability: `${(gpsReliability * 100).toFixed(1)}%`,
          stepReliability: `${(stepReliability * 100).toFixed(1)}%`,
          gyroReliability: `${(gyroReliability * 100).toFixed(1)}%`,
          fusionMethod,
          environment: gpsQuality.signal,
          gyroCorrection: `${(this.gyroData?.cumulativeAngle || 0).toFixed(1)}°`
        }
      };

      this.setData({
        runningData: updatedRunningData,
        debugInfo
      });

      console.log('传感器融合完成:', {
        gpsReliability,
        stepReliability,
        gyroReliability,
        fusionMethod,
        fusedDistance: (fusedDistance / 1000).toFixed(2)
      });

    } catch (error) {
      console.error('传感器融合失败:', error);
    }
  },

  // 计算GPS可靠性
  calculateGPSReliability() {
    const gpsQuality = this.data.gpsQuality;
    if (!gpsQuality || !gpsQuality.accuracyHistory) {
      return 0;
    }

    // 计算最近20个点的平均精度
    const recentAccuracies = gpsQuality.accuracyHistory.slice(-20);
    const avgAccuracy = recentAccuracies.reduce((sum, acc) => sum + acc, 0) / recentAccuracies.length;

    // 根据精度计算可靠性（0-1）
    if (avgAccuracy <= 10) return 1;
    if (avgAccuracy <= 20) return 0.8;
    if (avgAccuracy <= 50) return 0.6;
    if (avgAccuracy <= 100) return 0.4;
    return 0.2;
  },

  // 计算步数可靠性
  calculateStepReliability() {
    const sensorData = this.data.sensorData;
    if (!sensorData || !sensorData.stepInterval) {
      return 0;
    }

    // 计算步频的稳定性
    const intervals = sensorData.stepInterval.slice(-10);
    if (intervals.length < 2) return 0;

    // 计算步频的标准差
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);

    // 根据标准差计算可靠性（0-1）
    if (stdDev <= 50) return 1;
    if (stdDev <= 100) return 0.8;
    if (stdDev <= 200) return 0.6;
    if (stdDev <= 300) return 0.4;
    return 0.2;
  },

  // 计算陀螺仪可靠性
  calculateGyroReliability() {
    if (!this.gyroData) return 0;

    // 检查陀螺仪数据的稳定性
    const gyroStability = Math.abs(this.gyroData.cumulativeAngle) < 30;
    const dataFrequency = this.gyroData.lastTimestamp ? 
      (Date.now() - this.gyroData.lastTimestamp) < 100 : false;

    if (gyroStability && dataFrequency) return 1;
    if (gyroStability || dataFrequency) return 0.6;
    return 0.2;
  },

  // 基于步数计算距离
  calculateStepBasedDistance(timeDiff) {
    try {
      const sensorData = this.data.sensorData;
      if (!sensorData || !sensorData.steps || !sensorData.lastStepTime) {
        return 0;
      }

      // 计算步频（步/分钟）
      const cadence = this.calculateCurrentCadence();
      if (cadence <= 0) {
        return 0;
      }

      // 计算这段时间内的步数
      const stepsInPeriod = (cadence / 60) * timeDiff;
      
      // 获取当前步幅（米/步）
      let strideLength = this.calculateStrideLength();
      if (strideLength <= 0) {
        // 如果无法计算步幅，使用默认值
        strideLength = 0.7;
      }

      // 计算距离
      const distance = stepsInPeriod * strideLength;
      console.log(`基于步数计算距离: ${distance.toFixed(2)}m, 步频: ${cadence}, 步幅: ${strideLength.toFixed(2)}m`);
      
      return distance;
    } catch (error) {
      console.error('计算步数距离失败:', error);
      return 0;
    }
  },

  // 基于陀螺仪计算距离
  calculateGyroBasedDistance(timeDiff) {
    try {
      if (!this.gyroData || !this.gyroData.heading) {
        return 0;
      }

      // 获取当前速度（如果有）
      const currentSpeed = this.data.runningData.lastValidSpeed || 0;
      if (currentSpeed <= 0) {
        return 0;
      }

      // 计算基础距离
      let distance = currentSpeed * timeDiff;

      // 根据陀螺仪数据调整距离
      if (this.gyroData.cumulativeAngle) {
        // 如果检测到转向，根据转向角度调整距离
        const angleChange = Math.abs(this.gyroData.cumulativeAngle);
        if (angleChange > 5) { // 如果转向角度大于5度
          // 根据转向角度调整距离
          const adjustmentFactor = Math.cos(angleChange * Math.PI / 180);
          distance *= adjustmentFactor;
        }
      }

      console.log(`基于陀螺仪计算距离: ${distance.toFixed(2)}m, 速度: ${currentSpeed.toFixed(2)}m/s`);
      return distance;
    } catch (error) {
      console.error('计算陀螺仪距离失败:', error);
      return 0;
    }
  },

  // 初始化加速度计
  initAccelerometer() {
    try {
      // 先停止之前可能存在的加速度计实例
      wx.stopAccelerometer({
        complete: () => {
          // 检查设备是否支持加速度计
          wx.startAccelerometer({
            interval: 'game', // 游戏级频率，约为20ms一次
            success: () => {
              console.log('加速度计初始化成功');
              this.hasAccelerometer = true;
              
              // 监听加速度计数据变化
              wx.onAccelerometerChange((res) => {
                // 只在运动中且非暂停状态处理加速度计数据
                if (!this.data.isRunning || this.data.isPaused) return;
                
                this.handleAccelerometerData(res);
              });
            },
            fail: (err) => {
              console.error('加速度计初始化失败:', err);
              this.hasAccelerometer = false;
            }
          });
        }
      });
    } catch (error) {
      console.error('初始化加速度计出错:', error);
      this.hasAccelerometer = false;
    }
  },
  
  // 生成地图标记点
  generateMarkers(locations) {
    if (!locations || locations.length < 2) return [];
    
    const start = locations[0];
    const end = locations[locations.length - 1];
    
    return [
      {
        id: 0,
        latitude: start.latitude,
        longitude: start.longitude,
        iconPath: '/assets/images/start_marker.png',
        width: 32,
        height: 32
      },
      {
        id: 1,
        latitude: end.latitude,
        longitude: end.longitude,
        iconPath: '/assets/images/end_marker.png',
        width: 32,
        height: 32
      }
    ];
  },
    // 初始化微信运动步数授权
    initWeRunAuthorization() {
      wx.getSetting({
        success: (res) => {
          if (!res.authSetting['scope.werun']) {
            wx.authorize({
              scope: 'scope.werun',
              success: () => {
                console.log('微信运动步数授权成功');
                // 定时获取步数
                this.weRunTimer = setInterval(() => {
                  if (this.data.isRunning && !this.data.isPaused) {
                    this.getWeRunData();
                  }
                }, 30000); // 每30秒更新一次
              },
              fail: (err) => {
                console.error('微信运动步数授权失败', err);
              }
            });
          } else {
            // 已获得授权，可以直接使用
            this.weRunTimer = setInterval(() => {
              if (this.data.isRunning && !this.data.isPaused) {
                this.getWeRunData();
              }
            }, 30000); // 每30秒更新一次
          }
        }
      });
    },
    // 获取微信步数数据（需要用户授权）
getWeRunData() {
  wx.getWeRunData({
    success: (res) => {
      const encryptedData = res.encryptedData;
      const iv = res.iv;
      
      console.log('获取微信运动步数成功，准备发送到服务器解密', res);
      
      // 发送加密数据到服务器解密
      wx.request({
        url: 'https://您的服务器地址/api/decrypt-werun', // 替换为您的服务器解密接口
        method: 'POST',
        data: {
          encryptedData: encryptedData,
          iv: iv,
          sessionKey: wx.getStorageSync('sessionKey') // 需要在登录时保存sessionKey
        },
        success: (serverRes) => {
          if (serverRes.data && serverRes.data.stepInfoList && serverRes.data.stepInfoList.length > 0) {
            // 获取最新的步数记录
            const latestStepInfo = serverRes.data.stepInfoList[serverRes.data.stepInfoList.length - 1];
            const realStepCount = latestStepInfo.step;
            
            console.log('服务器解密成功，获取到真实步数:', realStepCount);
            
            // 更新步数
            const sensorData = { ...this.data.sensorData };
            
            // 记录初始步数，用于计算本次运动的实际步数增量
            if (!this.initialWeRunSteps) {
              this.initialWeRunSteps = realStepCount;
              sensorData.weRunSteps = 0; // 初始化为0
            } else {
              // 计算本次运动的实际步数（当前总步数 - 初始步数）
              sensorData.weRunSteps = realStepCount - this.initialWeRunSteps;
            }
            
            // 如果是第一次获取数据，则初始化
            if (!this.lastStepCountTime) {
              this.lastStepCountTime = Date.now();
              this.lastStepCount = realStepCount;
              sensorData.steps = sensorData.weRunSteps; // 使用相对步数
              // 不立即计算步频，等待下次更新
            } else {
              // 计算最近一段时间的步数变化
              const currentTime = Date.now();
              const timeDiff = (currentTime - this.lastStepCountTime) / 1000; // 转换为秒
              const stepsDiff = realStepCount - this.lastStepCount;
              
              // 更新总步数（使用相对步数）
              sensorData.steps = sensorData.weRunSteps;
              
              // 仅在有步数变化时更新步频
              if (stepsDiff > 0 && timeDiff > 0) {
                // 计算每分钟步数 (步数差 / 时间差(秒) * 60)
                const cadence = Math.round((stepsDiff / timeDiff) * 60);
                
                // 检查计算的步频是否在合理范围内 (60-240步/分钟)
                if (cadence >= 60 && cadence <= 240) {
                  sensorData.cadence = cadence;
                  console.log(`步频计算: ${stepsDiff}步 / ${timeDiff.toFixed(1)}秒 = ${cadence}步/分钟`);
                }
              }
              
              // 更新上次记录的值
              this.lastStepCount = realStepCount;
              this.lastStepCountTime = currentTime;
            }
            
            // 更新传感器数据
            this.setData({ sensorData });
            
            // 调用高级传感器融合
            this.advancedSensorFusion();
          } else {
            console.error('服务器返回的步数数据格式不正确', serverRes);
          }
        },
        fail: (err) => {
          console.error('服务器解密步数数据失败', err);
          
          // 服务器解密失败时，可以选择使用本地模拟数据作为备选方案
          this.useLocalMockStepData();
        }
      });
    },
    fail: (err) => {
      console.error('获取微信运动数据失败', err);
      
      // 获取失败时，可以选择使用本地模拟数据作为备选方案
      this.useLocalMockStepData();
    }
  });
},

  // 使用本地模拟步数数据（仅作为备选方案）
  useLocalMockStepData() {
    // 使用固定增量而不是随机值
    const fixedStepIncrement = 20; // 每次固定增加20步
    const mockStepCount = this.lastMockStepCount ? this.lastMockStepCount + fixedStepIncrement : 0;
    this.lastMockStepCount = mockStepCount;
    
    // 更新步数
    const sensorData = { ...this.data.sensorData };
    
    // 记录初始步数，用于计算本次运动的实际步数增量
    if (!this.initialWeRunSteps) {
      this.initialWeRunSteps = mockStepCount;
      sensorData.weRunSteps = 0; // 初始化为0
    } else {
      // 计算本次运动的实际步数（当前总步数 - 初始步数）
      sensorData.weRunSteps = mockStepCount - this.initialWeRunSteps;
    }
    
    // 如果是第一次获取数据，则初始化
    if (!this.lastStepCountTime) {
      this.lastStepCountTime = Date.now();
      this.lastStepCount = mockStepCount;
      sensorData.steps = sensorData.weRunSteps; // 使用相对步数
    } else {
      // 计算最近一段时间的步数变化
      const currentTime = Date.now();
      const timeDiff = (currentTime - this.lastStepCountTime) / 1000; // 转换为秒
      const stepsDiff = mockStepCount - this.lastStepCount;
      
      // 更新总步数（使用相对步数）
      sensorData.steps = sensorData.weRunSteps;
      
      // 仅在有步数变化时更新步频
      if (stepsDiff > 0 && timeDiff > 0) {
        // 计算每分钟步数 (步数差 / 时间差(秒) * 60)
        const cadence = Math.round((stepsDiff / timeDiff) * 60);
        
        // 检查计算的步频是否在合理范围内 (60-240步/分钟)
        if (cadence >= 60 && cadence <= 240) {
          sensorData.cadence = cadence;
          console.log(`步频计算(模拟): ${stepsDiff}步 / ${timeDiff.toFixed(1)}秒 = ${cadence}步/分钟`);
        }
      }
      
      // 更新上次记录的值
      this.lastStepCount = mockStepCount;
      this.lastStepCountTime = currentTime;
    }
    
    // 更新传感器数据
    this.setData({ sensorData });
    
    // 调用高级传感器融合
    this.advancedSensorFusion();
  },

  // 计算当前步频
  calculateCurrentCadence() {
    const sensorData = this.data.sensorData;
    
    // 如果已经有计算好的步频数据，直接返回
    if (sensorData.cadence && sensorData.cadence > 0) {
      return sensorData.cadence;
    }
    
    // 如果没有足够的步频间隔数据，返回0
    if (!sensorData.stepInterval || sensorData.stepInterval.length < 3) {
      return 0;
    }
    
    // 计算最近几步的平均间隔时间(毫秒)
    const recentIntervals = sensorData.stepInterval.slice(-5);
    const avgInterval = recentIntervals.reduce((sum, interval) => sum + interval, 0) / recentIntervals.length;
    
    // 计算步频(步/分钟) = 60秒 * 1000毫秒/秒 / 平均间隔(毫秒/步)
    const cadence = Math.round(60 * 1000 / avgInterval);
    
    // 确保步频在合理范围内(60-240步/分钟)
    if (cadence >= 60 && cadence <= 240) {
      return cadence;
    }
    
    return 0;
  },

  // 页面显示时调用
  onShow() {
    if (this.data.isRunning && !this.data.isPaused) {
      const now = Date.now();
      const lastActive = this.data.lastActiveTime;
      
      if (lastActive > 0) {
        // 计算锁屏时间
        const lockedTime = now - lastActive;
        if (lockedTime > 1000) { // 如果锁屏时间超过1秒
          // 更新锁屏时间记录
          this.setData({
            screenLockedTime: this.data.screenLockedTime + lockedTime
          });
          
          // 补偿运动时间
          this.setData({
            timeCompensation: this.data.timeCompensation + lockedTime
          });
          
          // 更新运动数据
          const runningData = this.data.runningData;
          runningData.duration += lockedTime / 1000;
          runningData.durationFormatted = this.formatDuration(runningData.duration);
          
          this.setData({
            runningData,
            lastActiveTime: now
          });
          
          console.log('锁屏时间补偿:', {
            lockedTime: (lockedTime / 1000).toFixed(1) + '秒',
            totalLockedTime: (this.data.screenLockedTime / 1000).toFixed(1) + '秒',
            totalCompensation: (this.data.timeCompensation / 1000).toFixed(1) + '秒'
          });
        }
      }
    }
  },

  // 页面隐藏时调用
  onHide() {
    if (this.data.isRunning && !this.data.isPaused) {
      this.setData({
        lastActiveTime: Date.now()
      });
    }
  },
}); 