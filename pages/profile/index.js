// pages/profile/index.js
const app = getApp()
const { dataService, EVENT_TYPES } = require('../../services/dataService')

Page({
  data: {
    userInfo: null,
    healthInfo: null,
    loading: false,
    achievements: [],
    deviceInfo: {},
    planInfo: {},
    recordInfo: {},
    myPlans: [],
    hasPlans: false,
    trainingStats: null,
    exerciseCount: 0,
    foodCount: 0
  },

  onLoad() {
    // 添加用户信息更新事件监听器
    dataService.addEventListener(EVENT_TYPES.USER_INFO_UPDATED, this.handleUserInfoUpdate.bind(this));
    
    this.loadUserInfo()
    if (this.data.userInfo) {
      this.loadHealthInfo()
      this.loadAchievements()
      this.loadStatistics()
      this.loadTrainingStats()
    }
    
    // 更新全局tabBar状态
    app.updateTabBarState(2);
  },

  onUnload() {
    // 移除事件监听器
    dataService.removeEventListener(EVENT_TYPES.USER_INFO_UPDATED, this.handleUserInfoUpdate.bind(this));
  },

  // 处理用户信息更新事件
  handleUserInfoUpdate(userInfo) {
    this.setData({ userInfo });
    if (userInfo) {
      this.loadHealthInfo();
      this.loadAchievements();
      this.loadStatistics();
      this.loadTrainingStats();
    }
  },

  onShow() {
    this.loadUserInfo()
    if (this.data.userInfo) {
      this.loadTrainingStats()
    }
    
    // 更新tabbar选中状态 - 多种方式确保更新成功
    // 1. 更新全局状态
    app.updateTabBarState(2);
    
    // 2. 直接更新组件状态
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar();
      if (tabBar) {
        tabBar.setData({
          active: 2
        });
      }
    }
    
    // 3. 延迟更新，确保在页面完全加载后更新
    setTimeout(() => {
      if (typeof this.getTabBar === 'function') {
        const tabBar = this.getTabBar();
        if (tabBar) {
          tabBar.setData({
            active: 2
          });
        }
      }
    }, 100);
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadUserInfo(),
      this.loadStatistics()
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 显示登录弹窗
  showLogin() {
    const authLogin = this.selectComponent('#authLogin')
    if (!authLogin) {
      console.error('登录组件未找到')
      wx.showToast({
        title: '系统错误',
        icon: 'error'
      })
      return
    }
    authLogin.showPopup()
  },

  // 登录成功回调
  onLoginSuccess(e) {
    const { userInfo } = e.detail
    this.setData({ userInfo })
    
    // 加载用户相关数据
    this.loadHealthInfo()
    this.loadAchievements()
    this.loadStatistics()
    this.loadTrainingStats()
    this.loadResourceCounts()
  },

  // 登录关闭回调
  onLoginClose() {
    console.log('登录弹窗已关闭')
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = dataService.getUserInfo()
    console.log("===>loadUserInfo", userInfo)
    this.setData({ userInfo })
  },

  // 加载健康信息
  async loadHealthInfo() {
    try {
      const userInfo = this.data.userInfo;
      if (!userInfo) return;

      // 计算BMI
      const height = userInfo.height || 0;
      const weight = userInfo.weight || 0;
      const bmi = height && weight ? (weight / ((height / 100) * (height / 100))).toFixed(1) : 0;

      this.setData({
        healthInfo: {
          height: userInfo.height || 0,
          weight: userInfo.weight || 0,
          bmi: bmi,
          targetWeight: userInfo.targetWeight || 0
        }
      });
    } catch (error) {
      console.error('加载健康信息失败:', error);
      getApp().utils.showToast('加载健康信息失败');
    }
  },

  // 加载成就列表
  async loadAchievements() {
    try {
      this.setData({ loading: true });
      // TODO: 从服务器获取成就列表
      this.setData({
        achievements: [
          {
            id: 1,
            title: '初次打卡',
            description: '完成第一次训练打卡',
            icon: 'medal-o',
            unlocked: true
          },
          {
            id: 2,
            title: '坚持不懈',
            description: '连续打卡7天',
            icon: 'fire-o',
            unlocked: true
          },
          {
            id: 3,
            title: '减脂达人',
            description: '完成一个减脂计划',
            icon: 'gift-o',
            unlocked: false
          }
        ]
      });
    } catch (error) {
      console.error('加载成就列表失败:', error);
      getApp().utils.showToast('加载成就列表失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 加载资源库数量
  async loadResourceCounts() {
    try {
      const exerciseCount = await dataService.getExerciseCount();
      const foodCount = await dataService.getFoodCount();
      this.setData({ exerciseCount, foodCount });
    } catch (error) {
      console.error('加载资源库数量失败:', error);
    }
  },

  // 加载设备信息
  async loadDeviceInfo() {
    try {
      const devices = dataService.getBoundDevices() || [];
      return {
        connectedCount: devices.filter(d => d.connected).length,
        devices: devices
      };
    } catch (error) {
      console.error('加载设备信息失败:', error);
      return {
        connectedCount: 0,
        devices: []
      };
    }
  },

  // 加载计划信息
  async loadPlanInfo() {
    try {
      const plans = dataService.getTrainingPlans() || [];
      return {
        completedCount: plans.filter(p => p.completed).length,
        totalCount: plans.length,
        currentPlan: plans.find(p => !p.completed)?.name || ''
      };
    } catch (error) {
      console.error('加载计划信息失败:', error);
      return {
        completedCount: 0,
        totalCount: 0,
        currentPlan: ''
      };
    }
  },

  // 加载运动记录信息
  async loadRecordInfo() {
    try {
      const records = dataService.getExerciseRecords() || [];
      const now = new Date();
      const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
      
      const weeklyRecords = records.filter(r => new Date(r.createTime) >= weekStart);
      
      return {
        weeklyDuration: weeklyRecords.reduce((sum, r) => sum + (r.duration || 0), 0),
        weeklyCalories: weeklyRecords.reduce((sum, r) => sum + (r.calories || 0), 0),
        continuousDays: this.calculateContinuousDays(records),
        currentPlan: records.length
      };
    } catch (error) {
      console.error('加载运动记录失败:', error);
      return {
        weeklyDuration: 0,
        weeklyCalories: 0,
        continuousDays: 0,
        currentPlan: 0
      };
    }
  },

  // 计算连续打卡天数
  calculateContinuousDays(records) {
    if (!records.length) return 0;
    
    const today = new Date().setHours(0, 0, 0, 0);
    let days = 0;
    let currentDay = today;
    
    records.sort((a, b) => new Date(b.createTime) - new Date(a.createTime));
    
    for (const record of records) {
      const recordDate = new Date(record.createTime).setHours(0, 0, 0, 0);
      if (recordDate === currentDay - days * 86400000) {
        days++;
      } else {
        break;
      }
    }
    
    return days;
  },

  // 加载统计数据
  async loadStatistics() {
    try {
      // 修改为分别处理每个异步操作
      const deviceInfo = await this.loadDeviceInfo().catch(() => ({
        connectedCount: 0,
        devices: []
      }));
      
      const planInfo = await this.loadPlanInfo().catch(() => ({
        completedCount: 0,
        totalCount: 0,
        currentPlan: ''
      }));
      
      const recordInfo = await this.loadRecordInfo().catch(() => ({
        weeklyDuration: 0,
        weeklyCalories: 0,
        continuousDays: 0,
        currentPlan: 0
      }));

      this.setData({
        deviceInfo,
        planInfo,
        recordInfo
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
      // 确保即使失败也设置默认值
      this.setData({
        deviceInfo: {
          connectedCount: 0,
          devices: []
        },
        planInfo: {
          completedCount: 0,
          totalCount: 0,
          currentPlan: ''
        },
        recordInfo: {
          weeklyDuration: 0,
          weeklyCalories: 0,
          continuousDays: 0,
          currentPlan: 0
        }
      });
    }
  },

  // 编辑用户信息
  editUserInfo() {
    wx.navigateTo({
      url: '/pages/profile/edit'
    });
  },

  // 编辑健康信息
  editHealthInfo() {
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: '/pages/profile/health'
      });
    });
  },

  // 查看成就详情
  viewAchievement(e) {
    const { id } = e.currentTarget.dataset;
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: `/pages/profile/achievement?id=${id}`
      });
    });
  },

  // 跳转到体重记录
  goToWeightRecord() {
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: '/pages/weight/index'
      });
    });
  },

  // 跳转到成就页面
  goToAchievements() {
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: '/pages/achievements/index'
      });
    });
  },

  // 跳转到数据分析
  goToDataAnalysis() {
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: '/pages/dashboard/index'
      });
    });
  },

  // 跳转到设置页面
  goToSettings() {
    wx.navigateTo({
      url: '/pages/settings/index'
    });
  },

  // 跳转动作库
  goToExerciseLibrary() {
    wx.navigateTo({
      url: '/pages/exercise/select'
    });
  },

  // 跳转食材库
  goToFoodLibrary() {
    wx.navigateTo({
      url: '/pages/diet/food-select'
    });
  },

  // 跳转到关于我们页面
  goToAboutUs() {
    wx.navigateTo({
      url: '/pages/about/index'
    });
  },

  // 跳转到特别鸣谢页面
  goToAcknowledgements() {
    wx.navigateTo({
      url: '/pages/about/acknowledgements'
    });
  },

  // 跳转到设备管理页面
  goToDevices() {
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: '/pages/device/index'
      });
    });
  },

  // 跳转到计划列表页面
  goToPlans() {
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: '/pages/myplan/index'
      });
    });
  },

  // 跳转到运动记录页面
  goToRecords() {
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: '/pages/checkin/records'
      });
    });
  },

  // 跳转到数据看板
  goToDashboard() {
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: '/pages/dashboard/index'
      });
    });
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    return !!(token && userInfo);
  },

  // 处理退出登录
  handleLogout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除用户信息
          dataService.saveUserInfo(null)
          app.globalData.userInfo = null
          app.globalData.isLoggedIn = false
          
          // 重置页面数据
          this.setData({
            userInfo: null,
            healthInfo: null,
            achievements: [],
            deviceInfo: {},
            planInfo: {},
            recordInfo: {},
            myPlans: [],
            hasPlans: false,
            trainingStats: null
          })
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }
      }
    })
  },

  // 加载我的计划
  loadMyPlans() {
    try {
      const dataService = require('../../services/dataService');
      const plans = dataService.getTrainingPlans();
      
      // 只显示最近的3个计划
      const recentPlans = plans
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3)
        .map(plan => ({
          id: plan.id,
          title: plan.name,
          type: this.getTypeDisplayName(plan.type),
          progress: plan.progress || 0,
          progressText: `${plan.progress || 0}%`
        }));
      
      this.setData({
        myPlans: recentPlans,
        hasPlans: recentPlans.length > 0
      });
    } catch (error) {
      console.error('加载我的计划失败:', error);
      this.setData({
        myPlans: [],
        hasPlans: false
      });
    }
  },

  // 获取类型显示名称
  getTypeDisplayName(typeId) {
    const typeMap = {
      'strength': '力量训练',
      'cardio': '有氧训练',
      'flexibility': '柔韧性训练',
      'mixed': '混合训练'
    };
    return typeMap[typeId] || '其他';
  },

  // 加载周计划
  loadWeeklyPlans() {
    try {
      const utils = require('../../utils/utils');
      
      // 1. 获取基础周计划并确保每天都有 exercises 数组
      let weeklyPlan = {
        days: Array(7).fill().map((_, i) => ({
          day: utils.getDayName(i), // 周一到周日
          exercises: [] // 确保初始化 exercises 数组
        }))
      };

      // 2. 获取所有自定义训练计划
      const trainingPlans = dataService.getTrainingPlans() || [];
      
      // 3. 将自定义计划按周分配整合到周计划中
      if (trainingPlans && trainingPlans.length > 0) {
        trainingPlans.forEach(plan => {
          if (!plan || !plan.exercises) return;
          
          plan.exercises.forEach(exercise => {
            // 如果训练项目指定了训练日期
            if (exercise.scheduledDay) {
              const dayPlan = weeklyPlan.days.find(d => d.day === exercise.scheduledDay);
              if (dayPlan) {
                // 确保 exercises 数组存在
                if (!Array.isArray(dayPlan.exercises)) {
                  dayPlan.exercises = [];
                }

                // 避免重复添加
                const existingIndex = dayPlan.exercises.findIndex(e => 
                  e && e.id === exercise.id && e.planId === plan.id
                );
                
                const exerciseData = {
                  ...exercise,
                  planId: plan.id,
                  planName: plan.name,
                  source: 'custom',
                  type: exercise.type || '自定义训练'
                };

                if (existingIndex === -1) {
                  // 添加新的训练项目
                  dayPlan.exercises.push(exerciseData);
                } else {
                  // 更新现有训练项目
                  dayPlan.exercises[existingIndex] = exerciseData;
                }
              }
            }
          });
        });
      }

      // 4. 为每天的训练列表排序
      weeklyPlan.days.forEach(day => {
        if (!Array.isArray(day.exercises)) {
          day.exercises = [];
        }
        
        day.exercises.sort((a, b) => {
          if (!a || !b) return 0;
          // 自定义排序逻辑，例如按来源和名称排序
          if (a.source !== b.source) {
            return a.source === 'custom' ? -1 : 1; // 自定义计划优先显示
          }
          return (a.name || '').localeCompare(b.name || '');
        });
      });

      // 5. 更新页面数据
      this.setData({
        weeklyPlan,
        loading: false
      });
      
    } catch (error) {
      console.error('加载周计划失败:', error);
      this.setData({ 
        weeklyPlan: {
          days: Array(7).fill().map((_, i) => ({
            day: utils.getDayName(i),
            exercises: []
          }))
        },
        loading: false 
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 保存用户信息后立即更新
  saveUserInfo(userInfo) {
    const dataService = require('../../services/dataService');
    dataService.saveUserInfo(userInfo);
    this.loadUserInfo(); // 立即重新加载
  },

  loadTrainingStats() {
    const stats = dataService.getTrainingStats()
    this.setData({ trainingStats: stats })
  }
});