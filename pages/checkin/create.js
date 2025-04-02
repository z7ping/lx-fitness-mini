// pages/checkin/create.js
const app = getApp()
const { dataService } = require('../../services/dataService');

// 格式化时间
function formatTime(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');
  const minute = date.getMinutes().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

Page({
  data: {
    checkinType: 'training', // 默认为训练打卡
    formData: {
      type: 'training',
      planId: '',
      planTitle: '',
      duration: 0,
      calories: 0,
      thoughts: '',
      images: [],
      location: null
    },
    location: null,
    submitting: false,
    showTimePicker: false,
    currentDate: new Date().getTime(),
    minDate: new Date().getTime() - 24 * 60 * 60 * 1000, // 允许选择24小时内的时间
    maxDate: new Date().getTime(),
    checkinTime: formatTime(new Date()),
    thoughts: '',
    markers: []
  },

  onLoad() {
    // 检查登录状态
    if (!app.checkLoginAndAuth()) {
      return;
    }
    this.initFormData();
  },

  // 初始化表单数据
  initFormData() {
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    if (prevPage) {
      const { planId, planTitle } = prevPage.data;
      this.setData({
        'formData.planId': planId || '',
        'formData.planTitle': planTitle || ''
      });
    }

    // 设置默认打卡时间
    this.setData({
      checkinTime: formatTime(new Date())
    });
  },

  // 切换打卡类型
  switchType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      checkinType: type,
      'formData.type': type,
      thoughts: '' // 清空心得内容
    });
  },

  // 显示时间选择器
  showTimePicker() {
    this.setData({
      showTimePicker: true
    });
  },

  // 关闭时间选择器
  onCloseTimePicker() {
    this.setData({
      showTimePicker: false
    });
  },

  // 确认时间选择
  onConfirmTime(e) {
    const date = new Date(e.detail);
    this.setData({
      checkinTime: formatTime(date),
      currentDate: e.detail,
      showTimePicker: false
    });
  },

  // 选择位置
  chooseLocation() {
    wx.authorize({
      scope: 'scope.userLocation',
      success: () => {
        wx.chooseLocation({
          success: (res) => {
            this.setData({
              location: {
                name: res.name,
                address: res.address,
                latitude: res.latitude,
                longitude: res.longitude
              },
              markers: [{
                id: 1,
                latitude: res.latitude,
                longitude: res.longitude,
                name: res.name
              }]
            });
          },
          fail: (err) => {
            console.error('选择位置失败:', err);
            if (err.errMsg.indexOf('auth deny') !== -1) {
              wx.showModal({
                title: '提示',
                content: '需要您授权使用位置信息',
                confirmText: '去授权',
                success: (res) => {
                  if (res.confirm) {
                    wx.openSetting();
                  }
                }
              });
            } else {
              wx.showToast({
                title: '选择位置失败',
                icon: 'none'
              });
            }
          }
        });
      },
      fail: () => {
        wx.showModal({
          title: '提示',
          content: '需要您授权使用位置信息',
          confirmText: '去授权',
          success: (res) => {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      }
    });
  },

  // 提交打卡
  async submitCheckin() {
    if (this.data.submitting) return;

    try {
      this.setData({ submitting: true });
      
      // 构建打卡数据
      const checkinData = {
        id: Date.now().toString(),
        userId: app.globalData.userInfo?.id,
        type: this.data.checkinType,
        time: this.data.checkinTime,
        location: this.data.location,
        thoughts: this.data.thoughts,
        createTime: new Date().getTime()
      };

      // 数据验证
      if (!checkinData.thoughts.trim()) {
        wx.showToast({
          title: this.data.checkinType === 'training' ? '请输入训练心得' : '请输入饮食心得',
          icon: 'none'
        });
        return;
      }

      // 保存打卡记录
      if (this.data.checkinType === 'training') {
        await dataService.saveExerciseRecord(checkinData);
      } else {
        await dataService.saveDietRecord(checkinData);
      }
      
      wx.showToast({
        title: '打卡成功',
        icon: 'success'
      });

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('打卡失败:', error);
      wx.showToast({
        title: error.message || '打卡失败',
        icon: 'none'
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
});