// pages/exercise/index.js
const app = getApp()
const { dataService } = require('../../services/dataService')
const TimeUtils = require('../../utils/timeUtils');

Page({
  data: {
    todayStats: {
      duration: 0,
      calories: 0,
      count: 0
    },
    quickStartList: [
      {
        id: 1,
        name: '快速跑步',
        icon: 'upgrade',
        color: '#4caf50',
        duration: 30,
        type: 'running'
      },
      {
        id: 2,
        name: '力量训练',
        icon: 'fire',
        color: '#ff9800',
        duration: 45,
        type: 'strength'
      }
    ],
    recentRecords: [],
    weeklyGoal: {
      current: 0,
      target: 5
    },
    durationGoal: {
      current: 0,
      target: 150
    }
  },

  onLoad() {
    // 检查登录状态
    if (!app.checkLoginAndAuth()) {
      return;
    }
    this.loadTodayStats();
    this.loadRecentRecords();
    this.loadGoals();
    
    // 更新全局tabBar状态
    app.updateTabBarState(1);
  },

  onShow() {
    // 检查登录状态
    if (!app.checkLoginAndAuth()) {
      return;
    }
    // 每次显示页面时更新数据
    this.loadTodayStats();
    this.loadRecentRecords();
    
    // 更新tabbar选中状态 - 多种方式确保更新成功
    // 1. 更新全局状态
    app.updateTabBarState(1);
    
    // 2. 直接更新组件状态
    if (typeof this.getTabBar === 'function') {
      const tabBar = this.getTabBar();
      if (tabBar) {
        tabBar.setData({
          active: 1
        });
      }
    }
    
    // 3. 延迟更新，确保在页面完全加载后更新
    setTimeout(() => {
      if (typeof this.getTabBar === 'function') {
        const tabBar = this.getTabBar();
        if (tabBar) {
          tabBar.setData({
            active: 1
          });
        }
      }
    }, 100);
  },

  onPullDownRefresh() {
    Promise.all([
      this.loadTodayStats(),
      this.loadRecentRecords(),
      this.loadGoals()
    ]).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载今日运动统计
  async loadTodayStats() {
    try {
      const records = dataService.getExerciseRecords();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayRecords = records.filter(record => {
        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate.getTime() === today.getTime();
      });
      
      const stats = {
        duration: todayRecords.reduce((sum, record) => sum + TimeUtils.formatDurationToMinutes(record.duration), 0),
        calories: todayRecords.reduce((sum, record) => sum + (record.calories || 0), 0),
        count: todayRecords.length
      };
      
      this.setData({ todayStats: stats });
    } catch (error) {
      console.error('加载今日运动统计失败:', error);
      getApp().utils.showToast('加载运动数据失败');
    }
  },

  // 加载最近运动记录
  async loadRecentRecords() {
    try {
      const records = dataService.getExerciseRecords();
      
      // 格式化记录数据
      const formattedRecords = records.map(record => {
        const date = new Date(record.date);
        const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        
        return {
          ...record,
          formattedDate,
          distanceKm: (record.distance / 1000).toFixed(2),
          duration: TimeUtils.formatDuration(record.duration, false)
        };
      });
      
      // 按日期降序排序并只取最近3条
      formattedRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      const recentRecords = formattedRecords.slice(0, 3);
      
      this.setData({ recentRecords });
    } catch (error) {
      console.error('加载最近运动记录失败:', error);
    }
  },

  // 加载运动目标
  async loadGoals() {
    try {
      const stats = dataService.getTrainingStats();
      
      this.setData({
        weeklyGoal: {
          current: stats.weeklyCount || 0,
          target: 5
        },
        durationGoal: {
          current: stats.weeklyDuration || 0,
          target: 150
        }
      });
    } catch (error) {
      console.error('加载运动目标失败:', error);
      getApp().utils.showToast('加载运动目标失败');
    }
  },

  // 开始运动
  startExercise(e) {
    // 检查登录状态
    if (!app.checkLoginAndAuth()) {
      return;
    }

    const item = e.currentTarget.dataset.item;
    if (!item) {
      wx.showToast({
        title: '训练数据无效',
        icon: 'none'
      });
      return;
    }
    
    let url = '';
    switch(item.type) {
      case 'running':
      case 'cardio':
        url = `/pages/training/cardio?type=${item.type}&duration=${item.duration}&name=${item.name}`;
        break;
      case 'strength':
        url = `/pages/training/strength?type=${item.type}&duration=${item.duration}&name=${item.name}`;
        break;
      case 'yoga':
      case 'stretch':
        url = `/pages/training/stretch?type=${item.type}&duration=${item.duration}&name=${item.name}`;
        break;
      case 'freestyle':
        url = `/pages/training/custom?type=${item.type}&duration=${item.duration}&name=${item.name}`;
        break;
      default:
        wx.showToast({
          title: '暂不支持该类型训练',
          icon: 'none'
        });
        return;
    }
    
    wx.navigateTo({ url });
  },

  // 查看所有运动记录
  viewAllRecords() {
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: '/pages/checkin/records'
      });
    });
  },

  // 查看记录详情
  viewRecordDetail(e) {
    const { id } = e.currentTarget.dataset;
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: `/pages/exercise/record-detail?id=${id}`
      });
    });
  },

  // 编辑运动目标
  editGoals() {
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: '/pages/exercise/goals'
      });
    });
  }
});
