Page({
  data: {
    dietInfo: {
      name: '',
      selectedDays: [],
      calories: 2000,
      proteinRatio: 30,
      carbsRatio: 40,
      fatRatio: 30,
      meals: [
        {
          name: '早餐',
          calories: 600,
          foods: []
        },
        {
          name: '午餐',
          calories: 800,
          foods: []
        },
        {
          name: '晚餐',
          calories: 600,
          foods: []
        }
      ]
    },
    showDayPicker: false,
    showCaloriesDialog: false,
    daysMap: {
      1: '周一',
      2: '周二',
      3: '周三',
      4: '周四',
      5: '周五',
      6: '周六',
      7: '周日'
    },
    selectedDaysMap: {},
    canSave: false
  },

  onLoad(options) {
    const timestamp = Date.now();
    const dietInfo = this.data.dietInfo;
    dietInfo.name = `饮食计划_${timestamp}`;
    
    this.setData({
      dietInfo,
      'dietInfo.selectedDays': []
    });

    this.checkCanSave();
  },

  // 显示日期选择器
  showDaySelector() {
    const selectedDaysMap = {};
    this.data.dietInfo.selectedDays.forEach(day => {
      selectedDaysMap[day] = true;
    });

    this.setData({
      showDayPicker: true,
      selectedDaysMap
    });
  },

  // 选择/取消选择日期
  toggleDay(e) {
    const { day } = e.currentTarget.dataset;
    const selectedDaysMap = { ...this.data.selectedDaysMap };
    
    if (selectedDaysMap[day]) {
      delete selectedDaysMap[day];
    } else {
      selectedDaysMap[day] = true;
    }

    this.setData({ selectedDaysMap });
  },

  // 确认选择日期
  confirmDays() {
    const selectedDays = Object.keys(this.data.selectedDaysMap)
      .filter(key => this.data.selectedDaysMap[key])
      .map(Number)
      .sort((a, b) => a - b);

    this.setData({
      'dietInfo.selectedDays': selectedDays,
      showDayPicker: false
    });

    this.checkCanSave();
  },

  // 移除已选择的日期
  removeDay(e) {
    const { day } = e.currentTarget.dataset;
    const selectedDays = this.data.dietInfo.selectedDays.filter(d => d !== day);

    this.setData({
      'dietInfo.selectedDays': selectedDays
    });

    this.checkCanSave();
  },

  // 显示热量设置弹窗
  showCaloriesDialog() {
    this.setData({
      showCaloriesDialog: true
    });
  },

  // 关闭热量设置弹窗
  closeCaloriesDialog() {
    this.setData({
      showCaloriesDialog: false
    });
  },

  // 更新热量
  onCaloriesChange(e) {
    const calories = e.detail;
    this.setData({
      'dietInfo.calories': calories
    });

    // 更新三餐热量分配
    const breakfast = Math.round(calories * 0.3);
    const lunch = Math.round(calories * 0.4);
    const dinner = calories - breakfast - lunch;

    this.setData({
      'dietInfo.meals[0].calories': breakfast,
      'dietInfo.meals[1].calories': lunch,
      'dietInfo.meals[2].calories': dinner
    });
  },

  // 确认热量设置
  confirmCalories() {
    this.setData({
      showCaloriesDialog: false
    });
  },

  // 表单输入变化
  onFormChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;

    this.setData({
      [`dietInfo.${field}`]: value
    });

    this.checkCanSave();
  },

  // 检查是否可以保存
  checkCanSave() {
    const { name, selectedDays } = this.data.dietInfo;
    const canSave = name.trim() !== '' && selectedDays.length > 0;

    this.setData({ canSave });
  },

  // 添加食材
  addFood(e) {
    const { mealIndex } = e.currentTarget.dataset;
    const self = this;
    wx.navigateTo({
      url: '/pages/diet/food-select',
      events: {
        // 监听选中食材
        acceptFood: function(food) {
          console.log('接收到食材数据:', food);
          const meals = [...self.data.dietInfo.meals];
          meals[mealIndex].foods.push(food);
          
          // 更新餐次的总热量
          meals[mealIndex].calories = meals[mealIndex].foods.reduce((total, item) => {
            return total + (item.calories || 0);
          }, 0);

          self.setData({
            'dietInfo.meals': meals
          }, () => {
            console.log('更新后的餐次数据:', self.data.dietInfo.meals);
            self.checkCanSave();
          });
        }
      }
    });
  },

  // 保存饮食计划
  async saveDietPlan() {
    if (!this.validatePlan()) return;

    try {
      // 准备计划数据
      const plan = {
        id: Date.now().toString(),
        name: this.data.dietInfo.name,
        selectedDays: this.data.dietInfo.selectedDays,
        calories: this.data.dietInfo.calories,
        proteinRatio: this.data.dietInfo.proteinRatio,
        carbsRatio: this.data.dietInfo.carbsRatio,
        fatRatio: this.data.dietInfo.fatRatio,
        meals: this.data.dietInfo.meals.map(meal => ({
          ...meal,
          foods: meal.foods.map(food => ({
            ...food,
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          }))
        })),
        createTime: new Date().getTime()
      };

      console.log('准备保存的计划数据:', plan);

      // 使用dataService保存计划
      const { dataService } = require('../../services/dataService');
      await dataService.saveDietPlan(plan);

      wx.showToast({
        title: '创建成功',
        icon: 'success',
        duration: 2000
      });

      setTimeout(() => {
        wx.navigateBack({
          delta: 1
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

  // 验证计划
  validatePlan() {
    const { name, selectedDays, calories, meals } = this.data.dietInfo;
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入计划名称',
        icon: 'none'
      });
      return false;
    }

    if (!selectedDays.length) {
      wx.showToast({
        title: '请选择训练日期',
        icon: 'none'
      });
      return false;
    }

    if (!calories || calories < 1000) {
      wx.showToast({
        title: '请设置合理的热量',
        icon: 'none'
      });
      return false;
    }

    const hasFood = meals.some(meal => meal.foods.length > 0);
    if (!hasFood) {
      wx.showToast({
        title: '请至少添加一个食材',
        icon: 'none'
      });
      return false;
    }

    return true;
  },

  // 取消创建
  onCancel() {
    this.setData({
      showDayPicker: false,
      showCaloriesDialog: false
    });
  }
});