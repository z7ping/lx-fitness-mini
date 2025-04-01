// pages/plan/index.js
const app = getApp()
const { dataService, getTypeDisplayName } = require('../../services/dataService')
const { WEEKDAY_MAPPING, TIME_SLOTS } = require('../../utils/dictionary');
const utils = require('../../utils/utils')

Page({
  data: {
    planList: [],
    customPlanList: [],
    loading: false,
    todayInfo: {},
    completedCount: 0,
    totalCount: 0,
    weeklyPlan: null
  },
  onLoad() {
    this.loadTodayPlans();
    this.loadPlanList();
    this.initTodayInfo();
  },
   // 加载计划列表
   async loadPlanList() {
    try {
      this.setData({ loading: true });
      
      // 获取训练计划
      const plans = dataService.getTrainingPlans();
      
      // 调试信息
      console.log('获取到的训练计划列表:', plans);
      
      // 将计划分为系统计划和自定义计划
      const systemPlans = [
          {
            id: 1,
            title: '初级燃脂计划',
            duration: '4周',
            level: '初级',
            category: '燃脂',
            description: '适合初学者的燃脂训练计划'
          },
          {
            id: 2,
            title: '中级力量训练',
            duration: '8周',
            level: '中级',
            category: '增肌',
            description: '针对有一定基础的训练者的力量训练计划'
          }
      ];
      
      // 格式化用户自定义计划
      const customPlans = plans.map(plan => {
        console.log('处理计划:', plan);
        return {
          id: plan.id,
          title: plan.name,
          duration: plan.duration,
          level: plan.level,
          category: getTypeDisplayName(plan.type),
          description: plan.description || '自定义训练计划',
          progress: plan.progress || 0,
          exercises: plan.exercises || []
        };
      });
      
      console.log('格式化后的自定义计划:', customPlans);
      
      this.setData({
        planList: systemPlans,
        customPlanList: customPlans,
        loading: false
      });
    } catch (error) {
      console.error('加载计划列表失败:', error);
      getApp().utils.showToast('加载计划列表失败');
      this.setData({ loading: false });
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
  // 计算已完成的训练数量
  getCompletedCount(exercises) {
    if (!exercises || !exercises.length) return 0;
    return exercises.filter(e => e.completed).length;
  },
  // 加载今日计划
  loadTodayPlans() {
    try {
      this.setData({ loading: true });
      
      let todayExercises = [];
      const today = new Date();
      const dayOfWeek = utils.getDayOfWeek(today); // 返回 "周一" 到 "周日"
      
      // 1. 获取周计划中的今日训练
      const weeklyPlan = dataService.getWeeklyPlan();
      if (weeklyPlan) {
        const todayPlan = weeklyPlan.days.find(day => day.day === dayOfWeek);
        if (todayPlan && todayPlan.plans && todayPlan.plans.length > 0) {
          // 遍历每个时间段的训练
          todayPlan.plans.forEach(timePlan => {
            if (timePlan.exercises && timePlan.exercises.length > 0) {
              const exercises = timePlan.exercises.map(exercise => ({
                id: exercise.id || `weekly_${Date.now()}`,
                name: exercise.name,
                type: exercise.type || '周计划训练',
                sets: exercise.sets,
                reps: exercise.reps,
                duration: exercise.duration,
                distance: exercise.distance,
                source: 'weekly',
                timeSlot: timePlan.timeSlot,
                completed: exercise.completed || false,
                statusText: exercise.completed ? '已完成' : '未完成',
                statusClass: exercise.completed ? 'completed' : 'pending'
              }));
              todayExercises = todayExercises.concat(exercises);
            }
          });
        }
      }
      
      // 2. 获取自定义计划中的今日训练
      const trainingPlans = dataService.getTrainingPlans() || [];
      trainingPlans.forEach(plan => {
        if (!plan.completed) {  // 只处理未完成的计划
          const planExercises = plan.exercises
            .filter(exercise => {
              if (exercise.scheduledDay) {
                return exercise.scheduledDay === dayOfWeek && !exercise.completed;
              }
              return false; // 如果没有指定日期，不显示
            })
            .map(exercise => ({
              id: exercise.id || `custom_${Date.now()}`,
              name: exercise.name,
              type: exercise.type || '自定义训练',
              sets: exercise.sets,
              reps: exercise.reps,
              duration: exercise.duration,
              distance: exercise.distance,
              source: 'custom',
              planId: plan.id,
              planName: plan.name,
              timeSlot: exercise.timeSlot || '上午',
              completed: exercise.completed || false,
              statusText: exercise.completed ? '已完成' : '未完成',
              statusClass: exercise.completed ? 'completed' : 'pending'
            }));
          
          todayExercises = todayExercises.concat(planExercises);
        }
      });

      // 3. 按时间段排序
      const timeSlotOrder = TIME_SLOTS; // 从dictionary.js引入
      todayExercises.sort((a, b) => {
        return timeSlotOrder.indexOf(a.timeSlot) - timeSlotOrder.indexOf(b.timeSlot);
      });

      // 4. 更新页面数据
      this.setData({
        todayExercises,
        hasPlans: todayExercises.length > 0,
        loading: false
      });

    } catch (error) {
      console.error('加载今日计划失败:', error);
      this.setData({ 
        loading: false, 
        hasPlans: false
      });
    }
  },
  // 创建自定义计划
  createCustomPlan() {
    wx.navigateTo({
      url: '/pages/plan/create'
    });
  },
  // 生成AI训练计划
  generateAIPlan() {
    wx.navigateTo({
      url: '/pages/plan/ai-generate'
    });
  },
  // 查看计划详情
  viewPlanDetail(e) {
    const { id, type } = e.currentTarget.dataset;
    
    // type为'system'表示系统计划，'custom'表示自定义计划
    if (type === 'custom') {
      // 查看自定义计划详情
      wx.navigateTo({
        url: `/pages/myplan/detail?id=${id}&type=custom`
      });
    } else {
      // 查看系统计划详情
      wx.navigateTo({
        url: `/pages/myplan/detail?id=${id}&type=system`
      });
    }
  },
  onShow() {
    // 每次显示页面时重新加载数据
    this.loadPlanList();
    this.loadTodayPlans();
  }
});