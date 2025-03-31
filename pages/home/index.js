// pages/home/index.js
const app = getApp()
const { dataService, EVENT_TYPES } = require('../../services/dataService')
const utils = require('../../utils/utils')

Page({
  data: {
    userInfo: {},
    healthStats: {
      calories: 0,
      steps: 0,
      duration: 0
    },
    todayInfo: {},
    todayPlan: null,
    greeting: '',
    bannerList: [],
    quickActions: [
      { icon: 'clock', text: '快速训练', path: '/pages/plan/quick' },
      { icon: 'records', text: '训练记录', path: '/pages/checkin/records' },
      { icon: 'chart', text: '健康报告', path: '/pages/dashboard/report' },
      { icon: 'setting', text: '训练设置', path: '/pages/profile/settings' }
    ]
  },

  onLoad() {
    // 添加用户信息更新事件监听器
    dataService.addEventListener(EVENT_TYPES.USER_INFO_UPDATED, this.handleUserInfoUpdate.bind(this));
    
    this.initTodayInfo();
    this.loadUserInfo();
    this.setGreeting();
    this.loadBanners();
    
    // 如果已登录，加载用户相关数据
    if (app.globalData.isLoggedIn) {
      this.loadHealthStats();
      this.loadTodayPlans();
    }
    
    // 更新全局tabBar状态
    app.updateTabBarState(0);
  },

  onShow() {
    // 每次显示页面时更新数据
    if (app.globalData.isLoggedIn) {
      this.loadHealthStats();
      this.loadTodayPlans();
      this.loadUserInfo();
    }
    
    // 更新tabbar选中状态 - 多种方式确保更新成功
    // 1. 更新全局状态
    app.updateTabBarState(0);
    
    // 2. 直接更新组件状态
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar();
      if (tabBar) {
        tabBar.setData({
          active: 0
        });
      }
    }
    
    // 3. 延迟更新，确保在页面完全加载后更新
    setTimeout(() => {
      if (typeof this.getTabBar === 'function') {
        const tabBar = this.getTabBar();
        if (tabBar) {
          tabBar.setData({
            active: 0
          });
        }
      }
    }, 100);
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadUserInfo(),
      this.loadHealthStats(),
      this.loadTodayPlans()
    ]).then(() => {
      wx.stopPullDownRefresh();
    }).catch(error => {
      console.error('刷新数据失败:', error);
      wx.stopPullDownRefresh();
    });
  },

  onUnload() {
    // 移除事件监听器
    dataService.removeEventListener(EVENT_TYPES.USER_INFO_UPDATED, this.handleUserInfoUpdate.bind(this));
  },

  // 处理用户信息更新事件
  handleUserInfoUpdate(userInfo) {
    this.setData({ userInfo });
    if (userInfo) {
      this.loadPageData();
    }
  },

  setGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 6) {
      greeting = '凌晨好';
    } else if (hour < 9) {
      greeting = '早上好';
    } else if (hour < 12) {
      greeting = '上午好';
    } else if (hour < 14) {
      greeting = '中午好';
    } else if (hour < 17) {
      greeting = '下午好';
    } else if (hour < 19) {
      greeting = '傍晚好';
    } else {
      greeting = '晚上好';
    }
    this.setData({ greeting });
  },

  // 加载轮播图数据
  async loadBanners() {
    try {
      // TODO: 从服务器获取轮播图数据
      this.setData({
        bannerList: [
          { id: 1, image: '/assets/images/banner1.png', url: '' },
          { id: 2, image: '/assets/images/banner2.png', url: '' }
        ]
      });
    } catch (error) {
      console.error('加载轮播图失败:', error);
      getApp().utils.showToast('加载轮播图失败');
    }
  },

  // 初始化今日信息
  initTodayInfo() {
    const now = new Date();
    const weekday = ['日', '一', '二', '三', '四', '五', '六'];
    
    this.setData({
      todayInfo: {
        date: `${now.getMonth() + 1}月${now.getDate()}日`,
        weekday: weekday[now.getDay()]
      }
    });
  },

  // 加载用户信息
  loadUserInfo() {
    const userInfo = dataService.getUserInfo();
    this.setData({ userInfo });
  },

  // 获取用户信息（通过按钮点击触发）
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: (res) => {
        const userInfo = res.userInfo;
        wx.setStorageSync('userInfo', userInfo);
        this.setData({ userInfo });
      },
      fail: (err) => {
        console.error('获取用户信息失败:', err);
        getApp().utils.showToast('获取用户信息失败');
      }
    });
  },

  // 加载今日计划
  loadTodayPlans() {
    try {
      // 检查登录状态
      if (!app.checkLoginAndAuth()) {
        return;
      }

      let todayExercises = [];
      const today = new Date();
      const dayOfWeek = utils.getDayOfWeek(today);
      
      // 获取周计划
      const weeklyPlan = dataService.getWeeklyPlan() || { days: [] };
      
      // 找到今天的计划
      const todayPlan = weeklyPlan.days ? weeklyPlan.days.find(day => day && day.day === dayOfWeek) : null;
      
      if (todayPlan && todayPlan.plans && Array.isArray(todayPlan.plans)) {
        // 遍历每个时间段的训练
        todayPlan.plans.forEach(timePlan => {
          if (timePlan && timePlan.exercises && Array.isArray(timePlan.exercises)) {
            const exercises = timePlan.exercises.map(exercise => ({
              id: exercise.id || `${Date.now()}_${Math.random()}`,
              name: exercise.name || '未命名训练',
              type: exercise.type || '训练',
              sets: exercise.sets,
              reps: exercise.reps,
              duration: exercise.duration,
              distance: exercise.distance,
              timeSlot: timePlan.timeSlot,
              planName: exercise.planName,
              completed: exercise.completed || false,
              statusText: exercise.completed ? '已完成' : '未完成',
              statusClass: exercise.completed ? 'completed' : 'pending'
            }));
            todayExercises = todayExercises.concat(exercises);
          }
        });
      }
      
      // 按时间段排序
      const timeSlotOrder = ['早晨', '上午', '下午', '晚上'];
      todayExercises.sort((a, b) => {
        return timeSlotOrder.indexOf(a.timeSlot) - timeSlotOrder.indexOf(b.timeSlot);
      });

      // 更新页面数据
      this.setData({
        todayExercises,
        hasPlans: todayExercises.length > 0
      });
      
    } catch (error) {
      console.error('加载今日计划失败:', error);
      this.setData({ 
        todayExercises: [],
        hasPlans: false 
      });
    }
  },

  // 查看更多计划
  viewMorePlans() {
    wx.navigateTo({
      url: '/pages/plan/index'
    });
  },

  // 开始训练
  startTraining(e) {
    const { exercise } = e.currentTarget.dataset;
    
    if (!exercise) {
      wx.showToast({
        title: '训练数据无效',
        icon: 'none'
      });
      return;
    }
    
    app.checkLoginAndAuth(() => {
      // 跳转到训练开始页面
      wx.navigateTo({
        url: `/pages/training/start?type=${exercise.type || 'running'}&duration=${exercise.duration || 30}&name=${exercise.name || '快速训练'}&planId=${exercise.planId || ''}`
      });
    });
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

  // 加载健康数据
  async loadHealthStats() {
    try {
      // TODO: 从服务器获取健康数据统计
      this.setData({
        healthStats: {
          calories: 325,
          steps: 6800,
          duration: 45
        }
      });
    } catch (error) {
      console.error('加载健康数据失败:', error);
      getApp().utils.showToast('加载健康数据失败');
    }
  },

  // 导航方法
  navigateToPlan() {
    wx.navigateTo({ url: '/pages/plan/index' });
  },

  navigateToCheckin() {
    wx.navigateTo({ url: '/pages/checkin/records' });
  },

  navigateToWeight() {
    wx.navigateTo({ url: '/pages/weight/index' });
  },

  navigateToAI() {
    wx.navigateTo({ url: '/pages/ai/index' });
  },

  navigateToData() {
    wx.navigateTo({ url: '/pages/dashboard/index' });
  },

  // 手动创建计划
  createPlanManually() {
    app.checkLoginAndAuth(() => {
      const planData = {
        type: 'manual',
        date: new Date().toISOString().split('T')[0],
        defaultDuration: 45,
        userInfo: this.data.userInfo
      };
      
      wx.navigateTo({ 
        url: `/pages/myplan/create?planData=${JSON.stringify(planData)}`
      });
    });
  },

  // AI智能创建计划
  createPlanWithAI() {
    app.checkLoginAndAuth(() => {
      console.log("=====》当前登录用户信息：", this.data.userInfo)
      // 先检查是否有用户信息
      if (!this.data.userInfo.height || !this.data.userInfo.weight || !this.data.userInfo.gender) {
        wx.showModal({
          title: '完善信息',
          content: '需要您的身高、体重等基础信息来制定更合适的计划，是否去完善？',
          confirmText: '去完善',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/profile/edit'
              });
            }
          }
        });
        return;
      }

      const userData = {
        gender: this.data.userInfo.gender,
        age: this.data.userInfo.age,
        height: this.data.userInfo.height,
        weight: this.data.userInfo.weight,
        goal: this.data.userInfo.goal,
        level: this.data.userInfo.level || 'beginner',
        restrictions: this.data.userInfo.restrictions || [],
        preferredTime: this.data.userInfo.preferredTime || 'morning'
      };

      wx.navigateTo({ 
        url: `/pages/myplan/ai-generate?userData=${JSON.stringify(userData)}`
      });
    });
  },

  // 如果首页也有跳转到计划详情的功能
  viewPlanDetail(e) {
    const { id, type } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/myplan/detail?id=${id}&type=${type}`  // 使用正确的路径
    });
  },

  // 快速训练入口
  quickTraining() {
    app.checkLoginAndAuth(() => {
      // 跳转到快速训练选择页面
      wx.navigateTo({
        url: '/pages/exercise/index'
      });
    });
  },

  // 加载页面数据
  loadPageData() {
    // 加载其他相关数据
    this.loadHealthStats();
    this.loadTrainingStats();
    this.loadTodayPlans();
  },

  // 加载训练统计数据
  loadTrainingStats() {
    try {
      const stats = dataService.getTrainingStats();
      this.setData({
        trainingStats: stats
      });
    } catch (error) {
      console.error('加载训练统计数据失败:', error);
    }
  },

  // 登录成功回调
  onLoginSuccess(e) {
    const { userInfo } = e.detail;
    this.setData({ userInfo });
    
    // 加载用户相关数据
    this.loadHealthStats();
    this.loadTodayPlans();
  },

  // 登录关闭回调
  onLoginClose() {
    console.log('登录弹窗已关闭');
  }
});