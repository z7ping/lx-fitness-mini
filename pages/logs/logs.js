const { logService } = require('../../services/logService');
const { getApiLogs, clearApiLogs } = require('../../utils/api');

Page({
  data: {
    logs: [],
    filteredLogs: [],
    activeTab: 'all',
    activeCategory: 'app', // 新增分类标签：app 或 api
    keyword: '',
    showDetail: false,
    currentLog: null,
    apiLogs: [], // 新增API日志数组
    tabs: [
      { id: 'all', name: '全部' },
      { id: 'log', name: '信息' },
      { id: 'warn', name: '警告' },
      { id: 'error', name: '错误' }
    ],
    categories: [
      { id: 'app', name: '应用日志' },
      { id: 'api', name: 'API调用' }
    ]
  },

  onLoad() {
    this.loadLogs();
    this.loadApiLogs();
  },
  
  onShow() {
    // 每次显示页面时刷新日志
    this.loadLogs();
    this.loadApiLogs();
  },
  
  // 加载应用日志
  loadLogs() {
    const logs = logService.getLogs();
    this.setData({
      logs,
      filteredLogs: logs
    });
    this.filterLogs();
  },
  
  // 加载API日志
  loadApiLogs() {
    const apiLogs = getApiLogs();
    this.setData({ apiLogs });
  },
  
  // 切换标签
  onTabChange(e) {
    const activeTab = e.currentTarget.dataset.tab;
    this.setData({ activeTab });
    this.filterLogs();
  },
  
  // 切换分类
  onCategoryChange(e) {
    const activeCategory = e.currentTarget.dataset.category;
    this.setData({ activeCategory });
  },
  
  // 搜索日志
  onSearch(e) {
    this.setData({
      keyword: e.detail
    });
    this.filterLogs();
  },
  
  // 过滤日志
  filterLogs() {
    const { logs, activeTab, keyword } = this.data;
    let filteredLogs = logs;
    
    // 按标签过滤
    if (activeTab !== 'all') {
      filteredLogs = filteredLogs.filter(log => log.level === activeTab);
    }
    
    // 按关键词过滤
    if (keyword) {
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(keyword.toLowerCase())
      );
    }
    
    this.setData({ filteredLogs });
  },
  
  // 过滤API日志
  filterApiLogs() {
    const { apiLogs, keyword } = this.data;
    if (!keyword) return apiLogs;
    
    return apiLogs.filter(log => {
      // 在模型名称、操作和数据中搜索关键词
      const searchText = JSON.stringify(log).toLowerCase();
      return searchText.includes(keyword.toLowerCase());
    });
  },
  
  // 查看日志详情
  viewLogDetail(e) {
    const index = e.currentTarget.dataset.index;
    const currentLog = this.data.filteredLogs[index];
    
    this.setData({
      showDetail: true,
      currentLog
    });
  },
  
  // 查看API日志详情
  viewApiLogDetail(e) {
    const index = e.currentTarget.dataset.index;
    const currentLog = this.data.apiLogs[index];
    
    this.setData({
      showDetail: true,
      currentLog
    });
  },
  
  // 关闭日志详情
  closeDetail() {
    this.setData({
      showDetail: false,
      currentLog: null
    });
  },
  
  // 复制日志内容
  copyLogContent() {
    if (!this.data.currentLog) return;
    
    let logContent = '';
    if (this.data.activeCategory === 'app') {
      logContent = `[${this.data.currentLog.timestamp}] [${this.data.currentLog.level.toUpperCase()}] ${this.data.currentLog.message}`;
    } else {
      logContent = JSON.stringify(this.data.currentLog, null, 2);
    }
    
    wx.setClipboardData({
      data: logContent,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      }
    });
  },
  
  // 清除所有日志
  clearLogs() {
    const category = this.data.activeCategory;
    
    wx.showModal({
      title: '确认清除',
      content: `确定要清除所有${category === 'app' ? '应用' : 'API'}日志吗？此操作不可恢复。`,
      confirmColor: '#ff4500',
      success: (res) => {
        if (res.confirm) {
          if (category === 'app') {
            logService.clearLogs();
            this.setData({
              logs: [],
              filteredLogs: []
            });
          } else {
            clearApiLogs();
            this.setData({
              apiLogs: []
            });
          }
          
          this.setData({
            showDetail: false,
            currentLog: null
          });
          
          wx.showToast({
            title: '日志已清除',
            icon: 'success'
          });
        }
      }
    });
  },
  
  // 导出日志
  exportLogs() {
    wx.showLoading({
      title: '导出中...',
      mask: true
    });
    
    // 根据当前分类选择要导出的日志
    const category = this.data.activeCategory;
    let logData = '';
    
    if (category === 'app') {
      // 应用日志
      logService.exportLogs()
        .then(filePath => {
          this.handleExportSuccess(filePath);
        })
        .catch(error => {
          this.handleExportError(error);
        });
    } else {
      // API日志
      try {
        const apiLogs = this.data.apiLogs;
        logData = apiLogs.map(log => 
          `[${log.timestamp}] [${log.model} ${log.action}] ${JSON.stringify(log.data)}`
        ).join('\n');
        
        const fs = wx.getFileSystemManager();
        const filePath = `${wx.env.USER_DATA_PATH}/api_logs_${Date.now()}.txt`;
        
        fs.writeFile({
          filePath,
          data: logData,
          encoding: 'utf8',
          success: () => {
            this.handleExportSuccess(filePath);
          },
          fail: (error) => {
            this.handleExportError(error);
          }
        });
      } catch (error) {
        this.handleExportError(error);
      }
    }
  },
  
  // 处理导出成功
  handleExportSuccess(filePath) {
    wx.hideLoading();
    
    // 保存文件到本地
    wx.saveFile({
      tempFilePath: filePath,
      success: (res) => {
        const savedFilePath = res.savedFilePath;
        
        wx.showModal({
          title: '导出成功',
          content: `日志已导出到: ${savedFilePath}`,
          confirmText: '打开文件',
          success: (res) => {
            if (res.confirm) {
              // 打开文件
              wx.openDocument({
                filePath: savedFilePath,
                success: () => {
                  console.log('打开文档成功');
                },
                fail: (err) => {
                  console.error('打开文档失败', err);
                  wx.showToast({
                    title: '无法打开文件',
                    icon: 'none'
                  });
                }
              });
            }
          }
        });
      },
      fail: (err) => {
        console.error('保存文件失败', err);
        wx.showToast({
          title: '导出失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 处理导出错误
  handleExportError(error) {
    wx.hideLoading();
    console.error('导出日志失败', error);
    wx.showToast({
      title: '导出失败',
      icon: 'none'
    });
  },
  
  // 下拉刷新
  onPullDownRefresh() {
    this.loadLogs();
    this.loadApiLogs();
    wx.stopPullDownRefresh();
  }
}); 