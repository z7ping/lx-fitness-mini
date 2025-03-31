const app = getApp();

/**
 * Markdown转换工具类
 */
const markdownUtils = {
  /**
   * 将Markdown文本转换为towxml节点
   * @param {string} content - markdown内容
   * @param {object} options - 可选配置项
   * @returns {object} towxml节点
   */
  toTowxml(content, options = {}) {
    const defaultOptions = {
      base: 'https://xxx.com',
      theme: 'light',
      events: {
        tap: (e) => {
          console.log('tap', e);
        }
      }
    };

    // 合并配置项
    const mergedOptions = { ...defaultOptions, ...options };

    return app.towxml(content, 'markdown', mergedOptions);
  },
  
  /**
   * 将Markdown文本转换为DeepSeek风格的towxml节点
   * @param {string} content - markdown内容
   * @param {object} options - 可选配置项
   * @returns {object} towxml节点
   */
  toDeepSeekStyle(content, options = {}) {
    const defaultOptions = {
      base: 'https://xxx.com',
      theme: 'light',
      events: {
        tap: (e) => {
          console.log('tap', e);
        }
      },
      // 添加DeepSeek风格的类名
      class: 'deepseek-markdown'
    };

    // 合并配置项
    const mergedOptions = { ...defaultOptions, ...options };
    
    // 如果是暗色主题，添加dark类名
    if (mergedOptions.theme === 'dark') {
      mergedOptions.class = 'deepseek-markdown dark';
    }

    return app.towxml(content, 'markdown', mergedOptions);
  }
};

module.exports = markdownUtils; 