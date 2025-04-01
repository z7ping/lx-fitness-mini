Page({
  data: {
    searchValue: '',
    activeCategory: 'all',
    categories: [
      { id: 'all', name: '全部' },
      { id: 'meat', name: '肉类' },
      { id: 'vegetable', name: '蔬菜' },
      { id: 'fruit', name: '水果' },
      { id: 'grain', name: '谷物' },
      { id: 'dairy', name: '乳制品' },
      { id: 'seafood', name: '海鲜' },
      { id: 'snack', name: '零食' }
    ],
    foods: [
      {
        id: 1,
        name: '鸡胸肉',
        category: 'meat',
        image: '/images/foods/chicken-breast.jpg',
        calories: 165,
        unit: '100g',
        weightPerUnit: 100,
        nutrition: {
          protein: 31,
          carbs: 0,
          fat: 3.6
        }
      },
      {
        id: 2,
        name: '西兰花',
        category: 'vegetable',
        image: '/images/foods/broccoli.jpg',
        calories: 34,
        unit: '100g',
        weightPerUnit: 100,
        nutrition: {
          protein: 2.8,
          carbs: 7,
          fat: 0.4
        }
      }
      // 更多食材...
    ],
    filteredFoods: [],
    showAmountDialog: false,
    selectedFood: null,
    amount: 1,
    calculatedCalories: 0,
    calculatedNutrition: {
      protein: 0,
      carbs: 0,
      fat: 0
    },
    totalWeight: 0
  },

  onLoad() {
    this.setData({
      filteredFoods: this.data.foods
    });
  },

  // 搜索食材
  onSearchChange(e) {
    this.setData({
      searchValue: e.detail
    });
    this.filterFoods();
  },

  // 执行搜索
  onSearch() {
    this.filterFoods();
  },

  // 切换分类
  switchCategory(e) {
    const { id } = e.currentTarget.dataset;
    this.setData({
      activeCategory: id
    });
    this.filterFoods();
  },

  // 筛选食材
  filterFoods() {
    const { foods, activeCategory, searchValue } = this.data;
    let filtered = foods;

    // 按分类筛选
    if (activeCategory !== 'all') {
      filtered = filtered.filter(food => food.category === activeCategory);
    }

    // 按搜索关键词筛选
    if (searchValue) {
      const keyword = searchValue.toLowerCase();
      filtered = filtered.filter(food => 
        food.name.toLowerCase().includes(keyword)
      );
    }

    this.setData({
      filteredFoods: filtered
    });
  },

  // 选择食材
  selectFood(e) {
    const { food } = e.currentTarget.dataset;
    const amount = 1;
    const totalWeight = (amount * 100).toFixed(1);
    
    // 计算初始营养成分
    const calculatedNutrition = {
      calories: (food.calories * amount).toFixed(1),
      protein: (food.nutrition.protein * amount).toFixed(1),
      carbs: (food.nutrition.carbs * amount).toFixed(1),
      fat: (food.nutrition.fat * amount).toFixed(1)
    };

    this.setData({
      selectedFood: food,
      amount,
      totalWeight,
      calculatedNutrition,
      showAmountDialog: true
    });
  },

  // 修改数量
  onAmountChange(event) {
    const amount = event.detail;
    const totalWeight = (amount * 100).toFixed(1);
    
    // 计算营养成分
    const calculatedNutrition = {
      calories: (this.data.selectedFood.calories * amount).toFixed(1),
      protein: (this.data.selectedFood.nutrition.protein * amount).toFixed(1),
      carbs: (this.data.selectedFood.nutrition.carbs * amount).toFixed(1),
      fat: (this.data.selectedFood.nutrition.fat * amount).toFixed(1)
    };

    this.setData({
      amount,
      totalWeight,
      calculatedNutrition
    });
  },

  // 计算营养成分
  calculateNutrition(amount) {
    const { selectedFood } = this.data;
    if (!selectedFood) return;
    
    // 确保amount是有效数字且在合理范围内
    amount = Math.max(0, Math.min(10, Number(amount) || 1));
    
    // 计算总重量
    const totalWeight = (selectedFood.weightPerUnit * amount).toFixed(1);
    
    const calculatedNutrition = {
      calories: (selectedFood.calories * amount).toFixed(1),
      protein: (selectedFood.nutrition.protein * amount).toFixed(1),
      carbs: (selectedFood.nutrition.carbs * amount).toFixed(1),
      fat: (selectedFood.nutrition.fat * amount).toFixed(1)
    };

    this.setData({
      amount,
      totalWeight,
      calculatedNutrition
    });
  },

  // 确认添加食材
  confirmAmount() {
    const { selectedFood, amount, totalWeight, calculatedNutrition } = this.data;
    
    // 构建食物对象
    const food = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: selectedFood.name,
      amount: `${amount}份`,
      weight: parseFloat(totalWeight),
      calories: parseFloat(calculatedNutrition.calories),
      protein: parseFloat(calculatedNutrition.protein),
      carbs: parseFloat(calculatedNutrition.carbs),
      fat: parseFloat(calculatedNutrition.fat),
      unit: selectedFood.unit
    };

    console.log('准备传递的食材数据:', food);

    // 获取事件通道
    const eventChannel = this.getOpenerEventChannel();
    
    // 通过事件通道传递数据
    if (eventChannel) {
      eventChannel.emit('acceptFood', food);
    }
    
    // 关闭弹窗并返回上一页
    this.setData({
      showAmountDialog: false,
      selectedFood: null,
      amount: 1
    }, () => {
      wx.navigateBack();
    });
  },

  // 关闭数量设置弹窗
  closeAmountDialog() {
    this.setData({
      showAmountDialog: false,
      selectedFood: null,
      amount: 1,
      totalWeight: 0,
      calculatedNutrition: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      }
    });
  }
});