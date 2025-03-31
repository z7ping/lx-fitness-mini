// pages/plan/create.js
Page({
  data: {
    planInfo: {
      name: '',
      description: '',
      type: 'strength',
      level: 'beginner',
      duration: '4周',
      exercises: []
    },
    types: [
      { id: 'strength', name: '力量训练' },
      { id: 'cardio', name: '有氧训练' },
      { id: 'flexibility', name: '柔韧性训练' },
      { id: 'mixed', name: '混合训练' }
    ],
    levels: [
      { id: 'beginner', name: '初级' },
      { id: 'intermediate', name: '中级' },
      { id: 'advanced', name: '高级' }
    ]
  },

  // 输入计划名称
  inputName(e) {
    this.setData({
      'planInfo.name': e.detail.value
    });
  },

  // 输入计划描述
  inputDescription(e) {
    this.setData({
      'planInfo.description': e.detail.value
    });
  },

  // 选择计划类型
  selectType(e) {
    this.setData({
      'planInfo.type': e.detail.value
    });
  },

  // 选择难度级别
  selectLevel(e) {
    this.setData({
      'planInfo.level': e.detail.value
    });
  },

  // 选择计划时长
  selectDuration(e) {
    this.setData({
      'planInfo.duration': e.detail.value
    });
  },

  // 添加运动
  addExercise() {
    wx.navigateTo({
      url: '/pages/exercise/select',
      events: {
        // 接收选择的运动
        acceptExercise: (exercise) => {
          console.log('接收到选择的运动:', exercise);
          const exercises = [...this.data.planInfo.exercises, exercise];
          this.setData({
            'planInfo.exercises': exercises
          });
        }
      }
    });
  },

  // 删除运动
  deleteExercise(e) {
    const { index } = e.currentTarget.dataset;
    const exercises = [...this.data.planInfo.exercises];
    exercises.splice(index, 1);
    this.setData({
      'planInfo.exercises': exercises
    });
  },

  // 验证表单
  validateForm() {
    const { name, exercises } = this.data.planInfo;
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入计划名称',
        icon: 'none'
      });
      return false;
    }
    
    if (exercises.length === 0) {
      wx.showToast({
        title: '请添加至少一个运动',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  },

  // 保存训练计划
  saveTrainingPlan() {
    if (!this.validateForm()) return;
    
    try {
      wx.showLoading({ title: '保存中...' });
      
      const dataService = require('../../services/dataService');
      
      // 准备训练计划数据
      const planData = {
        id: Date.now().toString(),
        name: this.data.planInfo.name,
        description: this.data.planInfo.description,
        type: this.data.planInfo.type,
        level: this.data.planInfo.level,
        duration: this.data.planInfo.duration,
        exercises: this.data.planInfo.exercises.map(exercise => ({
          ...exercise,
          scheduledDay: exercise.scheduledDay || null
        })),
        createdAt: new Date().toISOString(),
        progress: 0,
        completed: false
      };
      
      // 保存训练计划
      const savedPlan = dataService.saveTrainingPlan(planData);
      
      // 清除缓存，确保下次获取时从存储中重新加载
      dataService.cache.trainingPlans = null;
      
      wx.hideLoading();
      wx.showToast({
        title: '训练计划已保存',
        icon: 'success'
      });
      
      // 返回上一页并刷新
      setTimeout(() => {
        // 返回上一页
        const pages = getCurrentPages();
        const prevPage = pages[pages.length - 2]; // 获取上一个页面
        
        // 如果上一页是计划列表页，直接更新其数据
        if (prevPage && prevPage.route === 'pages/plan/index') {
          // 获取最新的计划列表
          const dataService = require('../../services/dataService');
          const plans = dataService.getTrainingPlans();
          
          // 格式化用户自定义计划
          const customPlans = plans.map(plan => ({
            id: plan.id,
            title: plan.name,
            duration: plan.duration,
            level: plan.level,
            category: prevPage.getTypeDisplayName(plan.type),
            description: plan.description || '自定义训练计划',
            progress: plan.progress || 0,
            exercises: plan.exercises || []
          }));
          
          // 直接更新上一页的数据
          prevPage.setData({
            customPlanList: customPlans
          });
          
          // 调用上一页的刷新方法
          prevPage.loadPlanList();
        }
        
        wx.navigateBack({
          delta: 1,
          success: () => {
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            if (prevPage) {
              prevPage.loadWeeklyPlans(); // 刷新周计划
            }
          }
        });
      }, 1000);
    } catch (error) {
      wx.hideLoading();
      console.error('保存训练计划失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  }
});