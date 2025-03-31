// pages/myplan/index.js
const app = getApp();
const { dataService } = require('../../services/dataService');
const utils = require('../../utils/utils');
Page({
  data: {
    activeTab: 0,
    planType: 'training', // 新增：计划类型（training/diet）
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
    weeklyPlan: null,
    isPreviewMode: false
  },
  onLoad(options) {
    // 检查是否是预览模式
    if (options && options.mode === 'preview') {
      this.setData({ isPreviewMode: true });
      this.loadPreviewData();
    } else {
      // 先加载周计划，因为它包含了日期信息
      this.loadWeeklyPlans();
      // 再加载其他计划列表
      this.loadPlanList();
    }
    
    // 初始化日历
    this.initCalendar();
    
    // 设置当前日期对应的标签为激活状态
    const now = new Date();
    const currentDay = now.getDay();
    this.setData({
      activeTab: currentDay === 0 ? 6 : currentDay - 1 // 调整为周一到周日
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
        const weekday = ['一', '二', '三', '四', '五', '六', '日'];
        const weekDays = [];
        
        // 2. 生成本周的日期信息并关联训练计划
        for (let i = 0; i < 7; i++) {
          const date = new Date(now);
          const mondayOffset = now.getDay() === 0 ? -6 : 1 - now.getDay();
          date.setDate(now.getDate() + mondayOffset + i);
          
          // 3. 找到对应的计划
          const dayOfWeek = `周${weekday[i]}`;
          const dayPlan = weeklyPlan.days.find(d => d.day === dayOfWeek);
          
          // 4. 获取当天的训练计划
          const dayExercises = [];
          if (dayPlan && dayPlan.plans) {
            dayPlan.plans.forEach(timePlan => {
              if (timePlan.exercises && timePlan.exercises.length > 0) {
                timePlan.exercises.forEach(exercise => {
                  dayExercises.push({
                    ...exercise,
                    timeSlot: this.formatTimeSlot(timePlan.timeSlot),
                    completed: exercise.completed || false
                  });
                });
              }
            });
          }
          
          weekDays.push({
            date: date.getDate(),
            day: dayOfWeek,
            weekday: weekday[i],
            isToday: date.toDateString() === now.toDateString(),
            exercises: dayExercises,
            diet: dayPlan ? dayPlan.diet : {
              breakfast: { content: '暂无安排' },
              lunch: { content: '暂无安排' },
              dinner: { content: '暂无安排' }
            }
          });
        }

        this.setData({
          weekDays,
          weeklyPlan,
          currentWeek: Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7),
          loading: false
        });

        console.log('处理后的周计划数据:', weekDays);
      } else {
        this.setData({
          weekDays: [],
          loading: false
        });
      }
      
    } catch (error) {
      console.error('加载周计划失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },
  // 格式化时间段显示
  formatTimeSlot(timeSlot) {
    const timeSlotMap = {
      'morning': '早晨',
      'noon': '中午',
      'evening': '晚上'
    };
    return timeSlotMap[timeSlot] || timeSlot;
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
      // TODO: 从服务器获取计划列表
      this.setData({
        planList: [
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
        ],
        customPlanList: [
          {
            id: 101,
            title: '自定义训练A',
            duration: '持续',
            category: '混合',
            description: '个性化定制的训练计划'
          }
        ]
      });
    } catch (error) {
      console.error('加载计划列表失败:', error);
      getApp().utils.showToast('加载计划列表失败');
    } finally {
      this.setData({ loading: false });
    }
  },
  // 完成训练并跳转到打卡页面
  completeTraining(e) {
    const { day, timeSlot } = e.currentTarget.dataset;
    
    try {
      const weekDays = [...this.data.weekDays];
      const dayIndex = weekDays.findIndex(item => item.day === day);
      
      if (dayIndex !== -1) {
        // 获取该时间段的所有训练
        const exercises = weekDays[dayIndex].exercises.filter(ex => ex.timeSlot === timeSlot);
        
        if (exercises.length > 0) {
          // 将该时间段的所有训练标记为已完成
          exercises.forEach(exercise => {
            exercise.completed = true;
          });
          
          // 更新页面数据
          this.setData({ weekDays });
          
          // 更新存储
          const weeklyPlan = dataService.getWeeklyPlan();
          const dayPlan = weeklyPlan.days.find(d => d.day === day);
          if (dayPlan) {
            dayPlan.plans = dayPlan.plans || [];
            const timePlan = dayPlan.plans.find(p => p.timeSlot === timeSlot);
            if (timePlan) {
              timePlan.completed = true;
              timePlan.exercises.forEach(ex => {
                ex.completed = true;
              });
              dataService.saveWeeklyPlan(weeklyPlan);
            }
          }

          // 跳转到打卡页面，并传递相关信息
          wx.navigateTo({
            url: '/pages/checkin/create',
            success: (res) => {
              res.eventChannel.emit('acceptTrainingData', {
                day,
                timeSlot,
                exercises,
                totalDuration: exercises.reduce((total, ex) => total + (ex.duration || 0), 0)
              });
            }
          });
        }
      }
    } catch (error) {
      console.error('完成训练失败:', error);
      wx.showToast({
        title: '操作失败',
        icon: 'none'
      });
    }
  },
  // 创建自定义计划
  createCustomPlan() {
    wx.navigateTo({
      url: '/pages/myplan/create'
    });
  },
  // 生成AI训练计划
  generateAIPlan() {
    wx.navigateTo({
      url: '/pages/myplan/ai-generate'
    });
  },
  // 切换计划类型
  switchPlanType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ planType: type });
  },
  // 创建饮食计划
  createDietPlan() {
    wx.navigateTo({
      url: '/pages/diet/create'
    });
  },
  // 生成AI饮食计划
  generateAIDietPlan() {
    wx.navigateTo({
      url: '/pages/diet/ai-generate'
    });
  },
  onShow() {
    // 每次显示页面时重新加载数据
    this.loadWeeklyPlans();
  },
  // 创建计划后的回调
  onPlanCreated() {
    // 立即重新加载数据
    this.loadWeeklyPlans();
  },
  // 查看计划详情
  viewPlanDetail(e) {
    const { id, type } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/myplan/detail?id=${id}&type=${type}`
    });
  },
  // 需要添加开始训练的方法
  startTimeSlotTraining(e) {
    const { timeSlot, exercises } = e.currentTarget.dataset;
    if (!exercises || exercises.length === 0) return;
    
    // 找到第一个未完成的训练
    const nextExercise = exercises.find(e => !e.completed);
    if (nextExercise) {
      let url = '';
      switch(nextExercise.type) {
        case '跑步':
        case '有氧':
          url = `/pages/training/cardio`;
          break;
        case '力量':
        case '力量训练':
          url = `/pages/training/strength`;
          break;
        case '拉伸':
        case '柔韧性':
          url = `/pages/training/stretch`;
          break;
        default:
          url = `/pages/training/custom`;
      }

      // 添加训练参数
      const params = {
        exerciseId: nextExercise.id,
        name: nextExercise.name,
        sets: nextExercise.sets,
        reps: nextExercise.reps,
        duration: nextExercise.duration,
        weight: nextExercise.weight,
        distance: nextExercise.distance,
        description: nextExercise.description,
        timeSlot: timeSlot
      };

      url += '?' + Object.entries(params)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&');

      wx.navigateTo({ url });
    }
  },
  // 加载预览数据
  loadPreviewData() {
    try {
      // 从临时存储中获取预览数据
      const previewData = wx.getStorageSync('temp_preview_plan');
      if (!previewData || !previewData.weeklyPlan) {
        wx.showToast({
          title: '预览数据不存在',
          icon: 'none'
        });
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        return;
      }
      
      console.log('预览数据:', previewData);
      
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: '计划预览'
      });
      
      // 设置周计划数据
      this.setData({
        weeklyPlan: previewData.weeklyPlan,
        weekDays: previewData.weeklyPlan.days,
        isPreviewMode: true,
        loading: false
      });
      
    } catch (error) {
      console.error('加载预览数据失败:', error);
      wx.showToast({
        title: '加载预览失败',
        icon: 'none'
      });
    }
  },
  // 返回上一页
  navigateBack() {
    wx.navigateBack();
  }
});