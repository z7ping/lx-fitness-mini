// AI模型配置
const AI_MODELS = {
  volcengine: {
    key: 'volcengine',
    name: '火山引擎-DeepSeek-R1',
    icon: 'fire-o',
    description: '字节部署的满血版DeepSeek-R1，专注中文训练规划',
    apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    config: {
      model: 'deepseek-r1-250120',
      temperature: 0.8,
      max_tokens: 2000
    }
  },
  deepseek: {
    key: 'deepseek',
    name: 'DeepSeek-R1',
    icon: 'cluster-o',
    description: 'DeepSeek官方 671B满血版,专业健身训练规划',
    apiUrl: 'https://api.deepseek.com/v1/chat/completions',
    config: {
      temperature: 0.75,
      max_tokens: 2000
    }
  },
  gemini: {
    key: 'gemini',
    name: 'Gemini Pro',
    icon: 'fire-o',
    description: 'Google出品，更适合初学者的计划',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
    config: {
      temperature: 0.7,
      max_tokens: 2000
    }
  }
};

// 获取所有可用的AI模型列表
const getAIModels = () => {
  return Object.values(AI_MODELS);
};

// 获取指定模型的配置
const getModelConfig = (modelKey) => {
  return AI_MODELS[modelKey] || AI_MODELS.deepseek;
};

// 获取默认模型
const getDefaultModel = () => {
  // 从本地存储获取上次选择的模型
  const lastSelectedModel = wx.getStorageSync('selected_ai_model');
  if (lastSelectedModel && AI_MODELS[lastSelectedModel]) {
    return AI_MODELS[lastSelectedModel];
  }
  return AI_MODELS.deepseek;
};

// 保存选择的模型
const saveSelectedModel = (modelKey) => {
  wx.setStorageSync('selected_ai_model', modelKey);
};

module.exports = {
  AI_MODELS,
  getAIModels,
  getModelConfig,
  getDefaultModel,
  saveSelectedModel
}; 