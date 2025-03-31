const app = getApp()
const { dataService } = require('../../services/dataService')

Component({
  data: {
    show: false,
    userInfo: null,
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    overlayStyle: 'z-index: 999999;',
  },

  lifetimes: {
    attached() {
      if (wx.getUserProfile) {
        this.setData({
          canIUseGetUserProfile: true
        })
      }
    }
  },

  methods: {
    showPopup() {
      this.setData({ show: true })
    },

    onClose() {
      this.setData({ show: false })
      this.triggerEvent('close')
    },

    handleAuth() {
      // 先获取用户信息
      wx.getUserProfile({
        desc: '用于完善会员资料',
        success: (res) => {
          console.log("===>获取的用户信息", res)
          const userInfo = res.userInfo
          
          // 获取用户位置信息
          wx.getLocation({
            type: 'gcj02',
            success: (location) => {
              console.log("===>获取用户位置信息", location)
              
              // 构建完整的用户信息对象
              const completeUserInfo = {
                ...userInfo,
                location: {
                  latitude: location.latitude,
                  longitude: location.longitude
                },
                lastLoginTime: new Date().toISOString(),
                registrationDate: new Date().toISOString()
              }
              
              // 使用dataService保存用户信息
              try {
                dataService.saveUserInfo(completeUserInfo)
                app.globalData.userInfo = completeUserInfo
                app.globalData.isLoggedIn = true
                
                this.setData({
                  userInfo: completeUserInfo,
                  hasUserInfo: true
                })
                
                wx.showToast({
                  title: '授权成功',
                  icon: 'success'
                })
                
                // 关闭弹窗并触发成功事件
                setTimeout(() => {
                  this.setData({ show: false })
                  this.triggerEvent('success', { userInfo: completeUserInfo })
                }, 1500)
              } catch (error) {
                console.error('保存用户信息失败:', error)
                wx.showToast({
                  title: '授权失败',
                  icon: 'error'
                })
              }
            },
            fail: (err) => {
              console.error('获取位置信息失败:', err)
              // 即使获取位置失败，也保存用户基本信息
              const basicUserInfo = {
                ...userInfo,
                lastLoginTime: new Date().toISOString(),
                registrationDate: new Date().toISOString()
              }
              
              try {
                dataService.saveUserInfo(basicUserInfo)
                app.globalData.userInfo = basicUserInfo
                app.globalData.isLoggedIn = true
                
                this.setData({
                  userInfo: basicUserInfo,
                  hasUserInfo: true
                })
                
                wx.showToast({
                  title: '授权成功',
                  icon: 'success'
                })
                
                setTimeout(() => {
                  this.setData({ show: false })
                  this.triggerEvent('success', { userInfo: basicUserInfo })
                }, 1500)
              } catch (error) {
                console.error('保存用户信息失败:', error)
                wx.showToast({
                  title: '授权失败',
                  icon: 'error'
                })
              }
            }
          })
        },
        fail: (err) => {
          console.error('获取用户信息失败:', err)
          wx.showToast({
            title: '请允许授权以继续使用',
            icon: 'none'
          })
        }
      })
    },

    showPrivacyPolicy() {
      wx.navigateTo({
        url: '/pages/about/privacy'
      })
    }
  }
}) 