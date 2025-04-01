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

  // 保存饮食计划
  saveDietPlan() {
    if (!this.data.canSave) return;

    const dietPlan = { ...this.data.dietInfo };
    
    // TODO: 调用保存接口
    console.log('保存饮食计划:', dietPlan);

    wx.showToast({
      title: '保存成功',
      icon: 'success',
      duration: 2000,
      success: () => {
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      }
    });
  },

  // 取消创建
  onCancel() {
    this.setData({
      showDayPicker: false,
      showCaloriesDialog: false
    });
  },

  // 添加食材
  addFood(e) {
    const { mealIndex } = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/diet/food-select',
      events: {
        // 监听选中食材
        acceptFood: (food) => {
          const meals = [...this.data.dietInfo.meals];
          const foods = [...meals[mealIndex].foods];
          foods.push(food);
          meals[mealIndex].foods = foods;
          
          this.setData({
            'dietInfo.meals': meals
          });
        }
      }
    });
  }
});