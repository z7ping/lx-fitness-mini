/**
 * 数据分块处理工具
 * 用于处理大型JSON响应数据的分块和重组
 */

class ChunkProcessor {
  constructor() {
    this.chunks = new Map();
    this.chunkSize = 1024 * 16; // 16KB 每块大小
    this.retryCount = 3; // 添加重试次数
  }

  /**
   * 检查JSON数据是否完整
   * @param {string} jsonStr - JSON字符串
   * @returns {boolean} 是否完整
   */
  isValidJSON(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') return false;
    
    // 尝试修复常见的JSON格式问题
    let processedStr = jsonStr;
    
    // 1. 处理markdown代码块
    const jsonMatch = processedStr.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      processedStr = jsonMatch[1];
    }
    
    // 2. 尝试找到最外层的花括号对
    const firstBrace = processedStr.indexOf('{');
    const lastBrace = processedStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
      processedStr = processedStr.substring(firstBrace, lastBrace + 1);
    }
    
    // 3. 尝试修复常见的JSON格式错误
    processedStr = processedStr
      .replace(/,\s*}/g, '}') // 移除对象末尾多余的逗号
      .replace(/,\s*]/g, ']') // 移除数组末尾多余的逗号
      .replace(/\n/g, '') // 移除换行符
      .replace(/\r/g, '') // 移除回车符
      .replace(/\t/g, '') // 移除制表符
      .trim();
    
    try {
      JSON.parse(processedStr);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * 将大型JSON响应分割成块
   * @param {string} jsonStr - 完整的JSON字符串
   * @returns {Array} 数据块数组
   */
  splitIntoChunks(jsonStr) {
    if (!jsonStr || typeof jsonStr !== 'string') return [];
    const chunks = [];
    let index = 0;
    
    while (index < jsonStr.length) {
      chunks.push(jsonStr.slice(index, index + this.chunkSize));
      index += this.chunkSize;
    }
    
    return chunks.map((chunk, i) => ({
      index: i,
      total: chunks.length,
      data: chunk
    }));
  }

  /**
   * 处理接收到的数据块
   * @param {string} requestId - 请求ID
   * @param {Object} chunk - 数据块
   * @returns {Object|null} 如果所有块都收到则返回完整数据，否则返回null
   */
  processChunk(requestId, chunk) {
    if (!chunk || typeof chunk !== 'object') return null;
    
    if (!this.chunks.has(requestId)) {
      this.chunks.set(requestId, new Map());
    }
    
    const requestChunks = this.chunks.get(requestId);
    requestChunks.set(chunk.index, chunk.data);
    
    // 检查是否收到所有块
    if (requestChunks.size === chunk.total) {
      // 按顺序合并所有块
      const fullData = Array.from(requestChunks.entries())
        .sort(([a], [b]) => a - b)
        .map(([_, data]) => data)
        .join('');
      
      // 清理存储的块
      this.chunks.delete(requestId);
      
      // 尝试修复和解析JSON数据
      let retryCount = this.retryCount;
      while (retryCount > 0) {
        try {
          // 1. 尝试直接解析
          if (this.isValidJSON(fullData)) {
            const jsonMatch = fullData.match(/```json\s*([\s\S]*?)\s*```/);
            const jsonStr = jsonMatch ? jsonMatch[1] : fullData;
            return JSON.parse(jsonStr);
          }
          
          // 2. 尝试提取和修复JSON
          const firstBrace = fullData.indexOf('{');
          const lastBrace = fullData.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            const jsonContent = fullData.substring(firstBrace, lastBrace + 1)
              .replace(/,\s*}/g, '}')
              .replace(/,\s*]/g, ']')
              .replace(/\n/g, '')
              .replace(/\r/g, '')
              .replace(/\t/g, '')
              .trim();
            
            return JSON.parse(jsonContent);
          }
        } catch (error) {
          console.error(`JSON解析失败，剩余重试次数: ${retryCount - 1}`, error);
          retryCount--;
        }
      }
    }
    
    return null;
  }

  /**
   * 清理超时的请求数据
   * @param {string} requestId - 请求ID
   */
  cleanupRequest(requestId) {
    this.chunks.delete(requestId);
  }
}

module.exports = new ChunkProcessor();