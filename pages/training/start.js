// pages/training/start.js
const app = getApp()
const { dataService } = require('../../services/dataService')

Page({
  data: {
    trainingInfo: {
      name: '',
      duration: 0,
      type: ''
    },
    targetPace: '6\'00"/km', // 默认目标配速
    targetDistance: 3.0,     // 默认目标距离
    isDeviceConnected: false,
    deviceStatusText: '正在连接设备...',
    // 运动数据
    runningData: {
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
    },
    isRunning: false,     // 是否正在运动
    timer: null,          // 计时器
    dataCollectionTimer: null, // 数据采集定时器
    locations: [],        // 位置记录
    latitude: 39.908823,  // 默认纬度（北京）
    longitude: 116.397470, // 默认经度（北京）
    polyline: [],         // 轨迹线 - 初始化为空数组
    userWeight: 70,        // 默认用户体重(kg)，实际应从用户资料获取
    planId: null,          // 计划ID
    exerciseType: '',
    exerciseName: '',
    isRecording: false,
    startTime: null,
    currentTime: 0,
    location: null,
    stats: {
      distance: 0,
      calories: 0,
      steps: 0
    }
  },

  onLoad(options) {
    // 检查登录状态
    if (!app.checkLoginAndAuth()) {
      return;
    }

    const { type, name, duration, planId } = options;
    this.setData({
      'trainingInfo.type': type || '',
      'trainingInfo.name': name || '自由训练',
      'trainingInfo.duration': parseInt(duration) || 30,
      planId: planId || ''
    });

    // 获取位置信息
    this.getLocation();

    // 初始化跑步数据
    const initialData = {
      distance: 0,
      displayDistance: '0.00',
      duration: 0,
      durationFormatted: '00:00:00',
      calories: 0,
      currentPace: 0,
      currentPaceFormatted: '--\--',
      avgPace: 0,
      paceFormatted: '--\--',
      cadence: 0,
      avgCadence: 0,
      stride: 0,
      strideFormatted: '0.00',
      steps: 0
    };
    
    this.setData({
      runningData: initialData
    });

    // 获取初始位置
    this.getInitialLocation();

    // 连接设备
    this.connectDevice();
    
    // 创建地图上下文
    this.mapContext = wx.createMapContext('runningMap', this);
    
    // 尝试获取用户体重信息
    this.getUserWeight();
  },

  onReady() {
    // 页面渲染完成后，确保地图正确显示
    setTimeout(() => {
      this.mapContext.getScale({
        success: (res) => {
          console.log('地图当前缩放级别：', res.scale);
        }
      });
    }, 500);
  },

  onUnload() {
    // 页面卸载时清除所有定时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    
    if (this.data.dataCollectionTimer) {
      clearInterval(this.data.dataCollectionTimer);
    }
    
    // 如果正在运动，停止运动并保存数据
    if (this.data.isRunning) {
      this.stopExercise();
    }
    
    // 停止位置更新
    wx.stopLocationUpdate({
      complete: () => {
        // 取消位置变化监听
        wx.offLocationChange();
      }
    });
  },
  
  onHide() {
    // 页面隐藏时，如果不是后台运行模式，可以考虑暂停计时
    console.log('页面隐藏');
  },

  // 尝试获取用户体重信息
  getUserWeight() {
    try {
      const userInfo = app.getUserInfo();
      if (userInfo && userInfo.weight) {
        console.log('获取到用户体重:', userInfo.weight);
        this.setData({
          userWeight: userInfo.weight
        });
      } else {
        console.warn('未获取到用户体重信息，使用默认值');
        this.setData({
          userWeight: 70
        });
      }
    } catch (error) {
      console.error('获取用户体重信息失败:', error);
      this.setData({
        userWeight: 70
      });
    }
  },

  // 获取初始位置
  getInitialLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        const { latitude, longitude } = res;
        this.setData({
          latitude,
          longitude
        });
      },
      fail: (e) => {
        console.log("===>这是getInitialLocation的报错", e)
        wx.showToast({
          title: '获取位置信息失败',
          icon: 'none'
        });
      }
    });
  },

  // 连接设备
  async connectDevice() {
    try {
      // TODO: 实现设备连接逻辑
      setTimeout(() => {
        this.setData({
          isDeviceConnected: true,
          deviceStatusText: '设备已连接'
        });
      }, 2000);
    } catch (error) {
      console.error('设备连接失败:', error);
      this.setData({
        deviceStatusText: '设备连接失败，请重试'
      });
    }
  },

  // 开始运动
  onStart() {
    // 防止重复点击
    if (this.data.isRunning) {
      return;
    }
    
    // 重置运动数据和轨迹
    this.setData({
      isRunning: true,
      'runningData.duration': 0,
      'runningData.distance': 0,
      'runningData.displayDistance': '0.00',
      'runningData.calories': 0,
      'runningData.steps': 0,
      'runningData.cadence': 0,
      'runningData.avgCadence': 0,
      'runningData.stride': 0,
      'runningData.strideFormatted': '0.00',
      'runningData.currentPace': 0,
      'runningData.avgPace': 0,
      'runningData.currentPaceFormatted': '--\--',
      'runningData.paceFormatted': '--\--',
      'runningData.durationFormatted': '00:00:00',
      locations: [],
      // 初始化为一个空的轨迹线数组
      polyline: []
    });

    // 开始计时
    this.startTimer();
    // 开始获取位置
    this.startLocationUpdate();
    // 开始获取运动数据
    this.startDataCollection();

    wx.showToast({
      title: '开始运动',
      icon: 'success'
    });
    
    // 震动提示
    wx.vibrateShort({
      type: 'medium'
    });
  },

  // 取消运动
  onCancel() {
    if (this.data.isRunning) {
      wx.showModal({
        title: '提示',
        content: '确定要结束运动吗？',
        success: (res) => {
          if (res.confirm) {
            this.stopExercise();
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  },

  // 开始计时
  startTimer() {
    // 清除可能存在的旧定时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    
    this.data.timer = setInterval(() => {
      const runningData = this.data.runningData;
      runningData.duration = runningData.duration + 1;
      this.updateRunningData(runningData);
      
      // 检查是否达到目标时间
      if (runningData.duration >= this.data.trainingInfo.duration * 60) {
        wx.vibrateLong(); // 震动提醒
        wx.showToast({
          title: '已达到目标时间',
          icon: 'success',
          duration: 2000
        });
      }
    }, 1000);
  },

  // 开始位置更新
  startLocationUpdate() {
    // 检查用户是否已授权位置权限
    wx.getSetting({
      success: (res) => {
        // 如果未授权位置权限，则请求授权
        if (!res.authSetting['scope.userLocation']) {
          wx.authorize({
            scope: 'scope.userLocation',
            success: () => {
              this.startLocationUpdateAfterAuth();
            },
            fail: () => {
              wx.showModal({
                title: '需要位置权限',
                content: '需要您的位置权限才能记录运动轨迹，请在设置中开启',
                confirmText: '去设置',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting({
                      success: (settingRes) => {
                        if (settingRes.authSetting['scope.userLocation']) {
                          this.startLocationUpdateAfterAuth();
                        } else {
                          wx.showToast({
                            title: '未获得位置权限',
                            icon: 'none'
                          });
                        }
                      }
                    });
                  }
                }
              });
            }
          });
        } else {
          // 已授权，直接开始位置更新
          this.startLocationUpdateAfterAuth();
        }
      }
    });
  },

  // 授权后开始位置更新
  startLocationUpdateAfterAuth() {
    // 开始前台位置更新
    wx.startLocationUpdate({
      success: () => {
        console.log('成功开启前台位置更新');
        
        // 检查后台定位权限
        wx.getSetting({
          withSubscriptions: true,
          success: (res) => {
            // 检查是否有后台定位权限
            const hasBackgroundLocationAuth = 
              res.authSetting['scope.userLocationBackground'] || 
              (res.subscriptionsSetting && 
               res.subscriptionsSetting.mainSwitch && 
               res.subscriptionsSetting.itemSettings && 
               res.subscriptionsSetting.itemSettings['require-background-location'] === 'accept');
            
            if (hasBackgroundLocationAuth) {
              // 已有后台定位权限，直接开启
              this.startBackgroundLocationUpdate();
            } else {
              // 请求后台定位权限
              wx.showModal({
                title: '需要后台位置权限',
                content: '为了在小程序切到后台时也能记录运动轨迹，需要您授权后台位置权限',
                confirmText: '去授权',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting({
                      success: (settingRes) => {
                        if (settingRes.authSetting['scope.userLocationBackground']) {
                          this.startBackgroundLocationUpdate();
                        } else {
                          wx.showToast({
                            title: '仅记录前台运动轨迹',
                            icon: 'none'
                          });
                        }
                      }
                    });
                  }
                }
              });
            }
          }
        });
        
        // 监听位置变化
        wx.onLocationChange((location) => {
          if (!location || !location.latitude || !location.longitude) {
            console.error('位置数据无效:', location);
            return;
          }
          
          const { latitude, longitude } = location;
          
          // 更新当前位置
          this.setData({
            latitude,
            longitude
          });
          
          // 添加到位置记录
          const locations = [...this.data.locations];
          
          // 过滤无效位置点
          if (locations.length > 0) {
            const lastLocation = locations[locations.length - 1];
            // 如果新位置与上一个位置完全相同，可能是重复数据，跳过
            if (lastLocation.latitude === latitude && lastLocation.longitude === longitude) {
              return;
            }
            
            // 计算与上一个点的距离
            const distance = this.calculateDistance(
              lastLocation.latitude,
              lastLocation.longitude,
              latitude,
              longitude
            );
            
            // 如果距离过大（例如超过50米/秒，约180km/h），可能是GPS漂移，跳过
            if (distance > 50) {
              console.warn('检测到可能的GPS漂移，跳过此位置点');
              return;
            }
          }
          
          locations.push(location);
          
          // 如果有两个或更多位置点，创建轨迹线
          if (locations.length >= 2) {
            // 创建轨迹点数组
            const points = locations.map(loc => ({
              latitude: loc.latitude,
              longitude: loc.longitude
            }));
            
            // 创建新的轨迹线对象
            const newPolyline = [{
              points: points,
              color: '#1296db',
              width: 5,
              dottedLine: false,
              arrowLine: true
            }];
            
            // 更新数据
            this.setData({
              locations,
              polyline: newPolyline
            });
            
            // 计算距离
            this.updateDistance(locations);
          } else {
            // 只更新位置记录
            this.setData({ locations });
          }
        });
      },
      fail: (err) => {
        console.error('开启前台位置更新失败:', err);
        wx.showToast({
          title: '获取位置信息失败',
          icon: 'none'
        });
      }
    });
  },

  // 开启后台位置更新
  startBackgroundLocationUpdate() {
    wx.startLocationUpdateBackground({
      success: () => {
        console.log('成功开启后台位置更新');
      },
      fail: (err) => {
        console.error('开启后台位置更新失败:', err);
        wx.showToast({
          title: '后台位置更新失败，切到后台可能无法记录轨迹',
          icon: 'none',
          duration: 3000
        });
      }
    });
  },

  // 开始数据采集
  startDataCollection() {
    // 清除可能存在的旧定时器
    if (this.data.dataCollectionTimer) {
      clearInterval(this.data.dataCollectionTimer);
    }
    
    // 保存定时器ID以便在组件销毁时清除
    this.data.dataCollectionTimer = setInterval(() => {
      if (!this.data.isRunning) return;
      
      const runningData = this.data.runningData;
      // 更新步频（模拟数据）
      runningData.cadence = Math.floor(160 + Math.random() * 20);
      // 更新平均步频
      if (runningData.duration > 0) {
        runningData.avgCadence = Math.floor((runningData.avgCadence * (runningData.duration - 1) + runningData.cadence) / runningData.duration);
      } else {
        runningData.avgCadence = runningData.cadence;
      }
      
      // 更新步数 - 确保合理性
      runningData.steps = Math.floor(runningData.avgCadence * (runningData.duration / 60));
      
      // 更新步幅 - 添加合理性检查
      if (runningData.steps > 10) {
        // 限制步幅在合理范围内（0.3米到2.5米）
        runningData.stride = Math.min(2.5, Math.max(0.3, runningData.distance / runningData.steps));
      } else {
        // 默认步幅
        runningData.stride = 0.7;
      }
      
      // 更新卡路里 - 使用更精确的计算方法
      // MET值(代谢当量)：慢跑约为7，快跑约为12
      const MET = runningData.currentPace < 360 ? 12 : 7; // 配速小于6分钟/公里为快跑
      // 卡路里(kcal) = 体重(kg) × MET × 时间(小时)
      runningData.calories = Math.floor(this.data.userWeight * MET * (runningData.duration / 3600));

      this.updateRunningData(runningData);
    }, 1000);
  },

  // 更新距离
  updateDistance(locations) {
    if (locations.length < 2) return;
    
    const lastTwo = locations.slice(-2);
    const distance = this.calculateDistance(
      lastTwo[0].latitude,
      lastTwo[0].longitude,
      lastTwo[1].latitude,
      lastTwo[1].longitude
    );

    // 如果距离异常大，可能是GPS漂移，忽略此次更新
    if (distance > 50) { // 50米/秒，约180km/h
      console.warn('检测到可能的GPS漂移，忽略此次距离更新');
      return;
    }

    const runningData = this.data.runningData;
    runningData.distance += distance;
    // 更新显示距离（转换为公里并保留两位小数）
    runningData.displayDistance = (runningData.distance / 1000).toFixed(2);
    
    // 更新配速（分钟/公里）- 添加最小距离阈值
    const minDistance = 0.01; // 10米
    if (runningData.distance > minDistance * 1000 && runningData.duration > 0) {
      const paceInSeconds = (runningData.duration / (runningData.distance / 1000));
      // 限制配速在合理范围内（2分钟/公里到30分钟/公里）
      runningData.currentPace = Math.min(1800, Math.max(120, paceInSeconds));
      // 平均配速也使用相同的计算方法
      runningData.avgPace = runningData.currentPace;
    }

    this.updateRunningData(runningData);
  },

  // 计算两点之间距离
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // 地球半径（米）
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  },

  // 角度转弧度
  toRad(degree) {
    return degree * Math.PI / 180;
  },

  // 停止运动
  stopExercise() {
    this.setData({ isRunning: false });
    
    // 清除计时器
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.data.timer = null;
    }
    
    if (this.data.dataCollectionTimer) {
      clearInterval(this.data.dataCollectionTimer);
      this.data.dataCollectionTimer = null;
    }
    
    // 停止位置更新
    wx.stopLocationUpdate({
      success: () => {
        console.log('成功停止位置更新');
        // 取消位置变化监听
        wx.offLocationChange();
      },
      fail: (err) => {
        console.error('停止位置更新失败:', err);
      }
    });
    
    // 保存运动数据
    this.saveExerciseData();
    
    // 震动提示
    wx.vibrateLong({
      success: () => {
        console.log('震动提示成功');
      }
    });
  },

  // 保存运动数据
  saveExerciseData() {
    try {
      // 获取运动数据
      const runningData = this.data.runningData;
      
      // 创建运动记录对象
      const exerciseData = {
        name: this.data.trainingInfo.name || '跑步',
        date: new Date(), // 使用当前日期时间
        duration: runningData.duration,
        distance: runningData.distance,
        displayDistance: runningData.displayDistance,
        calories: runningData.calories,
        trackPoints: this.data.locations,
        type: 'running',
        avgPace: runningData.avgPace,
        avgPaceFormatted: runningData.paceFormatted,
        avgCadence: runningData.avgCadence
      };
      
      // 使用数据服务保存运动记录
      const dataService = require('../../services/dataService');
      const savedRecord = dataService.saveExerciseRecord(exerciseData);
      
      // 临时保存运动数据，用于完成页面展示
      wx.setStorageSync('tempRunningData', runningData);
      
      console.log('运动数据已保存:', savedRecord);
      return savedRecord;
    } catch (error) {
      console.error('保存运动数据失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
      return null;
    }
  },
  
  // 更新运动统计数据
  updateTrainingStats(exerciseData) {
    try {
      // 获取全局应用实例
      const app = getApp();
      // 获取训练统计数据的键名
      const statsKey = app.globalData.constants.STORAGE_KEYS.TRAINING_STATS;
      
      // 获取现有统计数据
      let stats = wx.getStorageSync(statsKey);
      
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
      stats.lastTrainingDate = new Date().toISOString();
      stats.trainingCount += 1;
      stats.totalDistance += exerciseData.distance;
      stats.totalDuration += exerciseData.duration;
      
      // 保存回存储
      wx.setStorageSync(statsKey, stats);
      
      console.log('运动统计数据已更新:', stats);
    } catch (error) {
      console.error('更新运动统计数据失败:', error);
    }
  },

  /**
   * 格式化配速
   * @param {number} pace 配速（秒/公里）
   * @returns {string} 格式化后的配速字符串
   */
  formatPace(pace) {
    if (!pace || isNaN(pace) || pace === Infinity) return '--\--';
    
    const paceMinutes = Math.floor(pace);
    const paceSeconds = Math.floor((pace - paceMinutes) * 60);
    
    return `${paceMinutes}'${paceSeconds < 10 ? '0' : ''}${paceSeconds}"`;
  },

  /**
   * 格式化时间
   * @param {number} duration 时间（秒）
   * @returns {string} 格式化后的时间字符串 HH:MM:SS
   */
  formatDuration(seconds) {
    if (!seconds || isNaN(seconds)) return '00:00:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const pad = (num) => (num < 10 ? '0' + num : num);
    
    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
  },

  /**
   * 更新跑步数据
   */
  updateRunningData: function(data) {
    // 添加格式化的实时配速
    data.currentPaceFormatted = this.formatPace(data.currentPace);
    // 添加格式化的平均配速
    data.paceFormatted = this.formatPace(data.avgPace);
    // 添加格式化的时间
    data.durationFormatted = this.formatDuration(data.duration);
    // 添加格式化的步幅
    data.strideFormatted = data.stride ? data.stride.toFixed(2) : '0.00';
    
    this.setData({
      runningData: data
    });
  },

  // 完成训练
  completeTraining() {
    try {
      // 保存运动数据
      this.saveExerciseData();
      
      // 更新训练计划进度
      const planId = this.data.planId;
      if (planId) {
        const dataService = require('../../services/dataService');
        const plans = dataService.getTrainingPlans();
        const plan = plans.find(p => p.id == planId);
        
        if (plan) {
          // 更新计划中所有运动的完成状态
          const updatedPlan = {
            ...plan,
            exercises: plan.exercises.map(exercise => ({
              ...exercise,
              completed: true
            })),
            progress: 100,
            completed: true
          };
          
          // 保存更新后的计划
          dataService.saveTrainingPlan(updatedPlan);
        }
      }
      
      // 跳转到训练完成页面
      wx.redirectTo({
        url: '/pages/training/complete'
      });
    } catch (error) {
      console.error('完成训练失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 获取位置信息
  getLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          location: {
            latitude: res.latitude,
            longitude: res.longitude
          }
        });
      },
      fail: () => {
        wx.showToast({
          title: '获取位置失败',
          icon: 'none'
        });
      }
    });
  },

  // 开始记录
  startRecording() {
    if (!this.data.location) {
      wx.showToast({
        title: '无法获取位置信息',
        icon: 'none'
      });
      return;
    }

    this.setData({
      isRecording: true,
      startTime: new Date(),
      currentTime: 0
    });

    // 开始计时
    const timer = setInterval(() => {
      this.setData({
        currentTime: this.data.currentTime + 1
      });
    }, 1000);

    this.setData({ timer });
  },

  // 暂停记录
  pauseRecording() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    this.setData({
      isRecording: false,
      timer: null
    });
  },

  // 继续记录
  resumeRecording() {
    if (!this.data.location) {
      wx.showToast({
        title: '无法获取位置信息',
        icon: 'none'
      });
      return;
    }

    const timer = setInterval(() => {
      this.setData({
        currentTime: this.data.currentTime + 1
      });
    }, 1000);

    this.setData({
      isRecording: true,
      timer
    });
  },

  // 结束记录
  async endRecording() {
    try {
      // 清除定时器
      if (this.data.timer) {
        clearInterval(this.data.timer);
      }

      // 计算运动数据
      const exerciseData = {
        type: this.data.exerciseType,
        name: this.data.exerciseName,
        duration: this.data.currentTime,
        startTime: this.data.startTime,
        endTime: new Date(),
        location: this.data.location,
        stats: this.data.stats,
        planId: this.data.planId
      };

      // 保存运动记录
      dataService.saveExerciseRecord(exerciseData);

      wx.showToast({
        title: '记录已保存',
        icon: 'success'
      });

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('保存运动记录失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  // 格式化时间
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
})