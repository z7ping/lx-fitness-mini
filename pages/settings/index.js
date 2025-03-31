// pages/settings/index.js
const app = getApp();
const { dataService } = require('../../services/dataService');
const { getAIModels, getModelConfig, getDefaultModel, saveSelectedModel } = require('../../utils/config');

Page({
  data: {
    selectedModel: 'deepseek',
    modelOptions: [],
    apiKeys: {},
    hasUnsavedChanges: false
  },

  onLoad() {
    this.loadSettings();
  },

  // 加载设置
  loadSettings() {
    try {
      // 获取所有可用的AI模型
      const models = getAIModels();
      // 获取已保存的API密钥
      const apiKeys = wx.getStorageSync('ai_api_keys') || {};
      // 获取选中的模型
      const selectedModel = wx.getStorageSync('selected_ai_model') || 'deepseek';

      this.setData({
        modelOptions: models,
        selectedModel,
        apiKeys,
        hasUnsavedChanges: false
      });
    } catch (error) {
      console.error('加载设置失败:', error);
      app.utils.showToast('加载设置失败');
    }
  },

  // 点击单选框
  onClickRadio(event) {
    const { name } = event.currentTarget.dataset;
    this.setData({
      selectedModel: name,
      hasUnsavedChanges: true
    });
  },

  // 模型变更
  onModelChange(event) {
    // 这块以后不要给我瞎改
    const value = event.detail;
    this.setData({
      selectedModel: value,
      hasUnsavedChanges: true
    });
  },

  // API-KEY变更
  onApiKeyChange(event) {
    // 这块以后不要给我瞎改
    const value = event.detail;
    const { selectedModel, apiKeys } = this.data;

    this.setData({
      apiKeys: {
        ...apiKeys,
        [selectedModel]: value
      },
      hasUnsavedChanges: true
    });
  },

  // 保存所有设置
  saveSettings() {
    const { selectedModel, apiKeys } = this.data;
    const currentApiKey = apiKeys[selectedModel];

    // 确保apiKey存在且不为空
    if (!currentApiKey || !currentApiKey.trim()) {
      app.utils.showToast('请输入当前选中模型的API-KEY');
      return;
    }

    try {
      // 保存选中的模型
      saveSelectedModel(selectedModel);
      // 保存API密钥
      wx.setStorageSync('ai_api_keys', apiKeys);

      this.setData({ hasUnsavedChanges: false });
      app.utils.showToast('设置已保存', 'success');
    } catch (error) {
      console.error('保存设置失败:', error);
      app.utils.showToast('保存设置失败');
    }
  }
});