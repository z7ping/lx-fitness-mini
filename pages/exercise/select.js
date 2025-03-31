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
      weight: 0
    };
    
    // 使用eventChannel发送数据
    const eventChannel = this.getOpenerEventChannel();
    console.log('准备通过eventChannel发送数据');
    
    // 确保eventChannel存在
    if (eventChannel && eventChannel.emit) {
      console.log('eventChannel存在，发送数据:', exerciseData);
      eventChannel.emit('acceptExercise', exerciseData);
    } else {
      console.log('eventChannel不存在或没有emit方法');
      // 降级处理：直接修改上一页数据
      const pages = getCurrentPages();
      const prevPage = pages[pages.length - 2];
      
      if (prevPage && prevPage.data.planInfo) {
        const exercises = prevPage.data.planInfo.exercises;
        exercises.push(exerciseData);
        
        prevPage.setData({
          'planInfo.exercises': exercises
        });
        console.log('已通过直接修改上一页数据添加运动');
      }
    }

    wx.navigateBack();
  }
});