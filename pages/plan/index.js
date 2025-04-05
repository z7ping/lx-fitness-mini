// pages/myplan/index.js
const app = getApp();
const { dataService } = require('../../services/dataService');
const utils = require('../../utils/utils');
Page({
  data: {
    activeTab: 0,
    planType: 'training', // 计划类型（training/diet）
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
    isPreviewMode: false,
    mode: 'preview', // 默认为预览模式，可选值：edit(编辑)、preview(预览)、training(跟练)
    draggingIndex: -1, // 拖拽排序时的索引
    currentExerciseId: '', // 当前选中的训练动作ID
    timerDisplay: '00:00', // 计时器显示
    progressPercent: 0, // 进度百分比
    timerInterval: null, // 计时器间隔
    originalPlan: null, // 保存原始计划用于取消编辑
    planName: '我的训练计划', // 添加计划名称字段
    showAddTimeSlotPopup: false, // 添加时间段弹窗显示状态
    newTimeSlot: '早晨', // 新添加的时间段
    availableTimeSlots: ['早晨', '上午', '下午', '晚上'], // 可选的时间段列表
    isEditingPlanName: false, // 是否正在编辑计划名称
    hasPlaceholderExercises: {}, // 存储每个时间段是否有占位符的状态
    showMealEditPopup: false,
    mealTypeNames: {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snack: '零食/加餐'
    },
    editingMealType: '',
    editingDay: '',
    editingSnackIndex: -1,
    isEditingSnack: false,
    isNewSnack: false,
    editingMeal: {
      content: '',
      calories: 0,
      nutrition: {
        protein: 0,
        carbs: 0,
        fat: 0
      },
      name: '',
      selectedFoods: [],
      notes: ''
    }
  },
  onLoad(options) {
    // 检查是否是预览模式
    if (options && options.mode === 'preview') {
      this.setData({ isPreviewMode: true });
      this.loadPreviewData();
    } else {
      // 根据URL参数设置默认计划类型
      if (options && options.type) {
        this.setData({ planType: options.type });
      }
      // 先加载周计划，因为它包含了日期信息
      this.loadWeeklyPlans();
    }
    
    // 初始化日历
    this.initCalendar();
    
    // 设置当前日期对应的标签为激活状态
    const now = new Date();
    const currentDay = now.getDay();
    this.setData({
      activeTab: currentDay === 0 ? 6 : currentDay - 1 // 调整为周一到周日
    });

    // 设置一个页面级别的回调函数，让select页面可以直接调用
    this.exerciseSelectedCallback = (exercise) => {
      console.log('通过回调接收到训练数据:', exercise);
      this.onExerciseSelected(exercise);
    };
  },
  
  onShow() {
    // 如果是预览模式，加载预览数据
    if (this.data.isPreviewMode) {
      this.loadPreviewData();
      return;
    }
    
    // 从plan_create页面返回，重新加载数据
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const prevPage = pages.length > 1 ? pages[pages.length - 2] : null;
    
    // 检查是否需要刷新数据
    if (this.data.needRefresh || 
        (prevPage && 
         (prevPage.route === 'pages/plan/create' || 
          prevPage.route === 'pages/plan/ai-generate'))) {
      this.loadWeeklyPlans();
      this.setData({ needRefresh: false });
    }
    
    // 检查是否有临时选择的训练
    const tempSelectedExercises = wx.getStorageSync('tempSelectedExercises');
    if (tempSelectedExercises && tempSelectedExercises.length > 0) {
      console.log('在onShow中发现临时选择的训练:', tempSelectedExercises);
      
      // 使用第一个训练数据
      const exercise = tempSelectedExercises[0];
      if (exercise) {
        this.onExerciseSelected(exercise);
      }
      
      // 清除临时数据
      wx.removeStorageSync('tempSelectedExercises');
    }
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
        // 获取计划名称
        const planName = weeklyPlan.name || '我的训练计划';
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
                    completed: this.data.isPreviewMode ? false : (exercise.completed || false)
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
            },
            showActions: !this.data.isPreviewMode
          });
        }

        // 更新占位符状态
        this.updatePlaceholderStatus(weekDays);

        this.setData({
          weekDays,
          weeklyPlan,
          planName: planName,
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
    const { TIME_SLOTS } = require('../../utils/dictionary');
    return TIME_SLOTS.DISPLAY_TEXT[timeSlot] || timeSlot;
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
  // 完成训练并跳转到打卡页面
  completeTraining(e) {
    if (this.data.isPreviewMode) return;
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
          
          // 保存更新后的数据
          this.saveWeeklyPlan(weekDays);
          
          // 提示用户
          wx.showToast({
            title: '完成训练！',
            icon: 'success'
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
      url: '/pages/plan/create'
    });
  },
  // 生成AI训练计划
  generateAIPlan() {
    wx.navigateTo({
      url: '/pages/plan/ai-generate'
    });
  },
  // 切换计划类型
  switchPlanType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ planType: type });
    
    // 保存用户偏好（可选）
    wx.setStorageSync('preferredPlanType', type);
  },
  
  // 切换模式（编辑、预览、跟练）
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode;
    
    // 如果从编辑模式切换出去，提示是否保存更改
    if (this.data.mode === 'edit' && mode !== 'edit') {
      wx.showModal({
        title: '提示',
        content: '是否保存当前编辑的更改？',
        confirmText: '保存',
        cancelText: '不保存',
        success: (res) => {
          if (res.confirm) {
            this.saveChanges();
          } else {
            // 不保存，恢复原始数据
            if (this.data.originalPlan) {
              this.setData({
                weekDays: JSON.parse(JSON.stringify(this.data.originalPlan)),
                originalPlan: null
              });
            }
          }
          this.setData({ mode });
        }
      });
    } else {
      // 如果进入编辑模式，保存原始数据
      if (mode === 'edit') {
        this.setData({
          originalPlan: JSON.parse(JSON.stringify(this.data.weekDays))
        });
      }
      
      // 如果从跟练模式切换出去，清除计时器
      if (this.data.mode === 'training' && mode !== 'training') {
        this.clearTrainingTimer();
      }
      
      this.setData({ mode });
    }
  },
  
  // 拖拽开始
  dragStart(e) {
    const index = e.currentTarget.dataset.index;
    const timeSlot = e.currentTarget.dataset.timeSlot;
    const day = e.currentTarget.dataset.day;
    
    // 保存起始位置和相关信息
    this.dragInfo = {
      index,
      timeSlot,
      day,
      startY: e.touches[0].clientY,
      currentY: e.touches[0].clientY,
      moved: false
    };
    
    this.setData({
      draggingIndex: index
    });
  },
  
  // 拖拽移动
  dragMove(e) {
    if (!this.dragInfo) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - this.dragInfo.startY;
    
    // 超过5px才认为开始移动，避免误触
    if (Math.abs(deltaY) > 5) {
      this.dragInfo.moved = true;
    }
    
    if (this.dragInfo.moved) {
      // 更新当前Y坐标
      this.dragInfo.currentY = currentY;
      
      // 这里可以添加视觉反馈，比如改变拖拽项的样式
      // 但要注意小程序的性能限制，不要频繁setData
    }
  },
  
  // 拖拽结束
  dragEnd(e) {
    if (!this.dragInfo || !this.dragInfo.moved) {
      // 如果没有移动，重置状态
      this.setData({ draggingIndex: -1 });
      this.dragInfo = null;
      return;
    }
    
    const { index, timeSlot, day } = this.dragInfo;
    const endY = e.changedTouches[0].clientY;
    const deltaY = endY - this.dragInfo.startY;
    
    // 获取当前激活标签页的日期数据
    const weekDays = [...this.data.weekDays];
    const dayIndex = weekDays.findIndex(item => item.day === day);
    
    if (dayIndex === -1) {
      // 未找到对应日期，重置状态
      this.setData({ draggingIndex: -1 });
      this.dragInfo = null;
      return;
    }
    
    // 获取当前时间段的训练列表
    const exercises = weekDays[dayIndex].exercises.filter(ex => ex.timeSlot === timeSlot);
    
    // 计算目标位置
    // 每个项目估计高度为120rpx（根据实际UI调整）
    const itemHeight = 120;
    const moveItems = Math.round(deltaY / itemHeight);
    
    if (moveItems !== 0 && exercises.length > 1) {
      // 计算新位置
      let newIndex = index + moveItems;
      // 确保新位置在有效范围内
      newIndex = Math.max(0, Math.min(exercises.length - 1, newIndex));
      
      if (newIndex !== index) {
        // 获取所有训练项
        const allExercises = weekDays[dayIndex].exercises;
        
        // 找出当前时间段的所有项目在总列表中的索引
        const timeSlotIndices = allExercises
          .map((ex, idx) => ex.timeSlot === timeSlot ? idx : -1)
          .filter(idx => idx !== -1);
        
        // 获取要移动的项目
        const fromIndex = timeSlotIndices[index];
        const toIndex = timeSlotIndices[newIndex];
        
        if (fromIndex !== undefined && toIndex !== undefined) {
          // 执行数组元素交换
          const item = allExercises[fromIndex];
          allExercises.splice(fromIndex, 1);
          allExercises.splice(toIndex, 0, item);
          
          // 更新数据
          this.setData({ 
            weekDays,
            draggingIndex: -1 
          });
          
          // 保存更新后的数据
          this.saveWeeklyPlan(weekDays);
        }
      }
    }
    
    // 重置拖拽状态
    this.setData({ draggingIndex: -1 });
    this.dragInfo = null;
  },
  // 检查时间段是否需要显示添加按钮
  shouldShowAddButton(exercises) {
    if (!exercises) return false;
    // 修改逻辑：在编辑模式下始终显示添加按钮，不管是否有占位符
    return true;
  },
  
  // 更新每个时间段是否有占位符的状态
  updatePlaceholderStatus(weekDays) {
    const hasPlaceholderExercises = {};
    
    weekDays.forEach(day => {
      if (day.exercises && day.exercises.length > 0) {
        // 按时间段分组
        const exercisesByTimeSlot = {};
        day.exercises.forEach(exercise => {
          if (!exercisesByTimeSlot[exercise.timeSlot]) {
            exercisesByTimeSlot[exercise.timeSlot] = [];
          }
          exercisesByTimeSlot[exercise.timeSlot].push(exercise);
        });
        
        // 检查每个时间段是否有占位符
        Object.keys(exercisesByTimeSlot).forEach(timeSlot => {
          const key = `${day.day}_${timeSlot}`;
          hasPlaceholderExercises[key] = exercisesByTimeSlot[timeSlot].some(function(exercise) {
            return exercise.isPlaceholder;
          });
        });
      }
    });
    
    this.setData({ hasPlaceholderExercises });
  },
  
  // 检查指定日期和时间段是否有占位符
  hasPlaceholderInTimeSlot(day, timeSlot) {
    const key = `${day}_${timeSlot}`;
    return this.data.hasPlaceholderExercises[key] || false;
  },
  // 添加动作到时间段
  addExerciseToTimeSlot(e) {
    if (this.data.mode !== 'edit') {
      console.log('当前不是编辑模式，忽略添加动作请求');
      return;
    }
    
    const timeSlot = e.currentTarget.dataset.timeSlot;
    const day = e.currentTarget.dataset.day;
    
    console.log(`准备添加动作到: ${day} ${timeSlot}`);
    
    if (!timeSlot || !day) {
      console.error('时间段或日期参数缺失:', { timeSlot, day });
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      return;
    }
    
    // 清除可能存在的旧数据
    wx.removeStorageSync('tempSelectedExercises');
    
    // 保存当前选择的时间段供回跳时使用
    wx.setStorageSync('currentEditTimeSlot', { timeSlot, day });
    console.log('已保存时间段信息到Storage:', { timeSlot, day });
    
    // 跳转到训练动作库页面
    wx.navigateTo({
      url: '/pages/exercise/select',
      success: (res) => {
        console.log('成功跳转到动作选择页面');
        
        // 尝试设置事件通道
        try {
          const eventChannel = res.eventChannel;
          console.log('设置eventChannel');
          
          eventChannel.on('acceptExercise', (data) => {
            console.log('通过eventChannel收到数据:', data);
            this.onExerciseSelected(data);
          });
        } catch (error) {
          console.error('设置eventChannel失败:', error);
        }
      },
      fail: (error) => {
        console.error('跳转到动作选择页面失败:', error);
        wx.showToast({
          title: '页面跳转失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 从训练库选择后回调
  onExerciseSelected(exercise) {
    console.log('onExerciseSelected被调用，接收到数据:', exercise);
    
    if (!exercise) {
      console.error('exercise参数为空');
      return;
    }
    
    // 获取时间段信息
    const currentEditTimeSlot = wx.getStorageSync('currentEditTimeSlot');
    console.log('获取到的时间段信息:', currentEditTimeSlot);
    
    if (!currentEditTimeSlot) {
      console.error('未找到时间段信息');
      return;
    }
    
    const { timeSlot, day } = currentEditTimeSlot;
    console.log(`准备添加训练到: ${day} ${timeSlot}`);
    
    // 执行完后清除存储
    wx.removeStorageSync('currentEditTimeSlot');
    
    // 找到对应的日期
    const weekDays = [...this.data.weekDays];
    const dayIndex = weekDays.findIndex(item => item.day === day);
    
    if (dayIndex === -1) {
      console.error('未找到对应的日期:', day);
      return;
    }
    
    console.log('找到对应的日期索引:', dayIndex);
    
    // 处理训练项
    const newExercise = {
      ...exercise,
      id: Date.now().toString(),
      timeSlot,
      completed: false
    };
    
    console.log('创建的新训练项:', newExercise);
    
    // 直接添加新训练动作
    weekDays[dayIndex].exercises.push(newExercise);
    
    console.log('添加后的exercises:', weekDays[dayIndex].exercises);
    
    // 更新页面数据并保存
    this.setData({ weekDays }, () => {
      console.log('页面数据已更新');
      
      // 更新占位符状态
      this.updatePlaceholderStatus(weekDays);
      
      // 保存更新后的数据
      this.saveWeeklyPlan(weekDays);
      
      wx.showToast({
        title: '训练已添加',
        icon: 'success'
      });
    });
  },
  
  // 复制时间段计划到其他日期
  copyTimeSlot(e) {
    if (this.data.mode !== 'edit') return;
    
    const { timeSlot, day } = e.currentTarget.dataset;
    const sourceIndex = this.data.weekDays.findIndex(item => item.day === day);
    
    if (sourceIndex === -1) return;
    
    // 获取源时间段的所有训练
    const sourceExercises = this.data.weekDays[sourceIndex].exercises.filter(ex => ex.timeSlot === timeSlot);
    
    if (sourceExercises.length === 0) {
      wx.showToast({
        title: '没有可复制的训练',
        icon: 'none'
      });
      return;
    }
    
    // 显示日期选择器
    wx.showActionSheet({
      itemList: this.data.weekDays.map(item => item.day).filter(d => d !== day),
      success: (res) => {
        // 获取目标日期
        const targetDay = this.data.weekDays.map(item => item.day).filter(d => d !== day)[res.tapIndex];
        const targetIndex = this.data.weekDays.findIndex(item => item.day === targetDay);
        
        if (targetIndex !== -1) {
          // 复制训练到目标日期
          const weekDays = [...this.data.weekDays];
          
          // 移除目标日期该时间段的所有训练
          weekDays[targetIndex].exercises = weekDays[targetIndex].exercises.filter(ex => ex.timeSlot !== timeSlot);
          
          // 添加复制的训练
          const copiedExercises = sourceExercises.map(ex => ({
            ...ex,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
            completed: false
          }));
          
          weekDays[targetIndex].exercises = [...weekDays[targetIndex].exercises, ...copiedExercises];
          
          this.setData({ weekDays });
          
          // 更新占位符状态
          this.updatePlaceholderStatus(this.data.weekDays);
          
          wx.showToast({
            title: '复制成功',
            icon: 'success'
          });
        }
      }
    });
  },
  
  // 保存编辑模式的更改
  saveChanges() {
    if (this.data.mode !== 'edit') return;
    
    try {
      // 更新存储
      this.saveChangesToStorage();
      
      // 更新占位符状态
      this.updatePlaceholderStatus(this.data.weekDays);
      
      // 清除原始计划
      this.setData({
        originalPlan: null,
        mode: 'preview',
        isEditingPlanName: false
      });
      
      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('保存计划失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },
  
  // 保存更改到存储中
  saveChangesToStorage() {
    // 更新存储
    const weeklyPlan = dataService.getWeeklyPlan() || { days: [] };
    
    // 更新计划名称
    weeklyPlan.name = this.data.planName;
    
    // 更新每天的计划
    this.data.weekDays.forEach(dayData => {
      const dayPlan = weeklyPlan.days.find(d => d.day === dayData.day) || { day: dayData.day, plans: [] };
      
      // 按时间段分组
      const timeSlotGroups = {};
      dayData.exercises.forEach(ex => {
        if (!timeSlotGroups[ex.timeSlot]) {
          timeSlotGroups[ex.timeSlot] = [];
        }
        timeSlotGroups[ex.timeSlot].push(ex);
      });
      
      // 更新每个时间段
      Object.keys(timeSlotGroups).forEach(slot => {
        const timePlan = dayPlan.plans.find(p => p.timeSlot === slot) || { timeSlot: slot, exercises: [] };
        timePlan.exercises = timeSlotGroups[slot];
        
        // 如果是新时间段，添加到计划中
        if (!dayPlan.plans.find(p => p.timeSlot === slot)) {
          dayPlan.plans.push(timePlan);
        }
      });
      
      // 如果是新的一天，添加到周计划中
      if (!weeklyPlan.days.find(d => d.day === dayData.day)) {
        weeklyPlan.days.push(dayPlan);
      }
    });
    
    dataService.saveWeeklyPlan(weeklyPlan);
    return weeklyPlan;
  },
  
  // 取消编辑
  cancelEdit() {
    if (this.data.originalPlan) {
      this.setData({
        weekDays: JSON.parse(JSON.stringify(this.data.originalPlan)),
        originalPlan: null,
        mode: 'preview',
        isEditingPlanName: false
      });
    } else {
      this.setData({ 
        mode: 'preview',
        isEditingPlanName: false
      });
    }
  },
  
  // 编辑计划名称
  editPlanName() {
    this.setData({
      isEditingPlanName: true
    });
  },
  
  // 取消修改计划名称
  cancelEditPlanName() {
    this.setData({
      isEditingPlanName: false
    });
  },
  
  // 保存计划名称
  savePlanName(e) {
    const newName = e.detail.value.trim();
    if (newName) {
      this.setData({
        planName: newName,
        isEditingPlanName: false
      });
      
      // 保存到周计划
      if (this.data.weeklyPlan) {
        const weeklyPlan = { ...this.data.weeklyPlan };
        weeklyPlan.name = newName;
        dataService.saveWeeklyPlan(weeklyPlan);
        
        this.setData({ weeklyPlan });
      } else {
        this.saveWeeklyPlan(this.data.weekDays);
      }
      
      wx.showToast({
        title: '计划名称已更新',
        icon: 'success'
      });
    } else {
      wx.showToast({
        title: '计划名称不能为空',
        icon: 'none'
      });
      this.setData({
        isEditingPlanName: false
      });
    }
  },
  
  // 显示添加时间段弹窗
  showAddTimeSlotPopup() {
    // 获取当前未使用的时间段
    const usedTimeSlots = this.getCurrentDayTimeSlots();
    const availableTimeSlots = this.data.timeSlots.filter(slot => !usedTimeSlots.includes(slot));
    
    if (availableTimeSlots.length === 0) {
      wx.showToast({
        title: '所有时间段已添加',
        icon: 'none'
      });
      return;
    }
    
    this.setData({
      availableTimeSlots,
      newTimeSlot: availableTimeSlots[0], // 默认选择第一个可用时间段
      showAddTimeSlotPopup: true
    });
  },
  
  // 获取当前选中日期已使用的时间段
  getCurrentDayTimeSlots() {
    const { weekDays, activeTab } = this.data;
    if (!weekDays[activeTab] || !weekDays[activeTab].exercises) {
      return [];
    }
    
    // 获取当前日期已使用的所有时间段（去重）
    return [...new Set(weekDays[activeTab].exercises.map(ex => ex.timeSlot))];
  },
  
  // 添加时间段
  addTimeSlot() {
    const { newTimeSlot, weekDays, activeTab } = this.data;
    
    // 检查是否已选择时间段
    if (!newTimeSlot) {
      wx.showToast({
        title: '请选择时间段',
        icon: 'none'
      });
      return;
    }
    
    // 获取当前选中日的数据
    const currentDay = weekDays[activeTab];
    const currentDayData = { ...currentDay };
    
    // 检查是否已存在该时间段的训练
    const hasTimeSlot = currentDayData.exercises.some(ex => ex.timeSlot === newTimeSlot);
    if (hasTimeSlot) {
      wx.showToast({
        title: '该时间段已存在',
        icon: 'none'
      });
      return;
    }
    
    // 不再添加占位符，但需要在该时间段添加一个标记来确保时间段显示
    // 添加一个空的训练记录对象，只有timeSlot属性
    currentDayData.exercises.push({
      id: `timeslot_${Date.now()}`,
      name: '',
      timeSlot: newTimeSlot,
      isTimeSlotMarker: true  // 添加一个标记，表示这是一个时间段标记
    });
    
    // 更新数据
    const newWeekDays = [...weekDays];
    newWeekDays[activeTab] = currentDayData;
    
    this.setData({
      weekDays: newWeekDays,
      showAddTimeSlotPopup: false
    });
    
    // 更新占位符状态
    this.updatePlaceholderStatus(newWeekDays);
    
    // 保存更新后的数据
    this.saveWeeklyPlan(newWeekDays);
    
    wx.showToast({
      title: '时间段添加成功',
      icon: 'success'
    });
  },
  
  // 选择时间段
  selectTimeSlot(e) {
    this.setData({
      newTimeSlot: e.currentTarget.dataset.slot
    });
  },
  
  // 关闭添加时间段弹窗
  closeAddTimeSlotPopup() {
    this.setData({
      showAddTimeSlotPopup: false
    });
  },
  
  // 选择训练动作（跟练模式）
  selectExercise(e) {
    if (this.data.mode !== 'training') return;
    
    const { id } = e.currentTarget.dataset;
    
    // 清除之前的计时器
    this.clearTrainingTimer();
    
    // 设置当前选中的训练
    this.setData({
      currentExerciseId: id,
      timerDisplay: '00:00',
      progressPercent: 0
    });
    
    // 开始计时
    this.startTrainingTimer();
  },
  
  // 开始训练计时器
  startTrainingTimer() {
    let seconds = 0;
    
    // 获取当前训练的信息
    const dayIndex = this.data.activeTab;
    const exercise = this.data.weekDays[dayIndex].exercises.find(ex => ex.id === this.data.currentExerciseId);
    
    if (!exercise) return;
    
    // 计算总时长（秒）
    const totalDuration = (exercise.duration || 1) * 60;
    
    this.data.timerInterval = setInterval(() => {
      seconds++;
      
      // 更新计时器显示
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      const timerDisplay = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
      
      // 更新进度百分比
      const progressPercent = Math.min(100, (seconds / totalDuration) * 100);
      
      this.setData({
        timerDisplay,
        progressPercent
      });
      
      // 如果达到训练时长，自动完成
      if (seconds >= totalDuration) {
        this.completeCurrentExercise();
      }
    }, 1000);
  },
  
  // 清除训练计时器
  clearTrainingTimer() {
    if (this.data.timerInterval) {
      clearInterval(this.data.timerInterval);
      this.data.timerInterval = null;
    }
  },
  
  // 完成当前训练动作
  completeCurrentExercise() {
    if (this.data.mode !== 'training' || !this.data.currentExerciseId) return;
    
    // 清除计时器
    this.clearTrainingTimer();
    
    // 标记当前训练为已完成
    const dayIndex = this.data.activeTab;
    const weekDays = [...this.data.weekDays];
    const exerciseIndex = weekDays[dayIndex].exercises.findIndex(ex => ex.id === this.data.currentExerciseId);
    
    if (exerciseIndex !== -1) {
      weekDays[dayIndex].exercises[exerciseIndex].completed = true;
      
      this.setData({
        weekDays,
        currentExerciseId: '',
        timerDisplay: '00:00',
        progressPercent: 0
      });
      
      // 检查是否还有未完成的训练
      const remainingExercises = weekDays[dayIndex].exercises.filter(ex => !ex.completed);
      
      if (remainingExercises.length === 0) {
        // 所有训练都已完成
        wx.showToast({
          title: '所有训练已完成',
          icon: 'success'
        });
      } else {
        // 提示选择下一个训练
        wx.showToast({
          title: '完成！请选择下一个',
          icon: 'success'
        });
      }
    }
  },
  
  // 跳过当前训练动作
  skipCurrentExercise() {
    if (this.data.mode !== 'training' || !this.data.currentExerciseId) return;
    
    // 清除计时器
    this.clearTrainingTimer();
    
    this.setData({
      currentExerciseId: '',
      timerDisplay: '00:00',
      progressPercent: 0
    });
    
    wx.showToast({
      title: '已跳过',
      icon: 'none'
    });
  },
  
  // 完成整个训练
  finishTraining() {
    if (this.data.mode !== 'training') return;
    
    // 清除计时器
    this.clearTrainingTimer();
    
    // 标记所有训练为已完成
    const dayIndex = this.data.activeTab;
    const weekDays = [...this.data.weekDays];
    
    weekDays[dayIndex].exercises.forEach(ex => {
      ex.completed = true;
    });
    
    this.setData({
      weekDays,
      currentExerciseId: '',
      timerDisplay: '00:00',
      progressPercent: 0,
      mode: 'preview'
    });
    
    // 更新存储
    const weeklyPlan = dataService.getWeeklyPlan();
    const dayPlan = weeklyPlan.days.find(d => d.day === weekDays[dayIndex].day);
    
    if (dayPlan) {
      dayPlan.plans.forEach(timePlan => {
        timePlan.completed = true;
        timePlan.exercises.forEach(ex => {
          ex.completed = true;
        });
      });
      
      dataService.saveWeeklyPlan(weeklyPlan);
    }
    
    // 跳转到打卡页面
    wx.navigateTo({
      url: '/pages/checkin/create',
      success: (res) => {
        res.eventChannel.emit('acceptTrainingData', {
          day: weekDays[dayIndex].day,
          exercises: weekDays[dayIndex].exercises,
          totalDuration: weekDays[dayIndex].exercises.reduce((total, ex) => total + (ex.duration || 0), 0)
        });
      }
    });
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
    if (!exercises || exercises.length === 0) {
      wx.showToast({
        title: '没有可用的训练',
        icon: 'none'
      });
      return;
    }
    
    // 找到第一个未完成的训练
    const nextExercise = exercises.find(e => !e.completed);
    if (nextExercise) {
      console.log('准备开始训练:', nextExercise);
      
      let url = '';
      // 规范化训练类型
      const exerciseType = String(nextExercise.type || '').toLowerCase();
      
      // 根据训练类型选择对应页面
      if (exerciseType.includes('跑步') || exerciseType.includes('有氧')) {
        url = '/pages/training/cardio';
      } else if (exerciseType.includes('力量')) {
        url = '/pages/training/strength';
      } else if (exerciseType.includes('拉伸') || exerciseType.includes('柔韧')) {
        url = '/pages/training/stretch';
      } else {
        url = '/pages/training/strength'; // 默认使用力量训练页面
      }

      // 使用Storage传递数据，避免URL编码问题
      wx.setStorageSync('currentTrainingExercise', {
        exerciseId: nextExercise.id || '',
        name: nextExercise.name || '未命名训练',
        type: nextExercise.type || 'strength',
        sets: parseInt(nextExercise.sets) || 3,
        reps: parseInt(nextExercise.reps) || 12,
        duration: parseInt(nextExercise.duration) || 0,
        weight: parseFloat(nextExercise.weight) || 0,
        distance: parseFloat(nextExercise.distance) || 0,
        description: nextExercise.description || '',
        timeSlot: timeSlot || ''
      });
      
      console.log('已保存训练数据到storage');

      // 跳转到训练页面，不传递参数
      wx.navigateTo({
        url,
        success: () => {
          console.log('成功跳转到训练页面');
        },
        fail: (err) => {
          console.error('页面跳转失败:', err);
          wx.showToast({
            title: '页面跳转失败',
            icon: 'none'
          });
        }
      });
    } else {
      wx.showToast({
        title: '所有训练已完成',
        icon: 'success'
      });
    }
  },
  // 加载预览数据
  loadPreviewData() {
    try {
      this.setData({ loading: true });
      
      // 从临时存储中获取预览数据
      const previewData = wx.getStorageSync('temp_preview_plan');
      
      if (!previewData) {
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
      
      if (previewData && previewData.days) {
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
          const dayPlan = previewData.days.find(d => d.day === dayOfWeek);
          
          // 4. 获取当天的训练计划
          const dayExercises = [];
          if (dayPlan && dayPlan.plans) {
            dayPlan.plans.forEach(timePlan => {
              if (timePlan.exercises && timePlan.exercises.length > 0) {
                timePlan.exercises.forEach(exercise => {
                  dayExercises.push({
                    ...exercise,
                    timeSlot: this.formatTimeSlot(timePlan.timeSlot),
                    completed: this.data.isPreviewMode ? false : (exercise.completed || false)
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
            },
            showActions: !this.data.isPreviewMode
          });
        }

        this.setData({
          weekDays,
          weeklyPlan: previewData,
          currentWeek: Math.ceil((now.getDate() + new Date(now.getFullYear(), now.getMonth(), 1).getDay()) / 7),
          isPreviewMode: true,
          loading: false
        });

        console.log('处理后的预览计划数据:', weekDays);
      } else {
        this.setData({
          weekDays: [],
          loading: false
        });
      }
      
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
  },

  // 应用当前预览计划
  applyCurrentPlan() {
    wx.showModal({
      title: '确认应用',
      content: '确定要将当前预览的计划设置为您的训练计划吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            // 获取预览数据
            const previewData = wx.getStorageSync('temp_preview_plan');
            if (!previewData) {
              wx.showToast({
                title: '预览数据不存在',
                icon: 'none'
              });
              return;
            }

            // 保存为正式计划
            dataService.saveWeeklyPlan(previewData);

            wx.showToast({
              title: '应用成功',
              icon: 'success'
            });

            // 延迟返回，让用户看到成功提示
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          } catch (error) {
            console.error('应用计划失败:', error);
            wx.showToast({
              title: '应用失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
  },
  // 保存周计划数据
  saveWeeklyPlan(weekDays) {
    try {
      // 获取当前的周计划数据
      const weeklyPlan = this.data.weeklyPlan || dataService.getWeeklyPlan() || {
        name: this.data.planName,
        days: []
      };

      // 更新周计划的日数据
      weekDays.forEach(dayData => {
        const dayOfWeek = dayData.day; // 例如"周一"
        
        // 按时间段分组整理训练数据
        const timeSlotGroups = {};
        dayData.exercises.forEach(exercise => {
          if (!timeSlotGroups[exercise.timeSlot]) {
            timeSlotGroups[exercise.timeSlot] = [];
          }
          // 排除占位符和时间段标记
          if (!exercise.isPlaceholder && !exercise.isTimeSlotMarker) {
            timeSlotGroups[exercise.timeSlot].push(exercise);
          } else if (exercise.isTimeSlotMarker) {
            // 确保即使没有实际训练也保留时间段
            if (timeSlotGroups[exercise.timeSlot].length === 0) {
              // 不添加任何内容，仅保留时间段标记
            }
          }
        });
        
        // 生成当日计划数据
        const dayPlans = [];
        Object.keys(timeSlotGroups).forEach(timeSlot => {
          dayPlans.push({
            timeSlot,
            exercises: timeSlotGroups[timeSlot],
            completed: timeSlotGroups[timeSlot].every(ex => ex.completed)
          });
        });
        
        // 更新或创建该日计划
        const existingDayIndex = weeklyPlan.days.findIndex(d => d.day === dayOfWeek);
        if (existingDayIndex !== -1) {
          // 更新现有日计划，保留饮食计划数据
          const existingDiet = weeklyPlan.days[existingDayIndex].diet || {
            breakfast: { content: '暂无安排' },
            lunch: { content: '暂无安排' },
            dinner: { content: '暂无安排' }
          };
          
          weeklyPlan.days[existingDayIndex] = {
            day: dayOfWeek,
            plans: dayPlans,
            diet: dayData.diet || existingDiet
          };
        } else {
          // 创建新日计划
          weeklyPlan.days.push({
            day: dayOfWeek,
            plans: dayPlans,
            diet: dayData.diet || {
              breakfast: { content: '暂无安排' },
              lunch: { content: '暂无安排' },
              dinner: { content: '暂无安排' }
            }
          });
        }
      });
      
      // 保存周计划数据
      dataService.saveWeeklyPlan(weeklyPlan);
      console.log('周计划已保存:', weeklyPlan);
      
      // 更新数据
      this.setData({
        weeklyPlan
      });
      
      return true;
    } catch (error) {
      console.error('保存周计划失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
      return false;
    }
  },
  // 删除时间段
  deleteTimeSlot(e) {
    const { timeSlot, day } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '删除时间段',
      content: `确定要删除"${timeSlot}"时间段及其所有训练动作吗？`,
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // 找到对应的日期和时间段
          const weekDays = [...this.data.weekDays];
          const dayIndex = weekDays.findIndex(item => item.day === day);
          
          if (dayIndex !== -1) {
            // 过滤掉该时间段的所有训练
            weekDays[dayIndex].exercises = weekDays[dayIndex].exercises.filter(
              ex => ex.timeSlot !== timeSlot
            );
            
            // 更新页面数据
            this.setData({ weekDays });
            
            // 保存更新后的数据
            this.saveWeeklyPlan(weekDays);
            
            wx.showToast({
              title: '时间段已删除',
              icon: 'success'
            });
          }
        }
      }
    });
  },

  // 删除训练动作
  deleteExercise(e) {
    const { exerciseId, timeSlot, day } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '删除训练动作',
      content: '确定要删除这个训练动作吗？',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          // 找到对应的日期和训练动作
          const weekDays = [...this.data.weekDays];
          const dayIndex = weekDays.findIndex(item => item.day === day);
          
          if (dayIndex !== -1) {
            // 找到训练动作的索引
            const exerciseIndex = weekDays[dayIndex].exercises.findIndex(
              ex => ex.id === exerciseId && ex.timeSlot === timeSlot
            );
            
            if (exerciseIndex !== -1) {
              // 删除该训练动作
              weekDays[dayIndex].exercises.splice(exerciseIndex, 1);
              
              // 不再添加占位符
              
              // 更新页面数据
              this.setData({ weekDays });
              
              // 更新占位符状态
              this.updatePlaceholderStatus(weekDays);
              
              // 保存更新后的数据
              this.saveWeeklyPlan(weekDays);
              
              wx.showToast({
                title: '训练已删除',
                icon: 'success'
              });
            }
          }
        }
      }
    });
  },

  // 打开餐食编辑弹窗
  editMeal(e) {
    const { mealType, day } = e.currentTarget.dataset;
    console.log('编辑餐食', mealType, day);
    
    // 获取当前日期索引
    const dayIndex = this.data.weekDays.findIndex(item => item.day === day);
    if (dayIndex === -1) {
      wx.showToast({
        title: '未找到对应日期',
        icon: 'none'
      });
      return;
    }
    
    // 获取当前餐食内容
    const meal = this.data.weekDays[dayIndex].diet[mealType] || {
      content: '',
      calories: 0,
      nutrition: { protein: 0, carbs: 0, fat: 0 },
      selectedFoods: [],
      notes: ''
    };
    
    // 确保meal对象有name属性，默认使用mealTypeNames中的值
    if (!meal.name) {
      meal.name = this.data.mealTypeNames[mealType] || '餐食';
    }
    
    // 确保有selectedFoods数组
    if (!meal.selectedFoods) {
      meal.selectedFoods = [];
    }
    
    // 确保有notes字段
    if (!meal.notes) {
      meal.notes = '';
    }
    
    this.setData({
      showMealEditPopup: true,
      editingMealType: mealType,
      editingDay: day,
      isEditingSnack: true, // 设置为true，让UI显示名称输入框
      isNewSnack: false,    // 编辑不是新建
      editingMeal: JSON.parse(JSON.stringify(meal))
    });
  },
  
  // 添加零食/加餐
  addSnack(e) {
    const { day } = e.currentTarget.dataset;
    console.log('添加零食/加餐', day);
    
    this.setData({
      showMealEditPopup: true,
      editingMealType: 'snack',
      editingDay: day,
      isEditingSnack: true,
      isNewSnack: true,
      editingMeal: {
        content: '',
        calories: 0,
        nutrition: { protein: 0, carbs: 0, fat: 0 },
        name: '下午茶',
        selectedFoods: [],
        notes: ''
      }
    });
  },
  
  // 编辑零食/加餐
  editSnack(e) {
    const { snackIndex, day } = e.currentTarget.dataset;
    console.log('编辑零食/加餐', snackIndex, day);
    
    // 获取当前日期索引
    const dayIndex = this.data.weekDays.findIndex(item => item.day === day);
    if (dayIndex === -1) {
      wx.showToast({
        title: '未找到对应日期',
        icon: 'none'
      });
      return;
    }
    
    // 获取当前零食内容
    const snacks = this.data.weekDays[dayIndex].diet.snacks || [];
    const snack = snacks[snackIndex];
    
    if (!snack) {
      wx.showToast({
        title: '未找到零食数据',
        icon: 'none'
      });
      return;
    }
    
    // 确保有selectedFoods数组
    if (!snack.selectedFoods) {
      snack.selectedFoods = [];
    }
    
    // 确保有notes字段
    if (!snack.notes) {
      snack.notes = '';
    }
    
    this.setData({
      showMealEditPopup: true,
      editingMealType: 'snack',
      editingDay: day,
      editingSnackIndex: snackIndex,
      isEditingSnack: true,
      isNewSnack: false,
      editingMeal: JSON.parse(JSON.stringify(snack))
    });
  },
  
  // 关闭餐食编辑弹窗
  closeMealEditPopup() {
    this.setData({
      showMealEditPopup: false
    });
  },

  // 保存餐食编辑
  saveMealEdit() {
    const { editingMeal, editingMealType, editingDay, isEditingSnack, isNewSnack, editingSnackIndex } = this.data;
    
    // 检查必填字段 - 不再检查content
    if (!editingMeal.name) {
      wx.showToast({
        title: '请输入餐食名称',
        icon: 'none'
      });
      return;
    }
    
    // 获取当前日期索引
    const dayIndex = this.data.weekDays.findIndex(item => item.day === editingDay);
    if (dayIndex === -1) {
      wx.showToast({
        title: '未找到对应日期',
        icon: 'none'
      });
      return;
    }
    
    let weekDays = [...this.data.weekDays];
    
    // 确保diet对象存在
    if (!weekDays[dayIndex].diet) {
      weekDays[dayIndex].diet = {};
    }
    
    // 为了兼容旧数据，如果没有selectedFoods，根据食物名生成简单content
    if (!editingMeal.content && editingMeal.selectedFoods && editingMeal.selectedFoods.length > 0) {
      const foodNames = editingMeal.selectedFoods.map(food => food.name);
      editingMeal.content = foodNames.join('、');
    } else if (!editingMeal.content && (!editingMeal.selectedFoods || editingMeal.selectedFoods.length === 0)) {
      editingMeal.content = '暂无安排';
    }
    
    // 处理零食/加餐的特殊情况
    if (isEditingSnack && editingMealType === 'snack') {
      let snacks = weekDays[dayIndex].diet.snacks || [];
      
      if (isNewSnack) {
        // 添加新零食
        snacks.push(editingMeal);
      } else {
        // 更新现有零食
        snacks[editingSnackIndex] = editingMeal;
      }
      
      weekDays[dayIndex].diet.snacks = snacks;
    } else {
      // 更新常规餐食
      weekDays[dayIndex].diet[editingMealType] = editingMeal;
    }
    
    this.setData({ 
      weekDays,
      showMealEditPopup: false
    });
    
    // 保存更改
    this.saveWeeklyPlan(weekDays);
    
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },
  
  // 餐食内容输入监听 - 不再需要，改为备注信息
  onMealNotesInput(e) {
    this.setData({
      'editingMeal.notes': e.detail.value
    });
  },
  
  // 餐食名称输入监听
  onMealNameInput(e) {
    this.setData({
      'editingMeal.name': e.detail.value
    });
  },
  
  // 热量输入监听
  onCaloriesInput(e) {
    this.setData({
      'editingMeal.calories': parseInt(e.detail.value) || 0
    });
  },
  
  // 蛋白质输入监听
  onProteinInput(e) {
    this.setData({
      'editingMeal.nutrition.protein': parseFloat(e.detail.value) || 0
    });
  },
  
  // 碳水化合物输入监听
  onCarbsInput(e) {
    this.setData({
      'editingMeal.nutrition.carbs': parseFloat(e.detail.value) || 0
    });
  },
  
  // 脂肪输入监听
  onFatInput(e) {
    this.setData({
      'editingMeal.nutrition.fat': parseFloat(e.detail.value) || 0
    });
  },
  
  // 跳转到食物选择页面
  goToFoodSelect() {
    wx.navigateTo({
      url: '/pages/diet/food-select',
      events: {
        // 监听从食物选择页面返回的数据
        acceptSelectedFood: (data) => {
          console.log('接收到选择的食物:', data);
          if (data && data.food) {
            // 确保editingMeal中的nutrition对象存在
            if (!this.data.editingMeal.nutrition) {
              this.setData({
                'editingMeal.nutrition': {
                  protein: 0,
                  carbs: 0,
                  fat: 0
                }
              });
            }
            
            // 确保selectedFoods数组存在
            if (!this.data.editingMeal.selectedFoods) {
              this.setData({
                'editingMeal.selectedFoods': []
              });
            }
            
            // 添加到已选食物列表
            const newFood = {
              ...data.food,
              id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            };
            
            const selectedFoods = [...this.data.editingMeal.selectedFoods, newFood];
            
            // 不再更新餐食内容，而是直接使用selectedFoods作为数据来源
            
            // 确保food中的nutrition对象存在
            const foodNutrition = data.food.nutrition || { protein: 0, carbs: 0, fat: 0 };
            
            // 更新营养成分
            const calories = (this.data.editingMeal.calories || 0) + (data.food.calories || 0);
            const protein = (this.data.editingMeal.nutrition.protein || 0) + (foodNutrition.protein || 0);
            const carbs = (this.data.editingMeal.nutrition.carbs || 0) + (foodNutrition.carbs || 0);
            const fat = (this.data.editingMeal.nutrition.fat || 0) + (foodNutrition.fat || 0);
            
            this.setData({
              'editingMeal.calories': calories,
              'editingMeal.nutrition.protein': protein,
              'editingMeal.nutrition.carbs': carbs,
              'editingMeal.nutrition.fat': fat,
              'editingMeal.selectedFoods': selectedFoods
            });
          }
        }
      },
      success: function(res) {
        // 打开成功的回调
      }
    });
  },
  
  // 移除已选食物
  removeSelectedFood(e) {
    const foodId = e.currentTarget.dataset.foodId;
    const selectedFoods = [...this.data.editingMeal.selectedFoods];
    
    // 找到要删除的食物索引
    const foodIndex = selectedFoods.findIndex(item => item.id === foodId);
    if (foodIndex === -1) return;
    
    // 获取要删除的食物数据
    const foodToRemove = selectedFoods[foodIndex];
    
    // 从列表中移除该食物
    selectedFoods.splice(foodIndex, 1);
    
    // 重新计算营养成分
    const newCalories = Math.max(0, (this.data.editingMeal.calories || 0) - (foodToRemove.calories || 0));
    const newProtein = Math.max(0, (this.data.editingMeal.nutrition.protein || 0) - (foodToRemove.nutrition?.protein || 0));
    const newCarbs = Math.max(0, (this.data.editingMeal.nutrition.carbs || 0) - (foodToRemove.nutrition?.carbs || 0));
    const newFat = Math.max(0, (this.data.editingMeal.nutrition.fat || 0) - (foodToRemove.nutrition?.fat || 0));
    
    this.setData({
      'editingMeal.selectedFoods': selectedFoods,
      'editingMeal.calories': newCalories,
      'editingMeal.nutrition.protein': newProtein,
      'editingMeal.nutrition.carbs': newCarbs,
      'editingMeal.nutrition.fat': newFat
    });
    
    wx.showToast({
      title: '已移除',
      icon: 'success'
    });
  },
  
  // 清空所有已选食物
  clearAllSelectedFoods() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有已选食物吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            'editingMeal.selectedFoods': [],
            'editingMeal.calories': 0,
            'editingMeal.nutrition.protein': 0,
            'editingMeal.nutrition.carbs': 0,
            'editingMeal.nutrition.fat': 0
          });
          
          wx.showToast({
            title: '已清空',
            icon: 'success'
          });
        }
      }
    });
  },
  
  // 删除零食/加餐
  deleteSnack(e) {
    const { snackIndex, day } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个零食/加餐吗？',
      success: (res) => {
        if (res.confirm) {
          // 获取当前日期索引
          const dayIndex = this.data.weekDays.findIndex(item => item.day === day);
          if (dayIndex === -1) {
            wx.showToast({
              title: '未找到对应日期',
              icon: 'none'
            });
            return;
          }
          
          // 获取并更新零食列表
          let weekDays = [...this.data.weekDays];
          let snacks = weekDays[dayIndex].diet.snacks || [];
          snacks.splice(snackIndex, 1);
          weekDays[dayIndex].diet.snacks = snacks;
          
          this.setData({ weekDays });
          
          // 保存更改
          this.saveWeeklyPlan(weekDays);
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },
  
  // 完成餐食（跟练模式）
  completeMeal(e) {
    const { mealType, day } = e.currentTarget.dataset;
    console.log('完成餐食', mealType, day);
    
    // 获取当前日期索引
    const dayIndex = this.data.weekDays.findIndex(item => item.day === day);
    if (dayIndex === -1) {
      wx.showToast({
        title: '未找到对应日期',
        icon: 'none'
      });
      return;
    }
    
    // 更新完成状态
    let weekDays = [...this.data.weekDays];
    if (!weekDays[dayIndex].diet) {
      weekDays[dayIndex].diet = {};
    }
    if (!weekDays[dayIndex].diet[mealType]) {
      weekDays[dayIndex].diet[mealType] = { content: '暂无安排', completed: false };
    }
    
    weekDays[dayIndex].diet[mealType].completed = true;
    
    this.setData({ weekDays });
    
    // 保存更改
    this.saveWeeklyPlan(weekDays);
    
    wx.showToast({
      title: '已完成餐食',
      icon: 'success'
    });
  },
  
  // 完成零食/加餐（跟练模式）
  completeSnack(e) {
    const { snackIndex, day } = e.currentTarget.dataset;
    console.log('完成零食/加餐', snackIndex, day);
    
    // 获取当前日期索引
    const dayIndex = this.data.weekDays.findIndex(item => item.day === day);
    if (dayIndex === -1) {
      wx.showToast({
        title: '未找到对应日期',
        icon: 'none'
      });
      return;
    }
    
    // 更新完成状态
    let weekDays = [...this.data.weekDays];
    let snacks = weekDays[dayIndex].diet.snacks || [];
    
    if (!snacks[snackIndex]) {
      wx.showToast({
        title: '未找到零食数据',
        icon: 'none'
      });
      return;
    }
    
    snacks[snackIndex].completed = true;
    weekDays[dayIndex].diet.snacks = snacks;
    
    this.setData({ weekDays });
    
    // 保存更改
    this.saveWeeklyPlan(weekDays);
    
    wx.showToast({
      title: '已完成零食',
      icon: 'success'
    });
  }
});