/**
 * 数据分块处理工具
 * 用于处理大型JSON响应数据的分块和重组
 */

class ChunkProcessor {
  constructor() {
    this.chunks = new Map();
    this.chunkSize = 1024 * 16; // 16KB 每块大小
  }

  /**
   * 检查JSON数据是否完整
   * @param {string} jsonStr - JSON字符串
   * @returns {boolean} 是否完整
   */
  isValidJSON(jsonStr) {
    try {
      JSON.parse(jsonStr);
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
      
      // 验证并返回完整的JSON数据
      if (this.isValidJSON(fullData)) {
        return JSON.parse(fullData);
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