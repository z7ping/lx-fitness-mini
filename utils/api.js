const { AI_MODELS, getModelConfig } = require('./config');

// API配置
const API_URLS = {
  deepseek: 'https://api.deepseek.com/v1/chat/completions',
  volcengine: 'https://api.volcengine.com/v1/chat/completions',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
};

// 获取API配置
const getApiConfig = (modelKey) => {
  const modelConfig = getModelConfig(modelKey);
  const apiKeys = wx.getStorageSync('ai_api_keys') || {};
  const apiKey = apiKeys[modelKey] || '';
  
  return {
    model: modelKey,
    apiKey,
    url: modelConfig.apiUrl,
    config: modelConfig.config
  };
};

/**
 * API日志记录
 * @param {string} modelName - 模型名称
 * @param {string} action - 操作类型
 * @param {Object} data - 日志数据
 */
const logApiCall = (modelName, action, data) => {
  try {
    const logItem = {
      timestamp: new Date().toISOString(),
      model: modelName,
      action: action,
      data: data,
    };
    
    // 将日志保存到本地存储
    const apiLogs = wx.getStorageSync('ai_api_logs') || [];
    apiLogs.unshift(logItem); // 添加到最前面
    
    // 只保留最近100条日志
    if (apiLogs.length > 100) {
      apiLogs.pop();
    }
    
    wx.setStorageSync('ai_api_logs', apiLogs);
    
    // 打印到控制台
    console.log(`[${modelName} API ${action}]`, data);
  } catch (error) {
    console.error('记录API日志失败:', error);
  }
};

/**
 * 调用DeepSeek API
 * @param {Object} params - API参数
 * @param {Array} params.messages - 消息数组
 * @param {number} params.temperature - 温度参数
 * @param {number} params.max_tokens - 最大token数
 * @returns {Promise} API响应
 */
const deepseek = (params) => {
  return new Promise((resolve, reject) => {
    const config = getApiConfig('deepseek');
    
    if (!config.apiKey) {
      const error = new Error('DeepSeek API密钥未配置，请在设置中配置API-KEY');
      logApiCall('deepseek', 'error', { error: error.message });
      reject(error);
      return;
    }

    // 记录请求开始
    logApiCall('deepseek', 'request', {
      messages: params.messages.map(m => ({
        role: m.role,
        content_length: m.content.length,
        content_preview: m.content.substring(0, 100) + '...'
      })),
      temperature: params.temperature || config.config.temperature,
      max_tokens: params.max_tokens || config.config.max_tokens
    });
    
    const startTime = Date.now();
    
    wx.request({
      url: config.url,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      data: {
        model: 'deepseek-chat',
        messages: params.messages,
        temperature: params.temperature || config.config.temperature,
        max_tokens: params.max_tokens || config.config.max_tokens
      },
      success: (res) => {
        const duration = Date.now() - startTime;
        
        if (res.statusCode === 200) {
          // 记录成功响应
          logApiCall('deepseek', 'success', {
            statusCode: res.statusCode,
            duration: duration,
            response_preview: res.data.choices?.[0]?.message?.content?.substring(0, 100) + '...',
            tokens: res.data.usage
          });
        } else {
          // 记录错误响应
          logApiCall('deepseek', 'error', {
            statusCode: res.statusCode,
            duration: duration,
            error: res.data.error || res.errMsg,
            details: res.data
          });
        }
        
        handleApiResponse(res, resolve, reject);
      },
      fail: (error) => {
        const duration = Date.now() - startTime;
        
        // 记录请求失败
        logApiCall('deepseek', 'fail', {
          duration: duration,
          error: error.errMsg
        });
        
        handleApiError(error, reject);
      }
    });
  });
};

/**
 * 调用Gemini API
 * @param {Object} params - API参数
 * @param {Array} params.messages - 消息数组
 * @param {number} params.temperature - 温度参数
 * @param {number} params.max_tokens - 最大token数
 * @returns {Promise} API响应
 */
const gemini = (params) => {
  return new Promise((resolve, reject) => {
    const config = getApiConfig('gemini');
    
    if (!config.apiKey) {
      const error = new Error('Gemini API密钥未配置，请在设置中配置API-KEY');
      logApiCall('gemini', 'error', { error: error.message });
      reject(error);
      return;
    }

    const content = {
      contents: params.messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }))
    };
    
    // 记录请求开始
    logApiCall('gemini', 'request', {
      messages: params.messages.map(m => ({
        role: m.role,
        content_length: m.content.length,
        content_preview: m.content.substring(0, 100) + '...'
      })),
      temperature: params.temperature || config.config.temperature,
      max_tokens: params.max_tokens || config.config.max_tokens
    });
    
    const startTime = Date.now();

    wx.request({
      url: `${config.url}?key=${config.apiKey}`,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        ...content,
        generationConfig: {
          temperature: params.temperature || config.config.temperature,
          maxOutputTokens: params.max_tokens || config.config.max_tokens,
          topP: 0.8,
          topK: 40
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      },
      success: (res) => {
        const duration = Date.now() - startTime;
        
        if (res.statusCode === 200) {
          // 构造响应
          const response = {
            choices: [{
              message: {
                content: res.data.candidates?.[0]?.content?.parts?.[0]?.text || '无内容'
              }
            }]
          };
          
          // 记录成功响应
          logApiCall('gemini', 'success', {
            statusCode: res.statusCode,
            duration: duration,
            response_preview: response.choices[0].message.content.substring(0, 100) + '...',
            tokens: res.data.usage
          });
          
          resolve(response);
        } else {
          // 记录错误响应
          logApiCall('gemini', 'error', {
            statusCode: res.statusCode,
            duration: duration,
            error: res.data.error || res.errMsg,
            details: res.data
          });
          
          handleApiResponse(res, resolve, reject);
        }
      },
      fail: (error) => {
        const duration = Date.now() - startTime;
        
        // 记录请求失败
        logApiCall('gemini', 'fail', {
          duration: duration,
          error: error.errMsg
        });
        
        handleApiError(error, reject);
      }
    });
  });
};

