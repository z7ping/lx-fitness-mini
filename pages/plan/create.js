// pages/myplan/create.js
const app = getApp()
const { dataService } = require('../../services/dataService');
Page({
  data: {
    planInfo: {
      name: `训练计划${Date.now().toString().slice(-6)}`,  // 添加默认名称
      type: '',
      days: ['周一', '周三', '周五'], // 默认三天
      timeSlot: 'morning',
      duration: 45,
      exercises: []
    },
    types: ['力量训练', '有氧训练', '拉伸放松', '混合训练'],
    timeSlots: [
      { text: '早晨', value: 'morning' },
      { text: '中午', value: 'noon' },
      { text: '晚上', value: 'evening' }
    ],
    timeSlotIndex: 0,
    timeSlotText: '早晨',
    weekDays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    showDayPicker: false,
    showDurationDialog: false,
    canSave: false,
    trainingTips: {
      description: '',
      items: []
    },
    selectedDaysMap: {}, // 使用对象来管理选中状态
    showExerciseEditor: false,
    editingExercise: null,
    editingExerciseIndex: -1
  },

  onLoad(options) {
    if (options.planData) {
      const planData = JSON.parse(options.planData);
      this.setData({
        'planInfo.type': this.data.types[0],
        'planInfo.duration': planData.defaultDuration || 45
      });
      this.updateTrainingTips();
    }
    
    this.updateTimeSlotText();
    // 初始化选中状态对象
    const selectedDaysMap = {};
    this.data.planInfo.days.forEach(day => {
      selectedDaysMap[day] = true;
    });
    this.setData({
      selectedDaysMap,
      showDayPicker: false
    });
  },

  onFormChange() {
    const { name, type, days, exercises } = this.data.planInfo;
    const canSave = name && type && days.length > 0 && exercises.length > 0;
    console.log("===>name", name)
    console.log("===>type", type)
    console.log("===>days", days)
    console.log("===>exercises", exercises)
    console.log("===>canSave", canSave)
    this.setData({ canSave });
  },

  updateTimeSlotText() {
    const slot = this.data.timeSlots.find(item => item.value === this.data.planInfo.timeSlot);
    this.setData({
      timeSlotText: slot ? slot.text : '请选择',
      timeSlotIndex: this.data.timeSlots.findIndex(item => item.value === this.data.planInfo.timeSlot)
    });
  },

  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({
      [`planInfo.${field}`]: e.detail
    }, () => {
      this.onFormChange();
    });
  },

  showTypeSelector() {
    // 训练类型选择器已经通过picker实现，不需要额外处理
  },

  onPickerChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    if (field === 'type') {
      this.setData({
        'planInfo.type': this.data.types[value]
      }, () => {
        this.updateTrainingTips();
        this.onFormChange();
      });
    } else if (field === 'timeSlot') {
      this.setData({
        'planInfo.timeSlot': this.data.timeSlots[value].value,
      }, () => {
        this.updateTimeSlotText();
        this.onFormChange();
      });
    }
  },

  updateTrainingTips() {
    const { type } = this.data.planInfo;
    let tips = {
      description: '',
      items: []
    };

    switch (type) {
      case '力量训练':
        tips = {
          description: '力量训练有助于增强肌肉力量和提高基础代谢',
          items: [
            '建议每个动作3-4组，每组8-12次',
            '组间休息60-90秒',
            '注意动作标准和呼吸节奏'
          ]
        };
        break;
      case '有氧训练':
        tips = {
          description: '有氧训练可以提高心肺功能和燃烧脂肪',
          items: [
            '保持中等强度，心率在最大心率的65-75%',
            '持续30-45分钟最为适宜',
            '可以选择跑步、游泳等持续性运动'
          ]
        };
        break;
      case '拉伸放松':
        tips = {
          description: '拉伸有助于提高柔韧性和预防运动损伤',
          items: [
            '每个动作保持15-30秒',
            '动作要缓慢，不要反弹',
            '感觉轻微拉伸即可，避免过度'
          ]
        };
        break;
      case '混合训练':
        tips = {
          description: '混合训练可以全面提高身体素质',
          items: [
            '先进行力量训练，后进行有氧',
            '注意安排适当的转换时间',
            '强度要循序渐进'
          ]
        };
        break;
    }

    this.setData({ trainingTips: tips });
  },

  showDaySelector() {
    // 初始化选中状态对象
    const selectedDaysMap = {};
    this.data.planInfo.days.forEach(day => {
      selectedDaysMap[day] = true;
    });
    
    this.setData({ 
      showDayPicker: true,
      selectedDaysMap
    });
  },

  toggleDay(e) {
    const day = e.currentTarget.dataset.day;
    
    // 添加触感反馈
    wx.vibrateShort({
      type: 'light'
    });
    
    // 更新选中状态
    const selectedDaysMap = { ...this.data.selectedDaysMap };
    selectedDaysMap[day] = !selectedDaysMap[day];
    
    this.setData({
      selectedDaysMap
    });
  },

  confirmDays() {
    // 将选中的日期转换为数组并排序
    const selectedDays = this.data.weekDays.filter(day => this.data.selectedDaysMap[day]);
    
    this.setData({
      'planInfo.days': selectedDays,
      showDayPicker: false
    }, () => {
      this.onFormChange();
    });
  },

  removeDay(e) {
    const { day } = e.currentTarget.dataset;
    const days = this.data.planInfo.days.filter(d => d !== day);
    this.setData({
      'planInfo.days': days
    }, () => {
      this.onFormChange();
    });
  },

  onDayClose() {
    this.setData({ showDayPicker: false });
  },

  showDurationTip() {
    this.setData({ showDurationDialog: true });
  },

  closeDurationTip() {
    this.setData({ showDurationDialog: false });
  },

  addExercise() {
    if (!this.data.planInfo.type) {
      wx.showToast({
        title: '请先选择训练类型',
        icon: 'none'
      });
      return;
    }
    const self = this;
    wx.navigateTo({
      url: '/pages/exercise/select',
      success: (res) => {
        console.log('Data set successfully111')
        res.eventChannel.on('acceptExercise', (exercise) => {
          console.log('Data set successfully122')
          const exercises = [...self.data.planInfo.exercises];
          // 直接使用从select.js接收到的完整exercise对象，避免重复设置属性
          exercises.push(exercise);
          console.log('Data set successfully133')
          self.setData({
            'planInfo.exercises': exercises
          }, () => {
            console.log('Data set successfully')
            self.onFormChange();
          });
        });
      }
    });
  },

  editExercise(e) {
    const { index } = e.currentTarget.dataset;
    const exercise = { ...this.data.planInfo.exercises[index] };
    this.setData({
      editingExercise: exercise,
      editingExerciseIndex: index,
      showExerciseEditor: true
    });
  },

  onExerciseEditorClose() {
    this.setData({
      showExerciseEditor: false,
      editingExercise: null,
      editingExerciseIndex: -1
    });
  },

  onSetsChange(e) {
    this.setData({
      'editingExercise.sets': e.detail
    });
  },

  onRepsOrDurationChange(e) {
    if (this.data.editingExercise.duration) {
      this.setData({
        'editingExercise.duration': e.detail
      });
    } else {
      this.setData({
        'editingExercise.reps': e.detail
      });
    }
  },

  onWeightChange(e) {
    this.setData({
      'editingExercise.weight': e.detail
    });
  },

  confirmExerciseEdit() {
    const { editingExercise, editingExerciseIndex } = this.data;
    const exercises = [...this.data.planInfo.exercises];
    exercises[editingExerciseIndex] = editingExercise;
    
    this.setData({
      'planInfo.exercises': exercises,
      showExerciseEditor: false,
      editingExercise: null,
      editingExerciseIndex: -1
    });
  },

  removeExercise(e) {
    const { index } = e.currentTarget.dataset;
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个训练动作吗？',
      success: (res) => {
        if (res.confirm) {
          const exercises = this.data.planInfo.exercises;
          exercises.splice(index, 1);
          this.setData({
            'planInfo.exercises': exercises
          }, () => {
            this.onFormChange();
          });
        }
      }
    });
  },

  async savePlan() {
    if (!this.validatePlan()) return;

    try {
      
      // 准备计划数据
      const plan = {
        id: Date.now().toString(),
        name: this.data.planInfo.name,
        type: this.data.planInfo.type,
        exercises: [],
        duration: this.data.planInfo.duration,
        createTime: new Date().getTime(),
        isAIPlan: false,
        progress: 0,
        completed: false
      };

      // 为每个训练动作分配到选定的训练日期
      this.data.planInfo.days.forEach(day => {
        this.data.planInfo.exercises.forEach(exercise => {
          plan.exercises.push({
            ...exercise,
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            scheduledDay: day,  // 为每个训练分配训练日期
            timeSlot: this.data.planInfo.timeSlot
          });
        });
      });

      console.log('准备保存的计划数据:', plan);

      // 使用dataService保存计划
      dataService.saveTrainingPlan(plan);

      wx.showToast({
        title: '创建成功',
        icon: 'success',
        duration: 2000
      });

      setTimeout(() => {
        wx.navigateBack({
          delta: 1,
          success: () => {
            const pages = getCurrentPages();
            const prevPage = pages[pages.length - 2];
            if (prevPage) {
              // 刷新上一页的数据
              prevPage.loadWeeklyPlans();
            }
          }
        });
      }, 2000);

    } catch (error) {
      console.error('保存计划失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  },

  validatePlan() {
    const { name, type, days, exercises, duration } = this.data.planInfo;
    
    if (!name) {
      wx.showToast({
        title: '请输入计划名称',
        icon: 'none'
      });
      return false;
    }

    if (!type) {
      wx.showToast({
        title: '请选择训练类型',
        icon: 'none'
      });
      return false;
    }

    if (!days.length) {
      wx.showToast({
        title: '请选择训练日期',
        icon: 'none'
      });
      return false;
    }

    if (days.length < 2) {
      wx.showToast({
        title: '建议每周至少训练2天',
        icon: 'none'
      });
      return false;
    }

    if (days.length > 5) {
      wx.showToast({
        title: '建议每周训练不超过5天',
        icon: 'none'
      });
      return false;
    }

    if (!duration || duration < 15) {
      wx.showToast({
        title: '训练时长至少15分钟',
        icon: 'none'
      });
      return false;
    }

    if (duration > 120) {
      wx.showToast({
        title: '单次训练建议不超过120分钟',
        icon: 'none'
      });
      return false;
    }

    if (!exercises.length) {
      wx.showToast({
        title: '请添加训练动作',
        icon: 'none'
      });
      return false;
    }

    return true;
  }
});