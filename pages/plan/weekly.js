Page({
  data: {
    weeklyPlan: null,
    loading: true,
    currentWeek: 0,
    weekRange: {}
  },
  
  onLoad() {
    this.loadWeeklyPlan();
  },
  
  // 加载周计划
  loadWeeklyPlan() {
    try {
      this.setData({ loading: true });
      console.log("===============================")
      const dataService = require('../../services/dataService');
      const utils = require('../../utils/utils');
      
      // 获取周计划
      const weeklyPlan = dataService.getWeeklyPlan();
      
      if (!weeklyPlan) {
        this.setData({ loading: false });
        wx.showToast({
          title: '未找到周计划',
          icon: 'none'
        });
        return;
      }
      
      // 获取当前周数和日期范围
      const currentWeek = utils.getCurrentWeek();
      const weekRange = utils.getCurrentWeekRange();
      
      this.setData({
        weeklyPlan,
        currentWeek,
        weekRange,
        loading: false
      });
    } catch (error) {
      console.error('加载周计划失败:', error);
      this.setData({ loading: false });
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    }
  },
  
  // 编辑某天的计划
  editDayPlan(e) {
    const { day } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/plan/edit-day?day=${day}`
    });
  },
  
  // 添加训练项目
  addExercise(e) {
    const { day } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/plan/add-exercise?day=${day}`
    });
  },
  
  // 添加饮食项目
  addDiet(e) {
    const { day } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/plan/add-diet?day=${day}`
    });
  },
  
  // 完成训练
  completeExercise(e) {
    const { day, index } = e.currentTarget.dataset;
    
    try {
      const dataService = require('../../services/dataService');
      
      // 获取周计划
      const weeklyPlan = this.data.weeklyPlan;
      
      // 找到对应的日期和运动
      const dayPlan = weeklyPlan.days.find(d => d.day === day);
      if (dayPlan && dayPlan.exercises[index]) {
        // 更新完成状态
        dayPlan.exercises[index].completed = true;
        
        // 保存更新后的周计划
        dataService.saveWeeklyPlan(weeklyPlan);
        
        // 更新页面数据
        this.setData({
          weeklyPlan
        });
        
        wx.showToast({
          title: '已完成',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('更新完成状态失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },
  
  // 完成饮食
  completeDiet(e) {
    const { day, index } = e.currentTarget.dataset;
    
    try {
      const dataService = require('../../services/dataService');
      
      // 获取周计划
      const weeklyPlan = this.data.weeklyPlan;
      
      // 找到对应的日期和饮食
      const dayPlan = weeklyPlan.days.find(d => d.day === day);
      if (dayPlan && dayPlan.diet[index]) {
        // 更新完成状态
        dayPlan.diet[index].completed = true;
        
        // 保存更新后的周计划
        dataService.saveWeeklyPlan(weeklyPlan);
        
        // 更新页面数据
        this.setData({
          weeklyPlan
        });
        
        wx.showToast({
          title: '已完成',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('更新完成状态失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
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
    
    // 跳转到训练开始页面
    wx.navigateTo({
      url: `/pages/training/start?type=${exercise.type || 'running'}&duration=${exercise.duration || 30}&name=${exercise.name || '快速训练'}`
    });
  }
}); 