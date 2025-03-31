// 开始训练
startTraining() {
  try {
    const dataService = require('../../services/dataService');
    const activePlan = dataService.getActiveTrainingPlan();
    
    if (!activePlan) {
      wx.showToast({
        title: '未选择训练计划',
        icon: 'none'
      });
      return;
    }
    
    // 跳转到训练页面，并传递计划信息
    wx.navigateTo({
      url: `/pages/training/start?planId=${activePlan.id}&planName=${activePlan.name || activePlan.title}`
    });
  } catch (error) {
    console.error('开始训练失败:', error);
    wx.showToast({
      title: '操作失败',
      icon: 'none'
    });
  }
} 