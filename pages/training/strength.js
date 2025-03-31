// 力量训练页面
const app = getApp();
const { dataService, EVENT_TYPES } = require('../../services/dataService');

Page({
  data: {
    exercise: null,
    currentSet: 1,
    restTimer: null,
    restTime: 90, // 默认休息时间（秒）
    isResting: false,
    showRestTimer: false,
    startTime: null,
    sets: [], // 记录每组的完成情况
    loading: true,
    plans: [],
    hasPlans: false
  },

  onLoad(options) {
    // 检查登录状态
    if (!app.checkLoginAndAuth()) {
      return;
    }

    const exercise = {
      id: options.exerciseId,
      planId: options.planId,
      name: options.name || '力量训练',
      type: options.type || 'strength',
      sets: parseInt(options.sets) || 3,
      reps: parseInt(options.reps) || 12,
      weight: parseFloat(options.weight) || 0,
      description: options.description
    };
    
    this.setData({ 
      exercise,
      startTime: new Date()
    });

    // 初始化训练记录
    this.initExerciseRecord();

    // 绑定事件处理函数
    this.handleExerciseRecordAdded = this.handleExerciseRecordAdded.bind(this);
    
    // 添加事件监听器
    dataService.addEventListener(EVENT_TYPES.EXERCISE_RECORD_ADDED, this.handleExerciseRecordAdded);

    this.loadPlans();
  },

  onUnload() {
    // 清除计时器
    if (this.data.restTimer) {
      clearInterval(this.data.restTimer);
    }

    // 移除事件监听器
    dataService.removeEventListener(EVENT_TYPES.EXERCISE_RECORD_ADDED, this.handleExerciseRecordAdded);
  },

  // 处理运动记录添加事件
  handleExerciseRecordAdded(record) {
    if (record.type === 'strength' && record.planId === this.data.exercise.planId) {
      // 更新训练计划进度
      this.updatePlanProgress();
    }
  },

  // 初始化训练记录
  initExerciseRecord() {
    this.setData({
      sets: Array(this.data.exercise.sets).fill().map(() => ({
        completed: false,
        time: null
      }))
    });
  },

  // 完成一组
  completeSet() {
    const { currentSet, exercise, sets } = this.data;
    
    // 记录当前组完成情况
    const updatedSets = [...sets];
    updatedSets[currentSet - 1] = {
      completed: true,
      time: new Date()
    };

    if (currentSet < exercise.sets) {
      this.setData({ 
        currentSet: currentSet + 1,
        isResting: true,
        showRestTimer: true,
        sets: updatedSets
      });
      this.startRestTimer();
    } else {
      // 完成所有组数
      this.setData({
        sets: updatedSets
      }, () => {
        this.completeExercise();
      });
    }

    // 播放完成提示音
    wx.vibrateShort();
  },

  // 开始休息计时
  startRestTimer() {
    let remainingTime = this.data.restTime;
    
    // 清除可能存在的旧计时器
    if (this.data.restTimer) {
      clearInterval(this.data.restTimer);
    }

    const timer = setInterval(() => {
      remainingTime--;
      if (remainingTime <= 0) {
        clearInterval(timer);
        this.setData({ 
          isResting: false,
          showRestTimer: false,
          restTime: 90 // 重置休息时间
        });
        // 播放提示音
        wx.vibrateShort();
      } else {
        this.setData({ restTime: remainingTime });
      }
    }, 1000);

    this.setData({ restTimer: timer });
  },

  // 跳过休息
  skipRest() {
    if (this.data.restTimer) {
      clearInterval(this.data.restTimer);
    }
    this.setData({ 
      isResting: false,
      showRestTimer: false,
      restTime: 90 // 重置休息时间
    });
  },

  // 完成训练
  completeExercise() {
    const { exercise, startTime, sets } = this.data;
    
    // 计算训练时长（毫秒）
    const endTime = new Date();
    const duration = endTime - startTime;

    // 准备训练数据
    const trainingData = {
      type: exercise.type,
      name: exercise.name,
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight,
      duration: Math.round(duration / 1000), // 转换为秒
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      setDetails: sets,
      calories: this.calculateCalories(duration, exercise.weight),
      planId: exercise.planId
    };
    
    // 保存训练记录
    dataService.saveExerciseRecord(trainingData);

    // 如果是计划内训练，更新计划进度
    if (exercise.planId) {
      this.updatePlanProgress();
    }

    // 显示完成提示
    wx.showToast({
      title: '训练完成！',
      icon: 'success',
      duration: 2000
    });

    // 延迟跳转到完成页面
    setTimeout(() => {
      wx.redirectTo({
        url: '/pages/training/complete'
      });
    }, 2000);
  },

  // 计算消耗的卡路里
  calculateCalories(duration, weight) {
    // 简单的卡路里计算公式
    // MET值（力量训练约为3.0-6.0，这里取4.0）* 体重(kg) * 时长(小时)
    const MET = 4.0;
    const hours = duration / (1000 * 60 * 60); // 将毫秒转换为小时
    const userWeight = weight || 70; // 如果没有重量数据，假设用户体重70kg
    return Math.round(MET * userWeight * hours);
  },

  // 更新训练计划进度
  updatePlanProgress() {
    if (this.data.exercise.planId) {
      dataService.updatePlanProgress(this.data.exercise.planId);
    }
  },

  loadPlans() {
    // Implementation of loadPlans method
  }
}); 