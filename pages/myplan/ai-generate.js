// pages/plan/ai-generate.js
const app = getApp();
const { dataService, GOAL_MAP, LEVEL_MAP } = require('../../services/dataService');
const { deepseek, gemini, volcengine } = require('../../utils/api');
const { getAIModels, getModelConfig, getDefaultModel, saveSelectedModel } = require('../../utils/config');
const {
  analyzeUserNeedsPrompt,
  generateTrainingPlanPrompt,
  generateDietPlanPrompt
} = require('../../utils/prompts/training');
const markdownUtils = require('../../utils/markdown');

Page({
  data: {
    userInfo: null,
    userData: null,
    messages: [],
    scrollToMessage: '',
    isGenerating: false,
    showPlanActions: false,
    currentPlan: null,
    saving: false,
    showFeedback: false,
    feedback: {
      rating: 0,
      difficulty: 0,
      suggestion: ''
    },
    showRetryButton: false,
    hasGeneratedPlan: false,
    showPreview: false,
    modelOptions: [],
    selectedModel: '',
    modelIndex: 0,
    showModelPicker: false,
    // 新增历史记录相关数据
    recordId: null,
    isFromHistory: false,
    generatedData: null,
    // 新增生成进度相关数据
    generationProgress: {
      analysis: false,
      trainingPlan: false,
      dietPlan: false,
      lastAnalysis: null,
      lastTrainingPlan: null
    },
    // 新增每个步骤的状态跟踪
    stepStatus: {
      analysis: { retryable: false },
      trainingPlan: { retryable: false },
      dietPlan: { retryable: false }
    },
    // 新增等待用户确认的状态
    waitingConfirmation: false,
    currentStep: null,
    stepNameMap: {
      analysis: '分析用户需求',
      trainingPlan: '生成训练计划',
      dietPlan: '生成饮食建议'
    },
    showContinueButton: false
  },

  onLoad(options) {
    // 检查是否从历史记录页面跳转过来
    if (options && options.recordId) {
      this.setData({
        recordId: options.recordId,
        isFromHistory: true
      });
      // 设置页面标题
      wx.setNavigationBarTitle({
        title: '计划详情'
      });
      this.loadHistoryRecord(options.recordId);
    } else {
      wx.setNavigationBarTitle({
        title: 'AI生成计划'
      });
      this.loadUserInfo();
    }

    // 使用全局配置中的开发模式标志
    if (app.globalData.isDevelopment && !this.data.isFromHistory) {
      // this.addMockMessages();
    }

    const models = getAIModels();
    const modelOptions = models.map(model => ({
      text: model.name,
      value: model.key,
      description: model.description,
      icon: model.icon || ''
    }));

    this.setData({
      modelOptions,
      selectedModel: modelOptions[0].value
    });
  },

  // 加载历史记录
  loadHistoryRecord(recordId) {
    try {
      // 获取所有AI生成记录
      const records = dataService.getAIGenerationRecords();
      
      // 查找指定ID的记录
      const record = records.find(r => r.id.toString() === recordId.toString());
      
      if (!record) {
        wx.showToast({
          title: '记录不存在',
          icon: 'none'
        });
        return;
      }
      
      // 设置模型
      const modelIndex = this.data.modelOptions.findIndex(m => m.value === record.model);
      if (modelIndex !== -1) {
        this.setData({
          modelIndex,
          selectedModel: record.model
        });
      }
      
      // 加载用户信息
      this.loadUserInfo();
      
      // 将历史记录转换为消息格式
      const messages = [];
      
      // 添加提示词消息
      if (record.prompt) {
        messages.push({
          id: 'prompt_' + Date.now(),
          type: 'user',
          content: record.prompt
        });
      }
      
      // 添加回复消息，使用DeepSeek风格
      if (record.response) {
        messages.push({
          id: 'response_' + Date.now(),
          type: 'ai',
          content: record.response,
          towxml: markdownUtils.toDeepSeekStyle(record.response, {
            theme: wx.getSystemInfoSync().theme === 'dark' ? 'dark' : 'light'
          })
        });
      }
      
      // 设置消息和计划数据
      this.setData({
        messages,
        showPlanActions: true,
        hasGeneratedPlan: true,
        currentPlan: {
          analysis: record.response,
          plan: record.response,
          diet: record.response,
          feedback: record.feedback
        }
      });
      
    } catch (error) {
      console.error('加载历史记录失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    }
  },

  // 格式化用户数据
  formatUserData(userData) {
    if (!userData) return null;
    
    return {
      ...userData,
      genderText: userData.gender === 1 ? '男' : '女',
      goalText: GOAL_MAP[userData.goal] || userData.goal,
      levelText: userData.level
    };
  },

  // 加载用户信息
  async loadUserInfo() {
    const userInfo = await app.getUserInfo();
    if (!userInfo || !this.isUserInfoComplete(userInfo)) {
      wx.showModal({
        title: '信息不完整',
        content: '生成个性化训练计划需要您的完整信息，请先完善个人资料',
        confirmText: '去完善',
        cancelText: '返回',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '/pages/profile/edit'
            });
          } else {
            wx.navigateBack();
          }
        }
      });
      return;
    }
    
    // 确保有训练水平字段
    if (!userInfo.level) {
      userInfo.level = 'beginner';
    }
    
    // 格式化用户数据
    const formattedUserData = this.formatUserData(userInfo);
    this.setData({ 
      userInfo,
      userData: formattedUserData
    });
  },
  
  // 检查用户信息是否完整
  isUserInfoComplete(userInfo) {
    console.log("===>isUserInfoComplete userInfo", userInfo)
    return userInfo && 
           userInfo.gender && 
           userInfo.birthday && 
           userInfo.height && 
           userInfo.weight && 
           userInfo.goal && 
           userInfo.level;
  },

  // 开始生成计划
  async startGeneration() {
    if (this.data.isGenerating) return;
    
    this.setData({
      isGenerating: true,
      showRetryButton: false,
      messages: [],
      generatedData: null,
      // 重置生成进度
      generationProgress: {
        analysis: false,
        trainingPlan: false,
        dietPlan: false,
        lastAnalysis: null,
        lastTrainingPlan: null
      }
    });

    try {
      // 开始执行第一步：分析用户需求
      await this.confirmAndExecuteStep('analysis');
      
      // 如果用户取消了生成过程，直接返回
      if (!this.data.isGenerating) return;
      
      // 然后执行第二步：生成训练计划
      await this.confirmAndExecuteStep('trainingPlan');
      
      // 如果用户取消了生成过程，直接返回
      if (!this.data.isGenerating) return;
      
      // 最后执行第三步：生成饮食建议
      await this.confirmAndExecuteStep('dietPlan');
      
      // 如果所有步骤都完成，显示最终结果
      if (this.data.generationProgress.analysis && 
          this.data.generationProgress.trainingPlan && 
          this.data.generationProgress.dietPlan) {
        
        // 组合计划
        const fullPlan = this.combineTrainingAndDietPlans(
          this.data.generationProgress.lastTrainingPlan,
          this.data.generatedData.diet,
          this.data.generationProgress.lastAnalysis
        );
        
        // 保存生成的计划
        this.setData({
          currentPlan: {
            analysis: this.data.generationProgress.lastAnalysis,
            plan: this.data.generationProgress.lastTrainingPlan,
            diet: this.data.generatedData.diet,
            full: fullPlan
          },
          isGenerating: false,
          showPlanActions: true,
          hasGeneratedPlan: true
        });
      }
    } catch (error) {
      console.error('生成过程出错:', error);
      
      this.setData({
        isGenerating: false,
        showRetryButton: true
      });
    }
  },

  // 确认并执行步骤
  async confirmAndExecuteStep(step) {
    if (!this.data.isGenerating) return;
    
    // 设置当前步骤
    this.setData({
      currentStep: step,
      waitingConfirmation: true
    });
    
    // 显示确认弹窗
    return new Promise((resolve, reject) => {
      const stepName = this.data.stepNameMap[step] || step;
      
      wx.showModal({
        title: '确认执行',
        content: `是否开始${stepName}？`,
        confirmText: '开始生成',
        cancelText: '暂停',
        success: async (res) => {
          if (res.confirm) {
            try {
              this.setData({ waitingConfirmation: false });
              
              // 根据步骤执行相应的操作
              switch (step) {
                case 'analysis':
                  await this.analyzeUserNeeds();
                  break;
                case 'trainingPlan':
                  await this.generateTrainingPlan();
                  break;
                case 'dietPlan':
                  await this.generateDietPlan();
                  break;
              }
              resolve();
            } catch (error) {
              console.error(`执行${stepName}失败:`, error);
              reject(error);
            }
          } else {
            // 用户取消，停止生成过程
            this.setData({
              isGenerating: false,
              waitingConfirmation: false,
              showRetryButton: true
            });
            
            wx.showToast({
              title: '已暂停生成',
              icon: 'none'
            });
            
            reject(new Error('用户取消生成'));
          }
        }
      });
    });
  },

  // 合并训练计划和饮食计划
  combineTrainingAndDietPlans(trainingPlan, dietPlan, analysis) {
    try {
      // 创建一个新的周计划对象
      const weeklyPlan = {
        week: trainingPlan.week || 1,
        weekRange: trainingPlan.weekRange || dietPlan.weekRange || '本周',
        days: []
      };
      
      // 确保两个计划都有days数组
      if (!trainingPlan.days || !Array.isArray(trainingPlan.days)) {
        trainingPlan.days = [];
      }
      
      if (!dietPlan.days || !Array.isArray(dietPlan.days)) {
        dietPlan.days = [];
      }
      
      // 合并每一天的计划
      const dayNames = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      dayNames.forEach(dayName => {
        // 查找训练计划中的对应日期
        const trainingDay = trainingPlan.days.find(d => d.day === dayName) || { day: dayName, plans: [] };
        
        // 查找饮食计划中的对应日期
        const dietDay = dietPlan.days.find(d => d.day === dayName) || { 
          day: dayName, 
          diet: {
            breakfast: { content: '暂无安排' },
            lunch: { content: '暂无安排' },
            dinner: { content: '暂无安排' },
            snacks: { content: '暂无安排' }
          } 
        };
        
        // 合并这一天的计划
        weeklyPlan.days.push({
          day: dayName,
          plans: trainingDay.plans || [],
          diet: dietDay.diet || {
            breakfast: { content: '暂无安排' },
            lunch: { content: '暂无安排' },
            dinner: { content: '暂无安排' },
            snacks: { content: '暂无安排' }
          }
        });
      });
      
      // 添加营养信息和注意事项
      const combinedPlan = {
        weeklyPlan,
        analysis: analysis,
        dailyNutrition: dietPlan.dailyNutrition || {},
        notes: dietPlan.notes || ''
      };
      
      return combinedPlan;
    } catch (error) {
      console.error('合并计划失败:', error);
      return null;
    }
  },

  // 分析用户需求
  async analyzeUserNeeds() {
    this.addThinkingMessage('正在分析您的训练需求...');
    
    try {
      // 构建提示词
      const userInfo = this.data.userData;
      const prompt = analyzeUserNeedsPrompt(userInfo);
      
      // 添加提示词到消息列表
      this.addMessage('user', prompt);
      
      // 调用AI获取分析结果
      const analysis = await this.callAI(prompt);
      
      if (!analysis || analysis.includes('生成失败') || analysis.includes('抱歉')) {
        throw new Error('分析用户需求失败');
      }
      
      // 添加分析结果到消息列表
      this.addMessage('ai', analysis);
      
      // 更新生成进度
      this.setData({
        'generationProgress.analysis': true,
        'generationProgress.lastAnalysis': analysis
      });
      
      return analysis;
    } catch (error) {
      console.error('分析用户需求失败:', error);
      this.addMessage('ai', `抱歉，分析用户需求失败: ${error.message || '未知错误'}`, 'analysis', true);
      throw error;
    }
  },

  // 生成训练计划
  async generateTrainingPlan() {
    this.addThinkingMessage('正在生成个性化训练计划...');
    
    try {
      // 构建提示词
      const userInfo = this.data.userData;
      const analysis = this.data.generationProgress.lastAnalysis;
      const prompt = generateTrainingPlanPrompt(userInfo, analysis);
      
      // 添加提示词到消息列表
      this.addMessage('user', prompt);
      
      // 调用AI获取训练计划
      const trainingPlanResponse = await this.callAI(prompt);
      
      if (!trainingPlanResponse) {
        throw new Error('生成训练计划失败');
      }
      
      // 使用新的解析方法
      try {
        const trainingPlan = this.parseAIResponse(trainingPlanResponse, 'training');
        
        // 添加训练计划到消息列表
        this.addMessage('ai', trainingPlanResponse);
        
        // 更新生成进度
        this.setData({
          'generationProgress.trainingPlan': true,
          'generationProgress.lastTrainingPlan': trainingPlan
        });
        
        return trainingPlan;
      } catch (error) {
        throw new Error('解析训练计划失败：' + error.message);
      }
    } catch (error) {
      console.error('生成训练计划失败:', error);
      this.addMessage('ai', `抱歉，生成训练计划失败: ${error.message || '未知错误'}`, 'trainingPlan', true);
      throw error;
    }
  },

  // 检查是否是完整的 JSON
  isCompleteJSON(response) {
    try {
      // 提取 JSON 字符串
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) return false;
      
      const jsonStr = jsonMatch[1];
      
      // 检查基本结构是否完整
      if (!jsonStr.includes('"week"') || !jsonStr.includes('"days"')) {
        return false;
      }
      
      // 检查括号是否匹配
      const openBrackets = (jsonStr.match(/{/g) || []).length;
      const closeBrackets = (jsonStr.match(/}/g) || []).length;
      if (openBrackets !== closeBrackets) {
        return false;
      }
      
      // 尝试解析
      JSON.parse(jsonStr);
      return true;
    } catch (error) {
      return false;
    }
  },

  // 合并两次 JSON 响应
  mergeJSONResponses(firstResponse, secondResponse) {
    try {
      // 提取两个响应中的 JSON 部分
      const firstMatch = firstResponse.match(/```json\s*([\s\S]*?)\s*```/);
      const secondMatch = secondResponse.match(/```json\s*([\s\S]*?)\s*```/);
      
      if (!firstMatch || !secondMatch) return null;
      
      let mergedStr = firstMatch[1];
      
      // 如果第一个响应以逗号结尾，直接拼接
      if (mergedStr.trim().endsWith(',')) {
        mergedStr += secondMatch[1].trim();
      } else {
        // 否则尝试在合适的位置拼接
        const lastBracketIndex = mergedStr.lastIndexOf('}');
        if (lastBracketIndex !== -1) {
          mergedStr = mergedStr.substring(0, lastBracketIndex);
          mergedStr += secondMatch[1].trim();
        }
      }
      
      // 验证合并后的 JSON 是否有效
      const result = JSON.parse(mergedStr);
      
      // 检查必要的字段是否存在
      if (!result.week || !Array.isArray(result.days)) {
        throw new Error('合并后的JSON格式不完整');
      }
      
      return `\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;
    } catch (error) {
      console.error('合并JSON响应失败:', error);
      return null;
    }
  },

  // 修改解析 JSON 的方法
  parseAIResponse(response, type = 'training') {
    try {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error('未找到有效的JSON格式数据');
      }
      
      const jsonStr = jsonMatch[1];
      const result = JSON.parse(jsonStr);
      
      // 验证数据结构
      if (type === 'training') {
        if (!result.week || !Array.isArray(result.days)) {
          throw new Error('训练计划数据格式不完整');
        }
      } else if (type === 'diet') {
        if (!result.days || !result.dailyNutrition) {
          throw new Error('饮食计划数据格式不完整');
        }
      }
      
      return result;
    } catch (error) {
      console.error('解析AI响应失败:', error);
      throw error;
    }
  },

  // 生成饮食建议
  async generateDietPlan() {
    this.addThinkingMessage('正在制定营养饮食建议...');
    
    try {
      // 构建提示词
      const userInfo = this.data.userData;
      const analysis = this.data.generationProgress.lastAnalysis;
      const trainingPlan = this.data.generationProgress.lastTrainingPlan;
      const prompt = generateDietPlanPrompt(userInfo, analysis, trainingPlan);
      
      // 添加提示词到消息列表
      this.addMessage('user', prompt);
      
      // 调用AI获取饮食计划
      const dietPlanResponse = await this.callAI(prompt);
      
      if (!dietPlanResponse) {
        throw new Error('生成饮食建议失败');
      }
      
      // 尝试解析JSON格式的饮食计划
      let dietPlan;
      try {
        const jsonMatch = dietPlanResponse.match(/```json\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : dietPlanResponse;
        dietPlan = JSON.parse(jsonStr);
        console.log('解析后的饮食计划:', dietPlan);
      } catch (error) {
        console.error('解析饮食计划JSON失败:', error);
        this.addMessage('ai', dietPlanResponse);
        throw new Error('解析饮食计划格式失败，请重试');
      }
      
      // 添加饮食计划到消息列表
      this.addMessage('ai', dietPlanResponse);
      
      // 合并训练计划和饮食计划
      const combinedPlan = this.combineTrainingAndDietPlans(
        this.data.generationProgress.lastTrainingPlan,
        dietPlan,
        this.data.generationProgress.lastAnalysis
      );
      
      if (!combinedPlan || !combinedPlan.weeklyPlan || !combinedPlan.weeklyPlan.days) {
        throw new Error('计划合并失败，数据格式不完整');
      }
      
      // 更新生成进度和数据
      this.setData({
        'generationProgress.dietPlan': true,
        'generatedData': combinedPlan
      });
      
      return dietPlan;
    } catch (error) {
      console.error('生成饮食计划失败:', error);
      this.addMessage('ai', `抱歉，生成饮食计划失败: ${error.message || '未知错误'}`, 'dietPlan', true);
      throw error;
    }
  },

  // 显示模型选择器
  showModelPicker() {
    this.setData({ showModelPicker: true });
  },

  // 关闭模型选择器
  closeModelPicker() {
    this.setData({ showModelPicker: false });
  },

  // 确认选择模型
  onModelSelect(event) {
    const { index } = event.currentTarget.dataset;
    const modelKey = this.data.modelOptions[index].value;
    const modelConfig = getModelConfig(modelKey);
    
    // 保存选择的模型
    saveSelectedModel(modelKey);
    
    this.setData({ 
      modelIndex: index,
      selectedModel: modelKey,
      showModelPicker: false
    });
    
    wx.showToast({
      title: `已选择${modelConfig.name}`,
      icon: 'none',
      duration: 1500
    });
  },

  // 调用AI接口
  async callAI(prompt) {
    try {
      const { selectedModel } = this.data;
      const modelConfig = getModelConfig(selectedModel);
      
      let response;
      // 根据选择的模型调用不同的API
      switch (selectedModel) {
        case 'deepseek':
          response = await deepseek({
            messages: [{
              role: 'user',
              content: prompt
            }],
            ...modelConfig.config
          });
          break;
        case 'gemini':
          response = await gemini({
            messages: [{
              role: 'user',
              content: prompt
            }],
            ...modelConfig.config
          });
          break;
        case 'volcengine':
          response = await volcengine({
            messages: [{
              role: 'user',
              content: prompt
            }],
            ...modelConfig.config
          });
          break;
        default:
          throw new Error('未知的AI模型');
      }
      
      if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('AI响应格式无效');
      }
      
      const responseText = response.choices[0].message.content;
      
      // 保存生成记录
      dataService.saveAIGenerationRecord({
        model: selectedModel,
        prompt: prompt,
        response: responseText,
        type: this.data.currentGenerationType || 'training'
      });
      
      return responseText;
    } catch (error) {
      console.error('AI调用失败:', error);
      
      // 更友好的错误提示
      let errorMessage = '很抱歉，生成失败了';
      
      if (error.message && error.message.includes('网络')) {
        errorMessage = '网络连接异常，请检查您的网络设置后重试';
      } else if (error.message && error.message.includes('超时')) {
        errorMessage = '服务响应超时，请稍后再试';
      } else if (error.message && error.message.includes('API')) {
        errorMessage = 'API密钥无效或已过期，请联系客服处理';
      } else if (error.message && error.message.includes('模型')) {
        errorMessage = '所选AI模型暂时不可用，请尝试其他模型';
      } else {
        errorMessage = '生成失败，请稍后重试 (错误: ' + (error.message || '未知错误') + ')';
      }
      
      // 显示友好的错误提示
      wx.showModal({
        title: '生成计划失败',
        content: errorMessage,
        showCancel: false,
        confirmText: '我知道了'
      });
      
      this.setData({
        showRetryButton: true
      });
      
      throw new Error(errorMessage);
    }
  },

  // 添加消息到对话列表
  addMessage(type, content, step = null, error = false) {
    const messages = [...this.data.messages];
    const messageId = `msg_${Date.now()}`;
    
    // 如果是AI消息，使用DeepSeek风格的Towxml转换markdown
    if (type === 'ai') {
      const towxml = markdownUtils.toDeepSeekStyle(content, {
        theme: wx.getSystemInfoSync().theme === 'dark' ? 'dark' : 'light'
      });
      
      messages.push({
        id: messageId,
        type,
        content,
        towxml,
        step,
        error,
        retryable: error && step // 只有出错的步骤才可以重试
      });
    } else {
      messages.push({
        id: messageId,
        type,
        content
      });
    }

    // 移除思考中的消息
    const filteredMessages = messages.filter(msg => !msg.isThinking);
    
    // 更新步骤状态
    if (step) {
      this.setData({
        [`stepStatus.${step}.retryable`]: error
      });
    }
    
    this.setData({
      messages: filteredMessages,
      scrollToMessage: messageId
    });
    
    // 如果是成功的AI消息，保存到历史记录
    if (type === 'ai' && !error && !this.data.isFromHistory) {
      this.saveToHistory(content);
    }
  },

  // 保存到历史记录
  saveToHistory(response) {
    try {
      const record = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        model: this.data.selectedModel,
        prompt: this.data.messages.find(m => m.type === 'user')?.content || '',
        response,
        userInfo: this.data.userInfo,
        feedback: null
      };
      
      dataService.saveAIGenerationRecord(record);
    } catch (error) {
      console.error('保存历史记录失败:', error);
    }
  },

  // 查看历史记录
  viewHistory() {
    wx.navigateTo({
      url: './ai-history'
    });
  },

  // 调整计划
  adjustPlan() {
    // 如果是从历史记录查看，不允许调整
    if (this.data.isFromHistory) {
      wx.showToast({
        title: '历史记录不可调整',
        icon: 'none'
      });
      return;
    }

    this.setData({
      messages: [],
      showPlanActions: false,
      hasGeneratedPlan: false,
      showRetryButton: false,
      currentPlan: null,
      isGenerating: false
    });
    
    // 延迟一点时间后再开始生成，确保状态被正确重置
    setTimeout(() => {
      this.startGeneration();
    }, 100);
  },

  // 保存计划
  async savePlan() {
    if (this.data.saving) return;
    
    // 检查数据完整性
    if (!this.data.generatedData || !this.data.generatedData.weeklyPlan || !this.data.generatedData.weeklyPlan.days) {
      wx.showToast({
        title: '计划数据不完整',
        icon: 'none'
      });
      return;
    }

    this.setData({ saving: true });

    try {
      // 确保数据是JSON对象格式
      const planData = typeof this.data.generatedData === 'string' 
        ? JSON.parse(this.data.generatedData)
        : this.data.generatedData;
      
      // 保存周计划
      if (planData.weeklyPlan) {
        await dataService.saveWeeklyPlan(planData.weeklyPlan);
      }
      
      // 保存饮食计划
      if (planData.dailyNutrition) {
        const dietPlan = {
          dailyNutrition: planData.dailyNutrition,
          notes: planData.notes || '',
          createdAt: new Date().toISOString()
        };
        await dataService.saveDietPlan(dietPlan);
      }
      
      // 保存AI生成记录
      const generationRecord = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        model: this.data.selectedModel,
        prompt: JSON.stringify(this.data.userData),
        response: JSON.stringify(planData),
        type: 'combined',
        userInfo: this.data.userInfo
      };
      await dataService.saveAIGenerationRecord(generationRecord);
      
      wx.showToast({
        title: '计划保存成功',
        icon: 'success'
      });
      
      // 延迟返回，让用户看到成功提示
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    } catch (error) {
      console.error('保存计划失败:', error);
      wx.showToast({
        title: error.message || '保存失败，请重试',
        icon: 'none',
        duration: 2000
      });
    } finally {
      this.setData({ saving: false });
    }
  },

  // 显示反馈弹窗
  showFeedback() {
    this.setData({ showFeedback: true });
  },

  // 关闭反馈弹窗
  closeFeedback() {
    this.setData({ 
      showFeedback: false,
      feedback: {
        rating: 0,
        difficulty: 0,
        suggestion: ''
      }
    });
  },

  // 评分变化
  onRatingChange(event) {
    this.setData({
      'feedback.rating': event.detail
    });
  },

  // 难度变化
  onDifficultyChange(event) {
    this.setData({
      'feedback.difficulty': event.detail
    });
  },

  // 建议输入
  onSuggestionInput(event) {
    this.setData({
      'feedback.suggestion': event.detail.value
    });
  },

  // 提交反馈
  async submitFeedback() {
    const { feedback, currentPlan } = this.data;
    
    if (!feedback.rating) {
      app.utils.showToast('请选择评分');
      return;
    }
    
    try {
      this.setData({ saving: true });
      
      // 获取最新的AI生成记录
      const aiRecords = dataService.getAIGenerationRecords(1);
      if (aiRecords && aiRecords.length > 0) {
        const latestRecord = aiRecords[0];
        // 更新反馈信息
        latestRecord.feedback = { ...feedback };
        // 保存更新后的记录
        dataService.saveAIGenerationRecord(latestRecord);
      }
      
      // 如果有计划数据，保存计划
      if (currentPlan) {
        // 添加反馈信息到计划中
        currentPlan.feedback = feedback;
        
        // 保存计划
        await dataService.saveTrainingPlan(currentPlan);
        
        // 如果评分较高，自动设置为活动计划
        if (feedback.rating >= 4) {
          await dataService.saveActiveTrainingPlan(currentPlan);
          
          // 更新周计划
          if (currentPlan.weeklySchedule) {
            await this.updateWeeklyPlan(currentPlan);
          }
        }
      }
      
      this.setData({ 
        saving: false,
        showFeedback: false
      });
      
      app.utils.showToast('感谢您的反馈！', 'success');
    } catch (error) {
      console.error('提交反馈失败:', error);
      this.setData({ saving: false });
      app.utils.showToast('提交反馈失败');
    }
  },

  // 重试生成
  retryGeneration() {
    // 不清除之前成功的步骤，直接继续生成
    this.setData({
      showRetryButton: false,
      hasGeneratedPlan: false
    });
    this.startGeneration();
  },

  // 复制消息内容
  copyMessage(e) {
    const { index } = e.currentTarget.dataset;
    const content = this.data.messages[index].content;
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 1500
        });
      }
    });
  },

  // 添加测试消息（仅用于开发模式）
  addMockMessages() {
    const mockAnalysis = `## 需求分析\n根据您的信息，我为您进行以下分析：\n\n1. **基本情况**\n   - 性别：男\n   - 年龄：25岁\n   - 身高：175cm\n   - 体重：70kg\n   - BMI：22.9（正常范围）\n\n2. **训练目标**\n   您的主要目标是增肌，这需要合理的训练计划和营养支持。\n\n3. **训练水平**\n   您属于初级训练者，需要从基础动作开始循序渐进。`;

    const mockPlan = `## 训练计划\n\n### 周计划安排\n- 每周训练4-5天\n- 采用上下肢分化训练\n- 保证充足休息\n\n### 具体安排\n1. **周一：胸部和肱三头肌**\n   - 卧推：4组×8-12次\n   - 上斜卧推：3组×10次\n   - 飞鸟：3组×12次\n   - 绳索下压：3组×12次\n\n2. **周二：背部和肱二头肌**\n   - 引体向上：4组×最大次数\n   - 杠铃划船：4组×10次\n   - 单臂哑铃划船：3组×12次\n   - 哑铃弯举：3组×12次`;

    const mockDiet = `## 营养建议\n\n### 每日摄入\n1. **蛋白质**\n   - 每公斤体重2g\n   - 优质来源：鸡胸肉、鱼、蛋、牛奶\n\n2. **碳水化合物**\n   - 每公斤体重4-5g\n   - 来源：糙米、燕麦、红薯\n\n3. **健康脂肪**\n   - 每公斤体重1g\n   - 来源：坚果、橄榄油、鱼油\n\n### 补剂建议\n- 乳清蛋白\n- 肌酸\n- 多种维生素`;

    const messages = [
      {
        id: 'mock_1',
        type: 'ai',
        content: mockAnalysis,
        towxml: markdownUtils.toTowxml(mockAnalysis)
      },
      {
        id: 'mock_2',
        type: 'ai',
        content: mockPlan,
        towxml: markdownUtils.toTowxml(mockPlan)
      },
      {
        id: 'mock_3',
        type: 'ai',
        content: mockDiet,
        towxml: markdownUtils.toTowxml(mockDiet)
      }
    ];

    this.setData({
      messages,
      showPlanActions: true,
      hasGeneratedPlan: true,
      currentPlan: {
        analysis: mockAnalysis,
        plan: mockPlan,
        diet: mockDiet
      }
    });
  },

  // 预览计划
  showPreview() {
    // 检查数据完整性
    if (!this.data.generatedData || !this.data.generatedData.weeklyPlan || !this.data.generatedData.weeklyPlan.days) {
      wx.showToast({
        title: '计划数据不完整',
        icon: 'none'
      });
      return;
    }
    
    try {
      // 确保数据是JSON对象格式
      const previewData = typeof this.data.generatedData === 'string' 
        ? JSON.parse(this.data.generatedData)
        : this.data.generatedData;
      
      // 将数据保存到临时存储
      wx.setStorageSync('temp_preview_plan', previewData);
      
      // 跳转到预览页面
      wx.navigateTo({
        url: '/pages/myplan/index?mode=preview'
      });
    } catch (error) {
      console.error('预览数据处理失败:', error);
      wx.showToast({
        title: '数据格式错误',
        icon: 'none'
      });
    }
  },

  // 关闭预览
  closePreview() {
    this.setData({
      showPreview: false
    });
  },

  // 添加思考中的消息
  addThinkingMessage(content) {
    const messages = [...this.data.messages];
    // 移除之前的思考消息
    const filteredMessages = messages.filter(msg => !msg.isThinking);
    
    // 添加新的思考消息
    filteredMessages.push({
      id: `thinking_${Date.now()}`,
      type: 'thinking',
      content: content || '思考中...',
      isThinking: true
    });
    
    this.setData({
      messages: filteredMessages
    });
  },

  // 重试特定步骤
  async retryStep(e) {
    const { step, index } = e.currentTarget.dataset;
    if (this.data.isGenerating) return;

    // 获取要重试的消息
    const message = this.data.messages[index];
    if (!message) return;

    this.setData({ isGenerating: true });

    try {
      let response;
      // 根据消息内容判断重试类型
      if (message.content.includes('需求分析') || step === 'analysis') {
        this.addThinkingMessage('重新分析您的训练需求...');
        response = await this.analyzeUserNeeds();
        if (!response || response.includes('生成失败') || response.includes('抱歉')) {
          throw new Error('分析用户需求失败');
        }
        // 替换原消息
        this.replaceMessage(index, 'ai', response, 'analysis');
        this.setData({
          'generationProgress.analysis': true,
          'generationProgress.lastAnalysis': response
        });
      } else if (message.content.includes('训练计划') || step === 'trainingPlan') {
        this.addThinkingMessage('重新生成训练计划...');
        response = await this.generateTrainingPlan();
        if (!response) {
          throw new Error('生成训练计划失败');
        }
        let trainingPlan = this.parseAIResponse(response, 'training');
        // 替换原消息
        this.replaceMessage(index, 'ai', response, 'trainingPlan');
        this.setData({
          'generationProgress.trainingPlan': true,
          'generationProgress.lastTrainingPlan': trainingPlan
        });
      } else if (message.content.includes('饮食建议') || step === 'dietPlan') {
        this.addThinkingMessage('重新生成饮食建议...');
        response = await this.generateDietPlan();
        if (!response) {
          throw new Error('生成饮食建议失败');
        }
        let dietPlan = this.parseAIResponse(response, 'diet');
        // 替换原消息
        this.replaceMessage(index, 'ai', response, 'dietPlan');
        
        // 重新合并计划
        const combinedPlan = this.combineTrainingAndDietPlans(
          this.data.generationProgress.lastTrainingPlan,
          dietPlan,
          this.data.generationProgress.lastAnalysis
        );
        
        if (!combinedPlan || !combinedPlan.weeklyPlan || !combinedPlan.weeklyPlan.days) {
          throw new Error('计划合并失败，数据格式不完整');
        }
        
        this.setData({
          'generationProgress.dietPlan': true,
          generatedData: combinedPlan,
          showPlanActions: true,
          hasGeneratedPlan: true,
          currentPlan: {
            analysis: this.data.generationProgress.lastAnalysis,
            plan: this.data.generationProgress.lastTrainingPlan,
            diet: dietPlan
          }
        });
      }

    } catch (error) {
      console.error('重新生成失败:', error);
      wx.showToast({
        title: error.message || '重新生成失败',
        icon: 'none'
      });
    } finally {
      this.setData({ isGenerating: false });
    }
  },

  // 替换消息
  replaceMessage(index, type, content, step = null) {
    const messages = [...this.data.messages];
    const messageId = `msg_${Date.now()}`;
    
    if (type === 'ai') {
      const towxml = markdownUtils.toDeepSeekStyle(content, {
        theme: wx.getSystemInfoSync().theme === 'dark' ? 'dark' : 'light'
      });
      
      messages[index] = {
        id: messageId,
        type,
        content,
        towxml,
        step
      };
    } else {
      messages[index] = {
        id: messageId,
        type,
        content
      };
    }
    
    this.setData({
      messages,
      scrollToMessage: messageId
    });
    
    // 如果是成功的AI消息，保存到历史记录
    if (type === 'ai' && !this.data.isFromHistory) {
      this.saveToHistory(content);
    }
  },

  // 取消生成
  async cancelGeneration() {
    if (!this.data.isGenerating) return;
    
    try {
      // 显示确认弹窗
      const res = await wx.showModal({
        title: '确认取消',
        content: '确定要取消当前的生成过程吗？',
        confirmText: '确定取消',
        cancelText: '继续生成'
      });
      
      if (res.confirm) {
        // 如果正在等待用户确认，关闭确认框
        if (this.data.waitingConfirmation) {
          wx.hideLoading();
        }
        
        this.setData({
          isGenerating: false,
          waitingConfirmation: false,
          showRetryButton: false,
          showContinueButton: true // 显示继续生成按钮
        });
        
        wx.showToast({
          title: '已暂停生成',
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('取消生成失败:', error);
    }
  },

  // 继续已暂停的生成
  async continuePaused() {
    if (this.data.isGenerating) return;
    
    try {
      // 设置生成状态
      this.setData({
        isGenerating: true,
        showContinueButton: false,
        showRetryButton: false
      });
      
      // 根据当前生成进度确定从哪一步继续
      let nextStep = 'analysis';
      
      if (this.data.generationProgress.analysis) {
        nextStep = 'trainingPlan';
        
        if (this.data.generationProgress.trainingPlan) {
          nextStep = 'dietPlan';
        }
      }
      
      // 从暂停的下一步继续生成
      await this.confirmAndExecuteStep(nextStep);
      
      // 如果用户再次取消了生成过程，直接返回
      if (!this.data.isGenerating) return;
      
      // 如果trainingPlan已完成，继续生成dietPlan
      if (nextStep === 'trainingPlan' && this.data.generationProgress.trainingPlan) {
        await this.confirmAndExecuteStep('dietPlan');
      }
      
      // 如果所有步骤都完成，显示最终结果
      if (this.data.generationProgress.analysis && 
          this.data.generationProgress.trainingPlan && 
          this.data.generationProgress.dietPlan) {
        
        // 组合计划
        const fullPlan = this.combineTrainingAndDietPlans(
          this.data.generationProgress.lastTrainingPlan,
          this.data.generatedData.diet,
          this.data.generationProgress.lastAnalysis
        );
        
        // 保存生成的计划
        this.setData({
          currentPlan: {
            analysis: this.data.generationProgress.lastAnalysis,
            plan: this.data.generationProgress.lastTrainingPlan,
            diet: this.data.generatedData.diet,
            full: fullPlan
          },
          isGenerating: false,
          showPlanActions: true,
          hasGeneratedPlan: true
        });
      }
    } catch (error) {
      console.error('继续生成失败:', error);
      this.setData({
        isGenerating: false,
        showRetryButton: true,
        showContinueButton: false
      });
      
      wx.showToast({
        title: '继续生成失败',
        icon: 'none'
      });
    }
  },
});