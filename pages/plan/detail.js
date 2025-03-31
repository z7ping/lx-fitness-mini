Page({
  data: {
    plan: null,
    loading: true,
    isCustomPlan: false
  },

  onLoad(options) {
    const { id, type } = options;
    this.setData({
      isCustomPlan: type === 'custom'
    });
    this.loadPlanDetail(id, type);
  },

  // 加载计划详情
  loadPlanDetail(id, type) {
    try {
      this.setData({ loading: true });
      
      if (type === 'custom') {
        // 加载自定义计划
        const dataService = require('../../services/dataService');
        const plans = dataService.getTrainingPlans();
        const plan = plans.find(p => p.id == id);
        
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
        
        this.setData({
          plan: {
            ...plan,
            title: plan.name,
            category: this.getTypeDisplayName(plan.type),
            progressText: `${plan.progress || 0}%`
          },
          loading: false
        });
      } else {
        // 加载系统计划
        // 这里使用模拟数据，实际应该从服务器获取
        const systemPlans = [
          {
            id: 1,
            title: '初级燃脂计划',
            duration: '4周',
            level: '初级',
            category: '燃脂',
            description: '适合初学者的燃脂训练计划',
            exercises: [
              {
                name: '跑步',
                type: '有氧',
                sets: 1,
                reps: 1,
                duration: 20
              },
              {
                name: '深蹲',
                type: '腿部',
                sets: 3,
                reps: 15
              }
            ]
          },
          {
            id: 2,
            title: '中级力量训练',
            duration: '8周',
            level: '中级',
            category: '增肌',
            description: '针对有一定基础的训练者的力量训练计划',
            exercises: [
              {
                name: '杠铃卧推',
                type: '胸部',
                sets: 4,
                reps: 10,
                weight: 60
              },
              {
                name: '引体向上',
                type: '背部',
                sets: 3,
                reps: 8
              }
            ]
          }
        ];
        
        const plan = systemPlans.find(p => p.id == id);
        
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
        
        this.setData({
          plan,
          loading: false
        });
      }
    } catch (error) {
      console.error('加载计划详情失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
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

  // 开始训练
  startTraining() {
    const { plan } = this.data;
    
    // 保存当前计划为活动计划
    try {
      const dataService = require('../../services/dataService');
      dataService.saveActiveTrainingPlan(plan);
      
      wx.navigateTo({
        url: '/pages/training/prepare'
      });
    } catch (error) {
      console.error('设置活动计划失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },

  // 编辑计划
  editPlan() {
    if (!this.data.isCustomPlan) {
      wx.showToast({
        title: '系统计划不可编辑',
        icon: 'none'
      });
      return;
    }
    
    const { plan } = this.data;
    wx.navigateTo({
      url: `/pages/plan/edit?id=${plan.id}`
    });
  },

  // 删除计划
  deletePlan() {
    if (!this.data.isCustomPlan) {
      wx.showToast({
        title: '系统计划不可删除',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个训练计划吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            const dataService = require('../../services/dataService');
            const plans = dataService.getTrainingPlans();
            const newPlans = plans.filter(p => p.id != this.data.plan.id);
            
            // 更新存储
            dataService.updateTrainingPlans(newPlans);
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
            
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (error) {
            console.error('删除计划失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  }
}); 