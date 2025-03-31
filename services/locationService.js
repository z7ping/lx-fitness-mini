/**
 * 位置服务模块
 * 处理位置权限、位置更新和轨迹记录等功能
 */
const exerciseUtils = require('../utils/exercise');

class LocationService {
  constructor() {
    this.locations = [];
    this.locationChangeCallback = null;
    this.isTracking = false;
  }

  /**
   * 获取初始位置
   * @returns {Promise} 位置信息的Promise
   */
  getInitialLocation() {
    return new Promise((resolve, reject) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          resolve(res);
        },
        fail: (err) => {
          console.error('获取位置信息失败:', err);
          reject(err);
        }
      });
    });
  }

  /**
   * 检查位置权限
   * @returns {Promise} 权限状态的Promise
   */
  checkLocationPermission() {
    return new Promise((resolve, reject) => {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.userLocation']) {
            resolve(true);
          } else {
            resolve(false);
          }
        },
        fail: (err) => {
          console.error('获取权限设置失败:', err);
          reject(err);
        }
      });
    });
  }

  /**
   * 请求位置权限
   * @returns {Promise} 授权结果的Promise
   */
  requestLocationPermission() {
    return new Promise((resolve, reject) => {
      wx.authorize({
        scope: 'scope.userLocation',
        success: () => {
          resolve(true);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  }

  /**
   * 打开设置页面
   * @returns {Promise} 设置结果的Promise
   */
  openLocationSettings() {
    return new Promise((resolve) => {
      wx.showModal({
        title: '需要位置权限',
        content: '需要您的位置权限才能记录运动轨迹，请在设置中开启',
        confirmText: '去设置',
        success: (res) => {
          if (res.confirm) {
            wx.openSetting({
              success: (settingRes) => {
                resolve(settingRes.authSetting['scope.userLocation']);
              },
              fail: () => {
                resolve(false);
              }
            });
          } else {
            resolve(false);
          }
        }
      });
    });
  }

  /**
   * 检查后台位置权限
   * @returns {Promise} 后台权限状态的Promise
   */
  checkBackgroundLocationPermission() {
    return new Promise((resolve) => {
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
          
          resolve(hasBackgroundLocationAuth);
        },
        fail: () => {
          resolve(false);
        }
      });
    });
  }

  /**
   * 请求后台位置权限
   * @returns {Promise} 授权结果的Promise
   */
  requestBackgroundLocationPermission() {
    return new Promise((resolve) => {
      wx.showModal({
        title: '需要后台位置权限',
        content: '为了在小程序切到后台时也能记录运动轨迹，需要您授权后台位置权限',
        confirmText: '去授权',
        success: (modalRes) => {
          if (modalRes.confirm) {
            wx.openSetting({
              success: (settingRes) => {
                resolve(settingRes.authSetting['scope.userLocationBackground']);
              },
              fail: () => {
                resolve(false);
              }
            });
          } else {
            resolve(false);
          }
        }
      });
    });
  }

  /**
   * 开始位置追踪
   * @param {Function} callback 位置变化回调函数
   * @returns {Promise} 追踪状态的Promise
   */
  async startTracking(callback) {
    if (this.isTracking) {
      return true;
    }

    this.locationChangeCallback = callback;
    this.locations = [];

    // 检查前台位置权限
    let hasPermission = await this.checkLocationPermission();
    
    if (!hasPermission) {
      hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        hasPermission = await this.openLocationSettings();
        if (!hasPermission) {
          wx.showToast({
            title: '未获得位置权限',
            icon: 'none'
          });
          return false;
        }
      }
    }

    // 开始前台位置更新
    return new Promise((resolve) => {
      wx.startLocationUpdate({
        success: async () => {
          console.log('成功开启前台位置更新');
          this.isTracking = true;
          
          // 检查后台位置权限
          const hasBackgroundPermission = await this.checkBackgroundLocationPermission();
          
          if (hasBackgroundPermission) {
            this.startBackgroundLocationUpdate();
          } else {
            const granted = await this.requestBackgroundLocationPermission();
            if (granted) {
              this.startBackgroundLocationUpdate();
            } else {
              wx.showToast({
                title: '仅记录前台运动轨迹',
                icon: 'none'
              });
            }
          }
          
          // 监听位置变化
          wx.onLocationChange(this.handleLocationChange.bind(this));
          
          resolve(true);
        },
        fail: (err) => {
          console.error('开启前台位置更新失败:', err);
          wx.showToast({
            title: '获取位置信息失败',
            icon: 'none'
          });
          resolve(false);
        }
      });
    });
  }

  /**
   * 开启后台位置更新
   */
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
  }

  /**
   * 处理位置变化
   * @param {Object} location 位置信息
   */
  handleLocationChange(location) {
    if (!location || !location.latitude || !location.longitude) {
      console.error('位置数据无效:', location);
      return;
    }
    
    const { latitude, longitude } = location;
    
    // 过滤无效位置点
    if (this.locations.length > 0) {
      const lastLocation = this.locations[this.locations.length - 1];
      // 如果新位置与上一个位置完全相同，可能是重复数据，跳过
      if (lastLocation.latitude === latitude && lastLocation.longitude === longitude) {
        return;
      }
      
      // 计算与上一个点的距离
      const distance = exerciseUtils.calculateDistance(
        lastLocation.latitude,
        lastLocation.longitude,
        latitude,
        longitude
      );
      
      // 如果距离过大，可能是GPS漂移，跳过
      if (exerciseUtils.isGpsDrift(distance)) {
        console.warn('检测到可能的GPS漂移，跳过此位置点');
        return;
      }
    }
    
    // 添加到位置记录
    this.locations.push(location);
    
    // 调用回调函数
    if (this.locationChangeCallback) {
      this.locationChangeCallback(this.locations);
    }
  }

  /**
   * 停止位置追踪
   */
  stopTracking() {
    if (!this.isTracking) {
      return;
    }
    
    this.isTracking = false;
    
    // 停止位置更新
    wx.stopLocationUpdate({
      complete: () => {
        // 取消位置变化监听
        wx.offLocationChange();
        console.log('成功停止位置更新');
      }
    });
  }

  /**
   * 获取当前位置记录
   * @returns {Array} 位置记录数组
   */
  getLocations() {
    return this.locations;
  }

  /**
   * 获取轨迹线数据
   * @returns {Array} 轨迹线数据
   */
  getPolyline() {
    if (this.locations.length < 2) {
      return [];
    }
    
    // 创建轨迹点数组
    const points = this.locations.map(loc => ({
      latitude: loc.latitude,
      longitude: loc.longitude
    }));
    
    // 创建轨迹线对象
    return [{
      points: points,
      color: '#1296db',
      width: 5,
      dottedLine: false,
      arrowLine: true
    }];
  }

  /**
   * 清除位置记录
   */
  clearLocations() {
    this.locations = [];
  }
}

module.exports = new LocationService(); 