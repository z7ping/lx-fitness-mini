const { dataService } = require('../../services/dataService');

Page({
  data: {
    plan: null,
    loading: true
  },

  onLoad(options) {
    console.log('计划详情页面加载，参数：', options);  // 添加调试日志
    const { id, type } = options;
    this.loadPlanDetail(id, type);
  },

  // 加载计划详情
  async loadPlanDetail(id, type) {
    try {
      this.setData({ loading: true });
      
      let plan;
      
      if (type === 'custom') {
        const plans = dataService.getTrainingPlans();
        plan = plans.find(p => p.id == id);
        
        // 获取周计划信息
        const weeklyPlan = dataService.getWeeklyPlan();
        if (weeklyPlan && plan) {
          // 为每个训练项添加时间信息
          plan.exercises = plan.exercises.map(exercise => ({
            ...exercise,
            scheduledTime: exercise.scheduledDay ? `${exercise.scheduledDay} ${exercise.timeSlot || ''}` : '未安排时间'
          }));
        }
      } else {
        // 处理其他类型的计划
        plan = await this.loadPlanFromServer(id);
      }
      
      if (!plan) {
        wx.showToast({
          title: '计划不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }
      
      // 计算完成进度
      if (plan.exercises && plan.exercises.length > 0) {
        const completedCount = plan.exercises.filter(e => e.completed).length;
        plan.progress = Math.round((completedCount / plan.exercises.length) * 100);
      }
      
      this.setData({
        plan,
        loading: false
      });
    } catch (error) {
      console.error('加载计划详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 从服务器加载计划
  async loadPlanFromServer(id) {
    // TODO: 实现从服务器加载计划的逻辑
    return null;
  },

  // 开始训练
  startTraining() {
    const { plan } = this.data;
    if (!plan) return;
    
    // 找到第一个未完成的训练
    const nextExercise = plan.exercises.find(e => !e.completed);
    if (nextExercise) {
      // 根据训练类型跳转到不同的训练页面
      let url = '';
      switch(nextExercise.type) {
        case '跑步':
        case '有氧':
          url = `/pages/training/cardio?exerciseId=${nextExercise.id}&planId=${plan.id}`;
          break;
        case '力量':
        case '力量训练':
          url = `/pages/training/strength?exerciseId=${nextExercise.id}&planId=${plan.id}`;
          break;
        case '拉伸':
        case '柔韧性':
          url = `/pages/training/stretch?exerciseId=${nextExercise.id}&planId=${plan.id}`;
          break;
        default:
          url = `/pages/training/custom?exerciseId=${nextExercise.id}&planId=${plan.id}`;
      }

      // 添加训练参数
      const params = {
        name: nextExercise.name,
        sets: nextExercise.sets,
        reps: nextExercise.reps,
        duration: nextExercise.duration,
        weight: nextExercise.weight,
        distance: nextExercise.distance,
        description: nextExercise.description
      };

      url += '&' + Object.entries(params)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

      wx.navigateTo({ url });
    } else {
      wx.showToast({
        title: '所有训练已完成',
        icon: 'success'
      });
    }
  },

  // 查看训练记录
  viewTrainingRecords() {
    const { plan } = this.data;
    wx.navigateTo({
      url: `/pages/checkin/records?planId=${plan.id}`
    });
  }
}); 