/**
 * 调用火山引擎 API
 */
const volcengine = (params) => {
  return new Promise((resolve, reject) => {
    const config = getApiConfig('volcengine');
    
    if (!config.apiKey) {
      const error = new Error('火山引擎API密钥未配置，请在设置中配置API-KEY');
      logApiCall('volcengine', 'error', { error: error.message });
      reject(error);
      return;
    }
    
    // 记录请求开始
    logApiCall('volcengine', 'request', {
      messages: params.messages.map(m => ({
        role: m.role,
        content_length: m.content.length,
        content_preview: m.content.substring(0, 100) + '...'
      })),
      temperature: params.temperature || config.config.temperature,
      max_tokens: params.max_tokens || config.config.max_tokens
    });
    
    const startTime = Date.now();

    wx.request({
      url: config.url,
      method: 'POST',
      header: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      data: {
        model: 'deepseek-r1-250120',
        messages: params.messages,
        temperature: params.temperature || config.config.temperature,
        max_tokens: params.max_tokens || config.config.max_tokens
      },
      success: (res) => {
        const duration = Date.now() - startTime;
        
        if (res.statusCode === 200) {
          // 记录成功响应
          logApiCall('volcengine', 'success', {
            statusCode: res.statusCode,
            duration: duration,
            response_preview: res.data.choices?.[0]?.message?.content?.substring(0, 100) + '...',
            tokens: res.data.usage
          });
        } else {
          // 记录错误响应
          logApiCall('volcengine', 'error', {
            statusCode: res.statusCode,
            duration: duration,
            error: res.data.error || res.errMsg,
            details: res.data
          });
        }
        
        handleApiResponse(res, resolve, reject);
      },
      fail: (error) => {
        const duration = Date.now() - startTime;
        
        // 记录请求失败
        logApiCall('volcengine', 'fail', {
          duration: duration,
          error: error.errMsg
        });
        
        handleApiError(error, reject);
      }
    });
  });
};

// 统一处理API响应
const handleApiResponse = (res, resolve, reject) => {
  if (res.statusCode === 200) {
    resolve(res.data);
  } else {
    let errorMessage = '生成计划时遇到问题';
    let errorDetail = '';
    
    // 提取详细错误信息
    if (res.data && res.data.error) {
      if (typeof res.data.error === 'object') {
        errorDetail = JSON.stringify(res.data.error);
      } else {
        errorDetail = res.data.error;
      }
    }
    
    switch (res.statusCode) {
      case 401:
        errorMessage = 'API密钥无效或已过期，请联系管理员';
        break;
      case 403:
        errorMessage = '没有权限访问AI服务，请联系管理员';
        break;
      case 429:
        errorMessage = '请求过于频繁，请稍后再试';
        break;
      case 500:
        errorMessage = 'AI服务暂时不可用，请稍后再试';
        break;
      default:
        errorMessage = `生成计划失败（错误码：${res.statusCode}），请稍后重试`;
    }
    
    // 组合完整错误信息
    const fullError = new Error(errorMessage);
    fullError.statusCode = res.statusCode;
    fullError.errorDetail = errorDetail;
    fullError.rawResponse = res.data;
    
    reject(fullError);
  }
};

// 统一处理API错误
const handleApiError = (error, reject) => {
  let errorMessage = '生成计划时遇到问题';
  
  if (error.errMsg.includes('request:fail')) {
    errorMessage = '网络连接失败，请检查网络设置';
  } else if (error.errMsg.includes('timeout')) {
    errorMessage = '请求超时，请稍后重试';
  }
  
  // 创建带有详细信息的错误对象
  const fullError = new Error(errorMessage);
  fullError.originalError = error;
  fullError.errMsg = error.errMsg;
  
  reject(fullError);
};

/**
 * 获取API调用日志
 * @param {number} limit - 限制返回的日志数量
 * @returns {Array} 日志列表
 */
const getApiLogs = (limit = 50) => {
  try {
    const logs = wx.getStorageSync('ai_api_logs') || [];
    return logs.slice(0, limit);
  } catch (error) {
    console.error('获取API日志失败:', error);
    return [];
  }
};

/**
 * 清除API调用日志
 */
const clearApiLogs = () => {
  try {
    wx.setStorageSync('ai_api_logs', []);
  } catch (error) {
    console.error('清除API日志失败:', error);
  }
};

module.exports = {
  deepseek,
  gemini,
  volcengine,
  getApiLogs,
  clearApiLogs
};