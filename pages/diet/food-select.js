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
    }
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
    this.setData({
      selectedFood: food,
      amount: 1,
      showAmountDialog: true
    });
    this.calculateNutrition(1);
  },

  // 修改数量
  onAmountChange(e) {
    const amount = e.detail;
    this.setData({ amount });
    this.calculateNutrition(amount);
  },

  // 计算营养成分
  calculateNutrition(amount) {
    const { selectedFood } = this.data;
    if (!selectedFood) return;

    const calculatedCalories = Math.round(selectedFood.calories * amount * 10) / 10;
    const calculatedNutrition = {
      protein: Math.round(selectedFood.nutrition.protein * amount * 10) / 10,
      carbs: Math.round(selectedFood.nutrition.carbs * amount * 10) / 10,
      fat: Math.round(selectedFood.nutrition.fat * amount * 10) / 10
    };

    this.setData({
      calculatedCalories,
      calculatedNutrition
    });
  },

  // 关闭数量选择弹窗
  onAmountClose() {
    this.setData({
      showAmountDialog: false,
      selectedFood: null,
      amount: 1
    });
  },

  // 确认添加食材
  confirmAmount() {
    const { selectedFood, amount, calculatedCalories, calculatedNutrition } = this.data;
    
    const food = {
      ...selectedFood,
      amount,
      calories: calculatedCalories,
      nutrition: calculatedNutrition
    };

    // 获取页面实例
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];

    // 通过事件通道传递数据
    if (prevPage) {
      const eventChannel = this.getOpenerEventChannel();
      eventChannel.emit('acceptFood', food);
    }

    // 关闭页面
    wx.navigateBack();
  }
}); 