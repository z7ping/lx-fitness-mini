// pages/home/index.js
const app = getApp()
const { dataService, EVENT_TYPES } = require('../../services/dataService')
const { WEEKDAY_MAPPING } = require('../../utils/dictionary');
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
    showRefresh: false,
    // 修改悬浮按钮位置数据
    floatingBtnX: wx.getStorageSync('floatingBtnX') || 320,
    floatingBtnY: wx.getStorageSync('floatingBtnY') || 600,
    isFloatingBtnMoving: false,
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
    // 显示下拉刷新动画
    this.setData({ showRefresh: true });
    
    // 延迟执行数据刷新，让动画有足够时间显示
    setTimeout(() => {
      Promise.all([
        this.loadUserInfo(),
        this.loadHealthStats(),
        this.loadTodayPlans()
      ]).then(() => {
        // 延迟隐藏动画，确保用户能看到刷新效果
        setTimeout(() => {
          this.setData({ showRefresh: false });
          wx.stopPullDownRefresh();
        }, 500);
      }).catch(error => {
        console.error('刷新数据失败:', error);
        // 出错时也延迟隐藏动画
        setTimeout(() => {
          this.setData({ showRefresh: false });
          wx.stopPullDownRefresh();
        }, 500);
      });
    }, 300);
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

  // 初始化今日信息
  initTodayInfo() {
    const now = new Date();
    
    this.setData({
      todayInfo: {
        date: `${now.getMonth() + 1}月${now.getDate()}日`,
        weekday: WEEKDAY_MAPPING.DISPLAY_TEXT[now.getDay()]
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
    const todayExercises = dataService.getTodayPlans();
    this.setData({
      todayExercises,
      hasPlans: todayExercises.length > 0
    });
  },
  
  // 查看更多食谱
  viewMoreDiet() {
    wx.navigateTo({
      url: '/pages/plan/index?type=diet'
    });
  },
  // 查看更多计划
  viewMorePlans() {
    wx.navigateTo({
      url: '/pages/plan/index?type=training'
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

  navigateToMyPlan() {
    wx.navigateTo({ url: '/pages/myplan/index' });
  },

  navigateToCheckin() {
    wx.navigateTo({ url: '/pages/checkin/create' });
  },

  navigateToWeight() {
    wx.navigateTo({ url: '/pages/weight/index' });
  },

  navigateToAI() {
    wx.navigateTo({ url: '/pages/ai/index' });
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
        url: `/pages/plan/create?planData=${JSON.stringify(planData)}`
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
        url: `/pages/plan/ai-generate?userData=${JSON.stringify(userData)}`
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
  },


// 手动创建食谱
createDietManually() {
  app.checkLoginAndAuth(() => {
    wx.navigateTo({
      url: '/pages/diet/create'
    });
  });
},

// AI智能推荐食谱
createDietWithAI() {
  app.checkLoginAndAuth(() => {
    wx.navigateTo({
      url: '/pages/diet/ai-generate'
    });
  });
},

// 处理悬浮按钮移动
onFloatingBtnMove(e) {
  if (!this.data.isFloatingBtnMoving) {
    this.setData({ isFloatingBtnMoving: true });
  }
  
  // 获取窗口信息
  const { windowWidth, windowHeight } = wx.getWindowInfo();
  
  // 按钮尺寸（rpx 转 px，假设屏幕宽度为 750rpx）
  const btnSize = (120 * windowWidth) / 750;
  
  // 限制移动范围
  const x = Math.max(0, Math.min(e.detail.x, windowWidth - btnSize));
  const y = Math.max(0, Math.min(e.detail.y, windowHeight - btnSize));
  
  this.setData({
    floatingBtnX: x,
    floatingBtnY: y
  });
},

// 处理悬浮按钮移动结束
onFloatingBtnMoveEnd() {
  // 使用防抖处理保存位置
  if (this.savePositionTimer) {
    clearTimeout(this.savePositionTimer);
  }
  
  this.savePositionTimer = setTimeout(() => {
    const { floatingBtnX, floatingBtnY } = this.data;
    wx.setStorageSync('floatingBtnX', floatingBtnX);
    wx.setStorageSync('floatingBtnY', floatingBtnY);
    this.setData({ isFloatingBtnMoving: false });
  }, 300);
},
});
