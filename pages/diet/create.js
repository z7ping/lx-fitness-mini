Page({
  data: {
    planInfo: {
      name: `饮食计划${Date.now().toString().slice(-6)}`,
      days: [],
      calories: 2000,
      nutritionRatio: {
        protein: 30,
        carbs: 40,
        fat: 30
      },
      breakfast: {
        calories: 0,
        foods: []
      },
      lunch: {
        calories: 0,
        foods: []
      },
      dinner: {
        calories: 0,
        foods: []
      }
    },
    weekDays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    selectedDaysMap: {},
    showDayPicker: false,
    showCaloriesDialog: false,
    canSave: false,
    recommendedRecipes: [
      {
        id: 1,
        name: '健康轻食沙拉',
        calories: 350,
        image: '/images/recipes/salad.jpg'
      },
      {
        id: 2,
        name: '鸡胸肉西兰花',
        calories: 450,
        image: '/images/recipes/chicken.jpg'
      }
    ]
  },

  onLoad(options) {
    // 初始化选中状态
    const selectedDaysMap = {};
    this.data.weekDays.forEach(day => {
      selectedDaysMap[day] = false;
    });
    this.setData({ selectedDaysMap });
  },

  // 显示日期选择器
  showDaySelector() {
    this.setData({ showDayPicker: true });
  },

  // 切换日期选择
  toggleDay(e) {
    const { day } = e.currentTarget.dataset;
    const selectedDaysMap = { ...this.data.selectedDaysMap };
    selectedDaysMap[day] = !selectedDaysMap[day];
    this.setData({ selectedDaysMap });
  },

  // 确认选择日期
  confirmDays() {
    const days = this.data.weekDays.filter(day => this.data.selectedDaysMap[day]);
    this.setData({
      'planInfo.days': days,
      showDayPicker: false
    });
    this.checkCanSave();
  },

  // 关闭日期选择器
  onDayClose() {
    this.setData({ showDayPicker: false });
  },

  // 显示热量设置
  showCaloriesDialog() {
    this.setData({ showCaloriesDialog: true });
  },

  // 修改热量
  onCaloriesChange(e) {
    this.setData({
      'planInfo.calories': e.detail
    });
  },

  // 确认热量设置
  confirmCalories() {
    this.setData({ showCaloriesDialog: false });
    this.checkCanSave();
  },

  // 关闭热量设置
  onCaloriesClose() {
    this.setData({ showCaloriesDialog: false });
  },

  // 添加食材
  addFood(e) {
    const { meal } = e.currentTarget.dataset;
    wx.navigateTo({
      url: '/pages/diet/food-select',
      events: {
        // 监听选中食材
        acceptFood: (food) => {
          const foods = [...this.data.planInfo[meal].foods];
          foods.push(food);
          this.setData({
            [`planInfo.${meal}.foods`]: foods,
            [`planInfo.${meal}.calories`]: this.calculateMealCalories(foods)
          });
          this.checkCanSave();
        }
      }
    });
  },

  // 应用推荐食谱
  applyRecipe(e) {
    const { id } = e.currentTarget.dataset;
    const recipe = this.data.recommendedRecipes.find(r => r.id === id);
    if (recipe) {
      wx.showModal({
        title: '应用食谱',
        content: `是否将"${recipe.name}"应用到当前计划？`,
        success: (res) => {
          if (res.confirm) {
            // TODO: 应用食谱到计划
            wx.showToast({
              title: '应用成功',
              icon: 'success'
            });
          }
        }
      });
    }
  },

  // 计算餐次总热量
  calculateMealCalories(foods) {
    return foods.reduce((total, food) => total + (food.calories || 0), 0);
  },

  // 检查是否可以保存
  checkCanSave() {
    const { name, days } = this.data.planInfo;
    const canSave = name && days.length > 0;
    this.setData({ canSave });
  },

  // 保存计划
  async savePlan() {
    if (!this.data.canSave) return;

    try {
      const dataService = require('../../services/dataService');
      
      // 准备计划数据
      const plan = {
        id: Date.now().toString(),
        type: 'diet',
        ...this.data.planInfo,
        createTime: new Date().getTime()
      };

      // 保存计划
      await dataService.saveDietPlan(plan);

      wx.showToast({
        title: '保存成功',
        icon: 'success'
      });

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);

    } catch (error) {
      console.error('保存饮食计划失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    }
  }
}); 