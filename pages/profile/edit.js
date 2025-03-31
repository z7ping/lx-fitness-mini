// pages/profile/edit.js
const app = getApp()
const { dataService } = require('../../services/dataService')

Page({
  data: {
    formData: {
      avatarUrl: '',
      nickName: '',
      gender: 1,
      birthday: '',
      height: '',
      weight: '',
      targetWeight: '',
      goal: '',
      frequency: '',
      duration: ''
    },
    maxDate: '',
    minDate: '', // 添加最小日期
    // 训练目标选项
    goalOptions: ['减脂', '增肌', '塑形', '提高体能', '保持健康'],
    goalIndex: 0,
    // 训练频率选项
    frequencyOptions: ['每周3次', '每周4次', '每周5次', '每周6次', '每天'],
    frequencyIndex: 0,
    // 训练时长选项
    durationOptions: ['30分钟', '45分钟', '60分钟', '90分钟', '120分钟'],
    durationIndex: 0
  },

  onLoad() {
    // 设置最大日期为今天
    const today = new Date()
    const maxDate = today.toISOString().split('T')[0]
    
    // 设置默认生日为24年前的今天
    const defaultDate = new Date()
    defaultDate.setFullYear(defaultDate.getFullYear() - 24)
    const defaultBirthday = defaultDate.toISOString().split('T')[0]
    
    this.setData({ 
      maxDate,
      'formData.birthday': defaultBirthday
    })
    
    this.loadUserInfo()
  },

  // 加载用户信息
  loadUserInfo() {
    try {
      const userInfo = dataService.getUserInfo() || {}
      
      // 设置表单数据
      this.setData({
        formData: {
          avatarUrl: userInfo.avatarUrl || '',
          nickName: userInfo.nickName || '',
          gender: userInfo.gender || 1,
          birthday: userInfo.birthday || '',
          height: userInfo.height || '',
          weight: userInfo.weight || '',
          targetWeight: userInfo.targetWeight || '',
          goal: userInfo.goal || '',
          frequency: userInfo.frequency || '',
          duration: userInfo.duration || ''
        },
        goalIndex: this.data.goalOptions.indexOf(userInfo.goal) > -1 ? 
          this.data.goalOptions.indexOf(userInfo.goal) : 0,
        frequencyIndex: this.data.frequencyOptions.indexOf(userInfo.frequency) > -1 ? 
          this.data.frequencyOptions.indexOf(userInfo.frequency) : 0,
        durationIndex: this.data.durationOptions.indexOf(userInfo.duration) > -1 ? 
          this.data.durationOptions.indexOf(userInfo.duration) : 0
      })
    } catch (error) {
      console.error('加载用户信息失败:', error)
      app.utils.showToast('加载用户信息失败')
    }
  },

  // 返回上一页
  onBack() {
    wx.navigateBack()
  },

  // 选择头像
  chooseAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        
        // 更新头像
        this.setData({
          'formData.avatarUrl': tempFilePath
        })
        
        // TODO: 上传头像到服务器
        // 这里可以添加上传逻辑，目前先使用本地路径
      }
    })
  },

  // 输入框内容变更
  onInputChange(e) {
    const { field } = e.currentTarget.dataset
    const { value } = e.detail
    
    this.setData({
      [`formData.${field}`]: value
    })
  },

  // 性别变更
  onGenderChange(e) {
    this.setData({
      'formData.gender': parseInt(e.detail.value)
    })
  },

  // 生日变更
  onBirthdayChange(e) {
    this.setData({
      'formData.birthday': e.detail.value
    })
  },

  // 训练目标变更
  onGoalChange(e) {
    this.setData({
      goalIndex: e.detail.value,
      'formData.goal': this.data.goalOptions[e.detail.value]
    })
  },

  // 训练频率变更
  onFrequencyChange(e) {
    this.setData({
      frequencyIndex: e.detail.value,
      'formData.frequency': this.data.frequencyOptions[e.detail.value]
    })
  },

  // 训练时长变更
  onDurationChange(e) {
    this.setData({
      durationIndex: e.detail.value,
      'formData.duration': this.data.durationOptions[e.detail.value]
    })
  },

  // 验证表单数据
  validateForm() {
    const { formData } = this.data
    
    if (!formData.nickName) {
      app.utils.showToast('请输入昵称')
      return false
    }
    
    if (!formData.birthday) {
      app.utils.showToast('请选择生日')
      return false
    }
    
    if (!formData.height) {
      app.utils.showToast('请输入身高')
      return false
    }
    
    if (!formData.weight) {
      app.utils.showToast('请输入体重')
      return false
    }
    
    if (!formData.targetWeight) {
      app.utils.showToast('请输入目标体重')
      return false
    }
    
    // 验证数值范围
    const height = parseFloat(formData.height)
    const weight = parseFloat(formData.weight)
    const targetWeight = parseFloat(formData.targetWeight)
    
    if (height < 100 || height > 250) {
      app.utils.showToast('请输入有效的身高')
      return false
    }
    
    if (weight < 30 || weight > 300) {
      app.utils.showToast('请输入有效的体重')
      return false
    }
    
    if (targetWeight < 30 || targetWeight > 300) {
      app.utils.showToast('请输入有效的目标体重')
      return false
    }
    
    return true
  },

  // 保存用户信息
  handleSave() {
    if (!this.validateForm()) return
    
    try {
      const { formData } = this.data
      
      // 保存到 dataService
      dataService.saveUserInfo(formData)
      
      app.utils.showToast('保存成功', 'success')
      
      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (error) {
      console.error('保存用户信息失败:', error)
      app.utils.showToast('保存失败，请重试')
    }
  }
})