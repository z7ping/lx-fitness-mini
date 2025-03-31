// pages/plan/index.js
const app = getApp()
const { dataService } = require('../../services/dataService')
const utils = require('../../utils/utils')

Page({
  data: {
    activeTab: 0,
    weekRange: null,
    currentWeek: 1,
    trainingPlan: [],
    weekDays: [], // 添加weekDays数组
    planList: [],
    customPlanList: [],
    dietPlan: [],
    timeSlots: ['早晨', '上午', '下午', '晚上'],
    loading: false,
    currentMonth: '',
    calendarDays: [],
    todayInfo: {},
    todayPlans: [],
    todayDiet: {
      breakfast: {
        content: '全麦面包 2片、鸡蛋 1个、牛奶 250ml',
        calories: 300
      },
      lunch: {
        content: '糙米饭、清炒西兰花、煎鸡胸肉',
        calories: 450
      },
      dinner: {
        content: '燕麦片、酸奶、混合坚果',
        calories: 350
      }
    },
    completedCount: 0,
    totalCount: 0,
    weeklyPlan: null,
    currentDayIndex: 0
  },
  onLoad() {
    this.loadWeeklyPlans().then(() => {
      this.loadTodayPlans();
      this.loadPlanList();
      this.initCalendar();
      this.initTodayInfo();
    });
  },
  initWeekInfo() {
    const now = new Date();
    const weekday = ['日', '一', '二', '三', '四', '五', '六'];
    const weekDays = [];
    
    // 生成本周的日期信息
    for (let i = 0; i < 7; i++) {
      const date = new Date(now);
      date.setDate(now.getDate() - now.getDay() + i);
      weekDays.push({
        date: date.getDate(),
        weekday: weekday[i],
        isToday: date.toDateString() === now.toDateString()
      });
    }
    
    this.setData({
      weekDays,
      currentWeek: Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7)
    });
  },
  // 初始化日历
  initCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const today = now.getDate();
    const weekday = ['日', '一', '二', '三', '四', '五', '六'];
    
    // 设置当前月份显示
    this.setData({
      currentMonth: `${year}年${month}月`
    });

    // 生成最近7天的日历数据
    const calendarDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(today - 3 + i); // 从前3天到后3天
      const dayObj = {
        date: date.getDate(),
        weekday: weekday[date.getDay()],
        active: i === 3 // 当天高亮
      };
      calendarDays.push(dayObj);
    }

    this.setData({ calendarDays });
  },
  // 加载周计划
  async loadWeeklyPlans() {
    try {
      this.setData({ loading: true });
      // 获取周计划
      const weeklyPlan = dataService.getWeeklyPlan();
      console.log("===>weeklyPlan", weeklyPlan);
      if (weeklyPlan && weeklyPlan.days) {
        // 1. 初始化周信息
        const now = new Date();
        const weekday = ['一', '二', '三', '四', '五', '六', '日']; // 修改顺序为周一到周日
        const weekDays = [];
        
        // 2. 生成本周的日期信息并关联训练计划
        for (let i = 0; i < 7; i++) {
          const date = new Date(now);
          // 修改日期计算逻辑，使其从周一开始
          const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
          date.setDate(now.getDate() + mondayOffset + i);
          
          // 3. 找到对应的计划
          const dayOfWeek = `周${weekday[i]}`; // 现在 i=0 对应周一
          const dayPlan = weeklyPlan.days.find(d => d.day === dayOfWeek);
          
          weekDays.push({
            date: date.getDate(),
            day: dayOfWeek,
            weekday: weekday[i],
            isToday: date.toDateString() === now.toDateString(),
            plans: dayPlan ? dayPlan.plans : []  // 确保有 plans 数组
          });
        }

        // 4. 获取当前日期是星期几并调整索引
        const today = now.getDay();
        const activeTabIndex = today === 0 ? 6 : today - 1; // 调整为0-6，对应周一到周日
        
        this.setData({
          weekDays,
          weeklyPlan,
          currentDayIndex: activeTabIndex,
          activeTab: activeTabIndex,  // 设置当前标签为今天
          loading: false
        });
      } else {
        this.setData({
          weekDays: [],
          weeklyPlan: null,
          loading: false
        });
        console.error('周计划数据无效');
      }
    } catch (error) {
      console.error('加载周计划失败:', error);
      this.setData({ 
        loading: false,
        weekDays: [],
        weeklyPlan: null
      });
    }
  },
  // 切换计划类型标签
  onTabChange(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (index !== this.data.activeTab) {
      this.setData({
        activeTab: index
      });
    }
  },
  // 切换到上一周
  prevWeek() {
    // TODO: 加载上一周的计划
    getApp().utils.showToast('加载上一周计划');
  },
  // 切换到下一周
  nextWeek() {
    // TODO: 加载下一周的计划
    getApp().utils.showToast('加载下一周计划');
  },
  // 编辑计划
  editPlan(e) {
    const { type, day } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/plan/edit?type=${type}&day=${day}`
    });
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
          category: this.getTypeDisplayName(plan.type),
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
  // 切换月份
  prevMonth() {
    // 实现上个月逻辑
  },
  nextMonth() {
    // 实现下个月逻辑
  },
  // 选择日期
  selectDay(e) {
    const { index } = e.currentTarget.dataset;
    const calendarDays = this.data.calendarDays.map((day, i) => ({
      ...day,
      active: i === index
    }));
    this.setData({ calendarDays });
    // 加载选中日期的计划
    this.loadDayPlans(index);
  },
  // 初始化今日信息
  initTodayInfo() {
    const now = new Date();
    const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    
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
      const timeSlotOrder = ['早晨', '上午', '下午', '晚上'];
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
  // 切换Tab
  switchTab(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    if (this.data.activeTab !== index) {
      this.setData({ activeTab: index });
    }
  },
  // 完成训练
  completeTraining(e) {
    const { index, source, planId } = e.currentTarget.dataset;
    
    wx.showLoading({ title: '正在保存...' });
    
    try {
      if (source === 'weekly') {
        // 如果是周计划中的训练
        // 获取今天是星期几
        const today = new Date();
        const dayOfWeek = utils.getDayOfWeek(today);
        
        // 更新周计划中的完成状态
        dataService.updateWeeklyExerciseCompletion(dayOfWeek, index, true);
        
        // 更新页面数据
        const todayExercises = [...this.data.todayExercises];
        todayExercises[index].completed = true;
        todayExercises[index].statusText = '已完成';
        todayExercises[index].statusClass = 'completed';
        
        this.setData({
          todayExercises
        });
      } else if (source === 'training' && planId) {
        // 如果是训练计划中的训练
        const trainingPlans = dataService.getTrainingPlans();
        const planIndex = trainingPlans.findIndex(p => p.id == planId);
        
        if (planIndex !== -1) {
          // 更新训练计划中的完成状态
          trainingPlans[planIndex].exercises[index].completed = true;
          
          // 计算整体进度
          const totalExercises = trainingPlans[planIndex].exercises.length;
          const completedExercises = trainingPlans[planIndex].exercises.filter(e => e.completed).length;
          trainingPlans[planIndex].progress = Math.floor((completedExercises / totalExercises) * 100);
          
          // 检查是否全部完成
          trainingPlans[planIndex].completed = completedExercises === totalExercises;
          
          // 保存更新后的计划
          dataService.saveTrainingPlan(trainingPlans[planIndex]);
          
          // 更新页面数据
          const todayExercises = [...this.data.todayExercises];
          todayExercises[index].completed = true;
          todayExercises[index].statusText = '已完成';
          todayExercises[index].statusClass = 'completed';
          
          this.setData({
            todayExercises
          });
        }
      }
        
        wx.hideLoading();
        wx.showToast({
          title: '训练完成',
          icon: 'success'
        });

        // 延迟跳转到打卡页面
        setTimeout(() => {
          wx.navigateTo({
            url: '/pages/checkin/create'
          });
        }, 800);
    } catch (error) {
      console.error('完成训练失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '操作失败',
        icon: 'none'
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
  },
  // 查看更多计划
  viewMorePlans() {
    try {
      // 根据数据来源决定跳转到哪个页面
      if (this.data.planSource === 'training' && this.data.sourcePlanId) {
        // 如果数据来自训练计划，跳转到训练计划详情页
        wx.navigateTo({
          url: `/pages/myplan/detail?id=${this.data.sourcePlanId}&type=custom`
        });
      } else {
        // 否则跳转到周计划页面
        wx.navigateTo({
          url: '/pages/plan/weekly'
        });
      }
    } catch (error) {
      console.error('跳转失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },
  // 开始自定义训练
  startCustomTraining(e) {
    const { planId } = e.currentTarget.dataset;
    if (!planId) {
      wx.showToast({
        title: '计划数据无效',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `/pages/training/start?planId=${planId}&type=custom`
    });
  }
});