Page({
  data: {
    activeTab: 0,
    exerciseGroups: [
      {
        type: '力量训练',
        list: [
          { id: 1, name: '俯卧撑', target: '胸部、肱三头肌', icon: 'friends-o' },
          { id: 2, name: '深蹲', target: '大腿、臀部', icon: 'user-o' },
          { id: 3, name: '引体向上', target: '背部、二头肌', icon: 'ascending' },
          { id: 4, name: '平板支撑', target: '核心、腹部', icon: 'stop' },
          { id: 5, name: '弓步蹲', target: '大腿、平衡', icon: 'exchange' },
          { id: 6, name: '卷腹', target: '腹部', icon: 'replay' }
        ]
      },
      {
        type: '有氧训练',
        list: [
          { id: 7, name: '原地慢跑', target: '心肺功能', icon: 'upgrade' },
          { id: 8, name: '开合跳', target: '心肺功能、协调性', icon: 'star-o' },
          { id: 9, name: '高抬腿', target: '下肢、心肺功能', icon: 'sort' },
          { id: 10, name: '波比跳', target: '全身、心肺功能', icon: 'replay' }
        ]
      },
      {
        type: '拉伸放松',
        list: [
          { id: 11, name: '肩部拉伸', target: '肩部柔韧性', icon: 'arrow' },
          { id: 12, name: '腿部拉伸', target: '腿部柔韧性', icon: 'arrow-down' },
          { id: 13, name: '背部拉伸', target: '背部柔韧性', icon: 'arrow-up' },
          { id: 14, name: '全身拉伸', target: '整体柔韧性', icon: 'expand-o' }
        ]
      }
    ],
    searchValue: '',
    filteredExercises: []
  },

  onTabChange(e) {
    this.setData({ activeTab: e.detail.index });
  },

  onSearch(e) {
    const value = e.detail.toLowerCase();
    let filtered = [];
    
    if (value) {
      this.data.exerciseGroups.forEach(group => {
        group.list.forEach(exercise => {
          if (exercise.name.toLowerCase().includes(value) || 
              exercise.target.toLowerCase().includes(value)) {
            filtered.push(exercise);
          }
        });
      });
    }
    
    this.setData({
      searchValue: value,
      filteredExercises: filtered
    });
  },

  selectExercise(e) {
    const { exercise } = e.currentTarget.dataset;
    const exerciseData = {
      ...exercise,
      sets: 3,
      reps: 12,
      weight: 0,
      type: this.data.exerciseGroups[this.data.activeTab].type,
      duration: exercise.id >= 7 && exercise.id <= 10 ? 15 : 0 // 有氧训练默认设置15分钟
    };
    
    console.log('选择的训练数据:', exerciseData);
    
    // 首先保存到Storage，作为最后的保障
    let selectedExercises = [];
    selectedExercises.push(exerciseData);
    wx.setStorageSync('tempSelectedExercises', selectedExercises);
    
    try {
      // 1. 先尝试使用页面栈直接调用回调函数
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      if (prevPage) {
        // 尝试直接调用回调函数
        if (typeof prevPage.exerciseSelectedCallback === 'function') {
          console.log('找到上一页的exerciseSelectedCallback方法');
          prevPage.exerciseSelectedCallback(exerciseData);
          console.log('通过回调函数成功传递数据');
          
          wx.showToast({
            title: '已选择训练',
            icon: 'success'
          });
          
          setTimeout(() => {
            wx.navigateBack();
          }, 500);
          return;
        }
        
        // 尝试直接调用onExerciseSelected方法
        if (typeof prevPage.onExerciseSelected === 'function') {
          console.log('找到上一页的onExerciseSelected方法');
          prevPage.onExerciseSelected(exerciseData);
          console.log('通过onExerciseSelected成功传递数据');
          
          wx.showToast({
            title: '已选择训练',
            icon: 'success'
          });
          
          setTimeout(() => {
            wx.navigateBack();
          }, 500);
          return;
        }
        
        // 尝试直接修改上一页数据
        if (prevPage.data && prevPage.data.planInfo) {
          console.log('尝试直接修改上一页planInfo');
          const exercises = prevPage.data.planInfo.exercises;
          exercises.push(exerciseData);
          
          prevPage.setData({
            'planInfo.exercises': exercises
          });
          console.log('已通过直接修改上一页数据添加运动');
          
          wx.showToast({
            title: '已选择训练',
            icon: 'success'
          });
          
          setTimeout(() => {
            wx.navigateBack();
          }, 500);
          return;
        }
      }
      
      // 2. 尝试使用eventChannel
      console.log('尝试使用eventChannel');
      const eventChannel = this.getOpenerEventChannel();
      
      if (eventChannel && eventChannel.emit) {
        console.log('eventChannel存在，发送数据:', exerciseData);
        eventChannel.emit('acceptExercise', exerciseData);
        console.log('通过eventChannel发送数据成功');
        
        wx.showToast({
          title: '已选择训练',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.navigateBack();
        }, 500);
        return;
      }
    } catch (error) {
      console.error('数据传递异常:', error);
    }
    
    // 如果前面的方法都失败了，就显示提示并依赖Storage方案
    console.log('所有数据传递方案失败，使用Storage方案');
    wx.showToast({
      title: '已选择训练',
      icon: 'success'
    });
    
    setTimeout(() => {
      wx.navigateBack();
    }, 500);
  }
});