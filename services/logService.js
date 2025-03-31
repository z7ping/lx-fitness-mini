/**
 * 日志服务
 * 用于记录应用日志并提供查看功能
 */

// 最大日志条数
const MAX_LOG_ENTRIES = 1000;

class LogService {
  constructor() {
    // 初始化日志数组
    this.logs = wx.getStorageSync('app_logs') || [];
    
    // 覆盖原生console方法
    this.overrideConsoleMethods();
  }
  
  /**
   * 覆盖原生console方法，将日志同时记录到本地
   */
  overrideConsoleMethods() {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };
    
    // 覆盖console.log
    console.log = (...args) => {
      this.addLog('log', args);
      originalConsole.log.apply(console, args);
    };
    
    // 覆盖console.info
    console.info = (...args) => {
      this.addLog('info', args);
      originalConsole.info.apply(console, args);
    };
    
    // 覆盖console.warn
    console.warn = (...args) => {
      this.addLog('warn', args);
      originalConsole.warn.apply(console, args);
    };
    
    // 覆盖console.error
    console.error = (...args) => {
      this.addLog('error', args);
      originalConsole.error.apply(console, args);
    };
    
    // 覆盖console.debug
    console.debug = (...args) => {
      this.addLog('debug', args);
      originalConsole.debug.apply(console, args);
    };
  }
  
  /**
   * 添加日志
   * @param {string} level 日志级别
   * @param {Array} args 日志参数
   */
  addLog(level, args) {
    try {
      // 格式化日志参数
      const formattedArgs = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      });
      
      // 创建日志条目
      const logEntry = {
        timestamp: new Date().toISOString(),
        level,
        message: formattedArgs.join(' '),
        page: this.getCurrentPage()
      };
      
      // 添加到日志数组
      this.logs.unshift(logEntry);
      
      // 限制日志数量
      if (this.logs.length > MAX_LOG_ENTRIES) {
        this.logs = this.logs.slice(0, MAX_LOG_ENTRIES);
      }
      
      // 每10条日志保存一次
      if (this.logs.length % 10 === 0) {
        this.saveLogs();
      }
    } catch (error) {
      // 避免无限递归
      wx.showToast({
        title: '日志记录失败',
        icon: 'none'
      });
    }
  }
  
  /**
   * 获取当前页面路径
   * @returns {string} 当前页面路径
   */
  getCurrentPage() {
    const pages = getCurrentPages();
    if (pages.length > 0) {
      return pages[pages.length - 1].route;
    }
    return 'unknown';
  }
  
  /**
   * 保存日志到本地存储
   */
  saveLogs() {
    try {
      wx.setStorageSync('app_logs', this.logs);
    } catch (error) {
      wx.showToast({
        title: '保存日志失败',
        icon: 'none'
      });
    }
  }
  
  /**
   * 获取所有日志
   * @returns {Array} 日志数组
   */
  getLogs() {
    return this.logs;
  }
  
  /**
   * 按级别获取日志
   * @param {string} level 日志级别
   * @returns {Array} 过滤后的日志数组
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }
  
  /**
   * 按页面获取日志
   * @param {string} page 页面路径
   * @returns {Array} 过滤后的日志数组
   */
  getLogsByPage(page) {
    return this.logs.filter(log => log.page === page);
  }
  
  /**
   * 按关键词搜索日志
   * @param {string} keyword 关键词
   * @returns {Array} 搜索结果
   */
  searchLogs(keyword) {
    if (!keyword) return this.logs;
    
    return this.logs.filter(log => 
      log.message.toLowerCase().includes(keyword.toLowerCase())
    );
  }
  
  /**
   * 清除所有日志
   */
  clearLogs() {
    this.logs = [];
    wx.removeStorageSync('app_logs');
  }
  
  /**
   * 导出日志到文件
   * @returns {Promise} 导出结果
   */
  exportLogs() {
    return new Promise((resolve, reject) => {
      try {
        const logText = this.logs.map(log => 
          `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.page}] ${log.message}`
        ).join('\n');
        
        const fs = wx.getFileSystemManager();
        const filePath = `${wx.env.USER_DATA_PATH}/app_logs_${Date.now()}.txt`;
        
        fs.writeFile({
          filePath,
          data: logText,
          encoding: 'utf8',
          success: () => {
            resolve(filePath);
          },
          fail: (error) => {
            reject(error);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

// 创建单例
const logService = new LogService();

module.exports = {
  logService
}; 