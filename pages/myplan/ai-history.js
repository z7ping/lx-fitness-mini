const app = getApp();
const { dataService } = require('../../services/dataService');
const { getAIModels } = require('../../utils/config');

Page({
  data: {
    historyRecords: [],
    loading: true,
    isEmpty: false,
    modelNameMap: {}
  },

  onLoad() {
    this.initModelNameMap();
    this.loadHistoryRecords();
  },

  onShow() {
    // 每次页面显示时重新加载记录，确保数据最新
    this.loadHistoryRecords();
  },

  // 初始化模型名称映射表
  initModelNameMap() {
    const models = getAIModels();
    const modelNameMap = {};
    
    models.forEach(model => {
      modelNameMap[model.key] = model.name;
    });
    
    this.setData({ modelNameMap });
  },

  // 加载历史记录
  loadHistoryRecords() {
    this.setData({ loading: true });
    
    try {
      // 获取所有AI生成记录
      const records = dataService.getAIGenerationRecords() || [];
      
      // 格式化记录，添加显示所需的属性
      const formattedRecords = records.map(record => {
        // 格式化时间
        const date = new Date(record.timestamp);
        const formattedDate = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        // 提取提示词的前50个字符作为预览
        const promptPreview = record.prompt ? (record.prompt.length > 50 ? record.prompt.substring(0, 50) + '...' : record.prompt) : '无提示词';
        
        // 提取回复的前100个字符作为预览
        const responsePreview = record.response ? (record.response.length > 100 ? record.response.substring(0, 100) + '...' : record.response) : '无回复';
        
        // 获取用户友好的模型名称
        const modelName = this.data.modelNameMap[record.model] || record.model || '默认模型';
        
        return {
          ...record,
          formattedDate,
          promptPreview,
          responsePreview,
          // 根据类型设置图标
          icon: 'chat-o',
          modelName
        };
      });
      
      this.setData({
        historyRecords: formattedRecords,
        loading: false,
        isEmpty: formattedRecords.length === 0
      });
    } catch (error) {
      console.error('加载历史记录失败:', error);
      this.setData({
        loading: false,
        isEmpty: true
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 查看记录详情
  viewRecordDetail(e) {
    const { id } = e.currentTarget.dataset;
    
    if (!id) {
      wx.showToast({
        title: '记录ID无效',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `./ai-generate?recordId=${id}`
    });
  },

  // 删除记录
  deleteRecord(e) {
    // 阻止事件冒泡
    e.stopPropagation();
    
    const { index } = e.currentTarget.dataset;
    if (typeof index !== 'number' || index < 0 || index >= this.data.historyRecords.length) {
      wx.showToast({
        title: '记录索引无效',
        icon: 'none'
      });
      return;
    }
    
    const record = this.data.historyRecords[index];
    if (!record || !record.id) {
      wx.showToast({
        title: '记录ID无效',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条生成记录吗？',
      confirmText: '删除',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          try {
            // 删除记录
            dataService.deleteAIGenerationRecord(record.id);
            
            // 更新列表
            const historyRecords = [...this.data.historyRecords];
            historyRecords.splice(index, 1);
            
            this.setData({
              historyRecords,
              isEmpty: historyRecords.length === 0
            });
            
            wx.showToast({
              title: '删除成功',
              icon: 'success'
            });
          } catch (error) {
            console.error('删除记录失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 清空所有记录
  clearAllRecords() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有生成记录吗？此操作不可恢复。',
      confirmText: '清空',
      confirmColor: '#ff4d4f',
      success: (res) => {
        if (res.confirm) {
          try {
            // 获取所有记录
            const records = this.data.historyRecords;
            
            // 逐个删除记录
            records.forEach(record => {
              dataService.deleteAIGenerationRecord(record.id);
            });
            
            this.setData({
              historyRecords: [],
              isEmpty: true
            });
            
            wx.showToast({
              title: '已清空记录',
              icon: 'success'
            });
          } catch (error) {
            console.error('清空记录失败:', error);
            wx.showToast({
              title: '操作失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 返回生成页面
  goToGenerate() {
    wx.navigateTo({
      url: './ai-generate'
    });
  }
}); 