// pages/device/index.js
const XiaomiWatchS4 = require('../../utils/xiaomiWatch');
const { dataService } = require('../../services/dataService');

Page({
  data: {
    devices: [],
    loading: false,
    syncing: false
  },

  onLoad() {
    this.loadDevices();
  },

  onShow() {
    // 页面显示时重新加载设备列表
    this.loadDevices();
  },

  // 加载已绑定设备列表
  async loadDevices() {
    try {
      console.log('[设备列表] 开始加载设备列表...');
      this.setData({ loading: true });
      
      // 从统一数据服务获取设备列表
      const devices = dataService.getBoundDevices();
      
      console.log('[设备列表] 加载设备列表:', devices);
      
      this.setData({ devices });
    } catch (error) {
      console.error('加载设备列表失败:', error);
      getApp().utils.showToast('加载设备列表失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 添加设备
  addDevice() {
    wx.navigateTo({
      url: '/pages/device/bind'
    });
  },

  // 查看设备详情
  viewDeviceDetail(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/device/detail?id=${id}`
    });
  },

  // 同步设备数据
  async syncDeviceData(e) {
    if (this.data.syncing) return;

    const { id } = e.currentTarget.dataset;
    const device = this.data.devices.find(d => d.id === id);
    if (!device) {
      getApp().utils.showToast('设备不存在');
      return;
    }

    console.log('[设备同步] 开始同步设备数据，设备ID:', device.deviceId);
    try {
      this.setData({ syncing: true });
      
      // 连接设备并发现服务
      await XiaomiWatchS4.connectAndDiscoverServices(device.deviceId);
      
      // 同步运动数据
      const activityData = await XiaomiWatchS4.syncActivityData(device.deviceId);
      console.log('[设备同步] 运动数据:', activityData);
      
      // 读取心率数据
      const heartRate = await XiaomiWatchS4.readHeartRate(device.deviceId);
      console.log('[设备同步] 心率数据:', heartRate);
      
      // 读取电池电量
      const batteryLevel = await XiaomiWatchS4.readBatteryLevel(device.deviceId);
      console.log('[设备同步] 电池电量:', batteryLevel);
      
      // 更新设备信息
      const updatedDevice = {
        ...device,
        lastSync: new Date().toISOString(),
        batteryLevel,
        activityData,
        heartRate
      };
      
      // 保存设备信息
      dataService.saveDeviceInfo(updatedDevice);
      
      // 如果有运动数据，保存为运动记录
      if (activityData && activityData.steps > 0) {
        const exerciseData = {
          name: '手表同步的活动',
          type: 'walking',
          duration: 0, // 从活动数据中计算
          distance: activityData.distance,
          displayDistance: (activityData.distance / 1000).toFixed(2),
          calories: activityData.calories,
          date: new Date().toISOString(),
          deviceId: device.deviceId,
          steps: activityData.steps
        };
        
        dataService.saveExerciseRecord(exerciseData);
      }
      
      // 更新页面数据
      this.loadDevices();
      
      console.log('[设备同步] 同步成功');
      getApp().utils.showToast('数据同步成功', 'success');
    } catch (error) {
      console.error('同步设备数据失败:', error);
      getApp().utils.showToast('同步失败');
    } finally {
      this.setData({ syncing: false });
      // 关闭蓝牙连接
      wx.closeBLEConnection({
        deviceId: device.deviceId,
        success: () => console.log('[设备同步] 已断开连接')
      });
    }
  }
});