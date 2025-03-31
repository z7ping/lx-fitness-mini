// pages/checkin/create.js
const app = getApp()
const { dataService } = require('../../services/dataService');

Page({
  data: {
    formData: {
      planId: '',
      planTitle: '',
      duration: 0,
      calories: 0,
      thoughts: '',
      images: [],
      location: null
    },
    location: null,
    loading: false
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
  },

  // 选择图片
  chooseImage() {
    app.checkLoginAndAuth(() => {
      wx.chooseImage({
        count: 9,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          const tempFiles = res.tempFilePaths;
          this.setData({
            'formData.images': [...this.data.formData.images, ...tempFiles]
          });
        }
      });
    });
  },

  // 删除图片
  deleteImage(e) {
    const { index } = e.currentTarget.dataset;
    const images = [...this.data.formData.images];
    images.splice(index, 1);
    this.setData({
      'formData.images': images
    });
  },

  // 预览图片
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    wx.previewImage({
      urls: this.data.formData.images,
      current: url
    });
  },

  // 选择位置
  chooseLocation() {
    app.checkLoginAndAuth(() => {
      wx.chooseLocation({
        success: (res) => {
          this.setData({
            location: {
              name: res.name,
              address: res.address,
              latitude: res.latitude,
              longitude: res.longitude
            },
            'formData.location': {
              name: res.name,
              address: res.address,
              latitude: res.latitude,
              longitude: res.longitude
            }
          });
        }
      });
    });
  },

  // 输入运动时长
  onDurationInput(e) {
    this.setData({
      'formData.duration': parseInt(e.detail.value) || 0
    });
  },

  // 输入消耗卡路里
  onCaloriesInput(e) {
    this.setData({
      'formData.calories': parseInt(e.detail.value) || 0
    });
  },

  // 输入运动感想
  onThoughtsInput(e) {
    this.setData({
      'formData.thoughts': e.detail.value
    });
  },

  // 保存打卡记录
  async saveRecord() {
    try {
      this.setData({ loading: true });
      
      // 验证表单数据
      if (!this.validateForm()) {
        return;
      }

      // 保存记录
      const record = {
        ...this.data.formData,
        id: Date.now(),
        checkinTime: new Date().toISOString(),
        userId: app.globalData.userInfo.id
      };

      // 使用 dataService 保存记录
      dataService.saveExerciseRecord(record);
      
      wx.showToast({
        title: '打卡成功',
        icon: 'success'
      });

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('保存打卡记录失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  // 验证表单数据
  validateForm() {
    const { formData } = this.data;
    
    if (!formData.planId) {
      wx.showToast({
        title: '请选择训练计划',
        icon: 'none'
      });
      return false;
    }
    
    if (!formData.duration) {
      wx.showToast({
        title: '请输入运动时长',
        icon: 'none'
      });
      return false;
    }
    
    if (!formData.calories) {
      wx.showToast({
        title: '请输入消耗卡路里',
        icon: 'none'
      });
      return false;
    }
    
    return true;
  }
});