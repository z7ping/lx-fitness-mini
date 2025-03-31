// app.js
const { dataService } = require('./services/dataService');
const utils = require('./utils/utils');
const { logService } = require('./services/logService');

App({
  towxml:require('/towxml/index'),
  globalData: {
    userInfo: null,
    systemInfo: null,
    version: '1.0.8',
    baseUrl: 'https://api.fitness-assistant.com',  // 后端服务地址
    // 开发模式标志，开发时设置为true，发布时设置为false
    isDevelopment: true,
    // 配置常量
    constants: {
      // 存储键名
      STORAGE_KEYS: {
        EXERCISE_RECORDS: 'exerciseRecords',
        TRAINING_STATS: 'trainingStats',
        USER_INFO: 'userInfo',
        BOUND_DEVICES: 'boundDevices',
        TRAINING_PLANS: 'trainingPlans',
        TRAINING_PLAN: 'trainingPlan',
        WEEKLY_PLAN: 'weeklyPlan',
        DIET_PLAN: 'dietPlan'
      },
      // 页面路径
      PAGES: {
        HOME: '/pages/home/index',
        PLAN: '/pages/plan/index',
        CHECKIN: '/pages/checkin/index',
        DASHBOARD: '/pages/dashboard/index',
        PROFILE: '/pages/profile/index'
      },
      // 周计划相关
      WEEK_PLAN: {
        DAYS: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        TYPES: {
          TRAINING: 'training',
          DIET: 'diet'
        }
      }
    },
    trainingStats: null,
    isLoggedIn: false,
    // 当前选中的tabBar索引，用于全局管理tabBar状态
    currentTabBarIndex: 0
  },

  onLaunch() {
    // 获取系统信息
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res;
        console.log("===>systemInfo===>", res);
      },
      fail: (err) => {
        console.error("获取系统信息失败：", err);
      }
    });

    // 初始化应用时加载用户信息和训练统计数据
    this.loadUserInfo();
    this.loadTrainingStats();
    
    // 检查更新
    this.checkUpdate();

    // 检查用户登录状态
    this.checkLoginStatus();
    
    // 初始化tabBar状态
    this.initTabBarState();
  },

  // 初始化tabBar状态
  initTabBarState() {
    try {
      // 获取启动页面路径
      const launchInfo = wx.getLaunchOptionsSync();
      if (launchInfo && launchInfo.path) {
        const path = launchInfo.path;
        
        // 根据路径设置初始tabBar状态
        if (path.includes('pages/home/')) {
          this.globalData.currentTabBarIndex = 0;
        } else if (path.includes('pages/exercise/')) {
          this.globalData.currentTabBarIndex = 1;
        } else if (path.includes('pages/profile/')) {
          this.globalData.currentTabBarIndex = 2;
        }
      }
    } catch (error) {
      console.error('初始化tabBar状态失败:', error);
    }
  },
  
  // 更新tabBar状态
  updateTabBarState(index) {
    if (typeof index === 'number' && index >= 0 && index <= 2) {
      this.globalData.currentTabBarIndex = index;
      
      // 尝试更新tabBar组件的状态
      this.updateTabBarComponent(index);
    }
  },
  
  // 尝试更新tabBar组件的状态
  updateTabBarComponent(index) {
    try {
      const pages = getCurrentPages();
      if (!pages || pages.length === 0) return;
      
      const currentPage = pages[pages.length - 1];
      if (!currentPage) return;
      
      // 获取自定义tabBar组件实例
      const tabBar = currentPage.getTabBar();
      if (tabBar && tabBar.setData) {
        tabBar.setData({
          active: index
        });
      }
    } catch (error) {
      console.error('更新tabBar组件状态失败:', error);
    }
  },

  onShow() {
    // 小程序切换到前台时的处理
  },

  onHide() {
    // 小程序切换到后台时的处理
  },

  // 检查小程序更新
  checkUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager();
      updateManager.onCheckForUpdate((res) => {
        if (res.hasUpdate) {
          updateManager.onUpdateReady(() => {
            wx.showModal({
              title: '更新提示',
              content: '新版本已经准备好，是否重启应用？',
              success: (res) => {
                if (res.confirm) {
                  updateManager.applyUpdate();
                }
              }
            });
          });
        }
      });
    }
  },

  /**
   * 加载用户信息
   */
  loadUserInfo() {
    try {
      const userInfo = dataService.getUserInfo();
      if (userInfo) {
        this.globalData.userInfo = userInfo;
        console.log('用户信息已加载:', userInfo);
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  },
  
  /**
   * 保存用户信息
   * @param {Object} userInfo 用户信息
   */
  saveUserInfo(userInfo) {
    try {
      dataService.saveUserInfo(userInfo);
      this.globalData.userInfo = userInfo;
      console.log('用户信息已保存:', userInfo);
    } catch (error) {
      console.error('保存用户信息失败:', error);
    }
  },
  
  /**
   * 加载训练统计数据
   */
  loadTrainingStats() {
    try {
      const stats = dataService.getTrainingStats();
      this.globalData.trainingStats = stats;
      console.log('训练统计数据已加载:', stats);
    } catch (error) {
      console.error('加载训练统计数据失败:', error);
    }
  },
  
  /**
   * 获取最近的运动记录
   * @param {number} limit 记录数量限制
   * @returns {Array} 最近的运动记录数组
   */
  getRecentExerciseRecords(limit = 5) {
    return dataService.getRecentExerciseRecords(limit);
  },
  
  /**
   * 获取训练统计数据
   * @returns {Object} 训练统计数据
   */
  getTrainingStats() {
    // 如果内存中有数据，直接返回
    if (this.globalData.trainingStats) {
      return this.globalData.trainingStats;
    }
    
    // 否则从存储中加载
    this.loadTrainingStats();
    return this.globalData.trainingStats;
  },
  
  /**
   * 刷新训练统计数据
   */
  refreshTrainingStats() {
    this.loadTrainingStats();
  },

  // 将工具函数挂载到全局
  utils: utils,

  onError(error) {
    console.error('全局错误:', error);
    
    // 可以将错误上报到服务器或显示给用户
    if (error.includes('setStorageSync:fail')) {
      console.error('存储操作失败，可能是键名未定义');
    }
  },

  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (!token || !userInfo) {
      this.globalData.isLoggedIn = false;
      this.globalData.userInfo = null;
      return false;
    }
    
    this.globalData.isLoggedIn = true;
    this.globalData.userInfo = userInfo;
    return true;
  },

  // 检查页面是否需要登录
  checkPageAuth() {
    if (!this.globalData.isLoggedIn) {
      const userInfo = dataService.getUserInfo();
      if (!userInfo) {
        wx.redirectTo({
          url: '/pages/auth/login'
        });
        return false;
      }
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
    }
    return true;
  },

  /**
   * 检查登录状态并处理
   * @param {Function} callback 登录成功后的回调函数
   * @returns {boolean} 是否已登录
   */
  checkLoginAndAuth(callback) {
    const userInfo = dataService.getUserInfo();
    if (userInfo) {
      this.globalData.userInfo = userInfo;
      this.globalData.isLoggedIn = true;
      if (typeof callback === 'function') {
        callback();
      }
      return true;
    } else {
      // 获取当前页面实例
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      
      // 如果当前页面有 authLogin 组件，直接调用其 showPopup 方法
      if (currentPage && currentPage.selectComponent('#authLogin')) {
        const authLogin = currentPage.selectComponent('#authLogin');
        authLogin.showPopup();
        
        // 监听登录成功事件
        const onLoginSuccess = (e) => {
          if (typeof callback === 'function') {
            callback();
          }
        };
        authLogin.onSuccess = onLoginSuccess;
      }
      
      return false;
    }
  },

  /**
   * 获取用户信息
   * @returns {Promise<Object>} 用户信息
   */
  async getUserInfo() {
    // 如果内存中有数据，直接返回
    if (this.globalData.userInfo) {
      // 如果有出生日期但没有年龄，计算年龄
      if (this.globalData.userInfo.birthday && !this.globalData.userInfo.age) {
        this.globalData.userInfo.age = dataService.calculateAge(this.globalData.userInfo.birthday);
      }
      
      // 确保有训练水平字段
      if (!this.globalData.userInfo.level) {
        this.globalData.userInfo.level = 'beginner';
      }
      
      return this.globalData.userInfo;
    }
    
    // 否则从存储中加载
    try {
      const userInfo = dataService.getUserInfo();
      if (userInfo) {
        // 如果有出生日期但没有年龄，计算年龄
        if (userInfo.birthday && !userInfo.age) {
          userInfo.age = dataService.calculateAge(userInfo.birthday);
        }
        
        // 确保有训练水平字段
        if (!userInfo.level) {
          userInfo.level = 'beginner';
        }
        
        this.globalData.userInfo = userInfo;
        return userInfo;
      }
      return null;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      return null;
    }
  }
});