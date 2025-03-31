// pages/device/bind.js
Page({
  data: {
    scanning: false,
    devices: [],
    selectedDevice: null,
    connectedDevices: []
  },

  onLoad() {
    // 页面加载时自动开始扫描
    this.startScan();
  },

  // 开始扫描设备
  async startScan() {
    if (this.data.scanning) return;

    try {
      this.setData({ scanning: true, devices: [] });
      
      // 检查蓝牙是否可用
      await this.checkBluetoothAvailable();
      
      console.log('[设备扫描] 开始扫描蓝牙设备...');

      // 开始扫描附近的蓝牙设备
      const XiaomiWatchS4 = require('../../utils/xiaomiWatch');
      console.log('[设备扫描] 使用小米手表S4服务UUID:', XiaomiWatchS4.SERVICE_UUID);
      
      wx.startBluetoothDevicesDiscovery({
        allowDuplicatesKey: false,
        success: async () => {
          console.log('[设备扫描] 扫描启动成功');
          // 获取已连接设备
          await this.getConnectedDevices();
          
          // 获取已绑定设备列表
          const boundDevices = wx.getStorageSync('boundDevices') || [];
          
          // 监听扫描到新设备事件
          wx.onBluetoothDeviceFound((res) => {
            console.log('[设备扫描] 发现新设备:', res.devices);
            console.log('[设备扫描] 设备详细信息:', res.devices.map(device => ({
              deviceId: device.deviceId,
              name: device.name,
              localName: device.localName,
              advertisServiceUUIDs: device.advertisServiceUUIDs,
              RSSI: device.RSSI
            })));
            const newDevices = res.devices.map(device => {
              // 检查设备是否已绑定
              const boundDevice = boundDevices.find(d => d.deviceId === device.deviceId);
              return {
                ...device,
                name: device.name || device.localName || '未知设备',
                RSSI: device.RSSI || -100,
                connected: this.isDeviceConnected(device.deviceId),
                bound: !!boundDevice,
                boundInfo: boundDevice
              };
            });
            
            if (newDevices.length > 0) {
              // 过滤重复设备并按信号强度排序
              const existingDeviceIds = this.data.devices.map(d => d.deviceId);
              const uniqueNewDevices = newDevices
                .filter(d => !existingDeviceIds.includes(d.deviceId))
                .sort((a, b) => b.RSSI - a.RSSI);
              
              if (uniqueNewDevices.length > 0) {
                console.log('[设备扫描] 发现匹配的设备:', uniqueNewDevices);
                this.setData({
                  devices: [...this.data.devices, ...uniqueNewDevices]
                });
              }
            }
          });
        },
        fail: (error) => {
          console.error('扫描设备失败:', error);
          getApp().utils.showToast('扫描设备失败');
          this.setData({ scanning: false });
        }
      });
    } catch (error) {
      console.error('启动扫描失败:', error);
      getApp().utils.showToast('启动扫描失败');
      this.setData({ scanning: false });
    }
  },

  // 停止扫描
  stopScan() {
    if (!this.data.scanning) return;
    
    console.log('[设备扫描] 停止扫描...');
    wx.stopBluetoothDevicesDiscovery({
      complete: () => {
        console.log('[设备扫描] 扫描已停止');
        this.setData({ scanning: false });
      }
    });
  },

  // 获取已连接设备
  async getConnectedDevices() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.getConnectedBluetoothDevices({
          success: (res) => {
            console.log('[设备扫描] 获取已连接设备原始数据:', res);
            resolve(res);
          },
          fail: (error) => reject(error)
        });
      });
      
      if (res.devices && res.devices.length > 0) {
        const connectedDevices = res.devices.map(device => {
          console.log('[设备扫描] 已连接设备详情:', {
            deviceId: device.deviceId,
            name: device.name,
            localName: device.localName,
            services: device.services
          });
          return {
            ...device,
            name: device.name || device.localName || '未知设备'
          };
        });
        console.log('[设备扫描] 已连接设备列表:', connectedDevices);
        this.setData({ connectedDevices });
      } else {
        console.log('[设备扫描] 无已连接设备');
        this.setData({ connectedDevices: [] });
      }
    } catch (error) {
      console.error('获取已连接设备失败:', error);
      this.setData({ connectedDevices: [] });
    }
  },

  // 检查设备是否已连接
  isDeviceConnected(deviceId) {
    return this.data.connectedDevices.some(device => device.deviceId === deviceId);
  },

  // 检查蓝牙是否可用
  checkBluetoothAvailable() {
    return new Promise((resolve, reject) => {
      wx.openBluetoothAdapter({
        success: (res) => {
          resolve(res);
        },
        fail: (error) => {
          console.error('蓝牙不可用:', error);
          getApp().utils.showToast('请开启蓝牙功能');
          reject(error);
        }
      });
    });
  },

  // 选择设备
  selectDevice(e) {
    const { device } = e.currentTarget.dataset;
    console.log('[设备选择] 用户选择设备:', device);
    this.setData({ selectedDevice: device });
  },

  // 绑定设备
  async bindDevice() {
    if (!this.data.selectedDevice) {
      console.log('[设备绑定] 未选择设备');
      getApp().utils.showToast('请选择要绑定的设备');
      return;
    }
    console.log('[设备绑定] 开始绑定设备:', this.data.selectedDevice);

    try {
      // 尝试连接设备
      await this.connectDevice(this.data.selectedDevice);
      
      // 保存设备信息到统一数据服务
      const deviceInfo = {
        ...this.data.selectedDevice,
        id: Date.now(), // 生成唯一ID
        lastSync: new Date().toISOString(),
        batteryLevel: 100, // 默认电量
        status: 'connected'
      };
      
      // 使用统一数据服务保存设备信息
      const dataService = require('../../services/dataService');
      dataService.saveDeviceInfo(deviceInfo);
      
      console.log('[设备绑定] 设备信息已保存');
      
      getApp().utils.showToast('设备绑定成功', 'success');
      
      // 返回设备列表页面
      wx.navigateBack();
    } catch (error) {
      console.error('绑定设备失败:', error);
      getApp().utils.showToast('绑定设备失败');
    }
  },

  // 连接设备
  async connectDevice(device) {
    return new Promise((resolve, reject) => {
      wx.createBLEConnection({
        deviceId: device.deviceId,
        timeout: 10000,
        success: async (res) => {
          console.log('[设备连接] 连接成功:', res);
          
          // 获取设备的所有服务
          wx.getBLEDeviceServices({
            deviceId: device.deviceId,
            success: (servicesRes) => {
              console.log('[设备连接] 发现服务:', servicesRes.services);
              
              // 遍历所有服务
              servicesRes.services.forEach(service => {
                // 获取服务的特征值
                wx.getBLEDeviceCharacteristics({
                  deviceId: device.deviceId,
                  serviceId: service.uuid,
                  success: (characteristicsRes) => {
                    console.log(`[设备连接] 服务${service.uuid}的特征值:`, characteristicsRes.characteristics);
                  },
                  fail: (error) => {
                    console.error(`[设备连接] 获取服务${service.uuid}的特征值失败:`, error);
                  }
                });
              });
            },
            fail: (error) => {
              console.error('[设备连接] 获取服务列表失败:', error);
            }
          });
          // 更新已连接设备列表
          await this.getConnectedDevices();
          // 更新当前设备列表中的连接状态
          const updatedDevices = this.data.devices.map(d => ({
            ...d,
            connected: d.deviceId === device.deviceId
          }));
          this.setData({ devices: updatedDevices });
          resolve(res);
        },
        fail: (error) => {
          console.error('[设备连接] 连接失败:', error);
          reject(error);
        }
      });
    });
  },

  onUnload() {
    // 页面卸载时停止扫描
    this.stopScan();
    // 关闭蓝牙适配器
    wx.closeBluetoothAdapter();
  }
});