/**
 * 统一的数据字典
 * 用于管理所有的数据映射关系
 */

// 星期映射
const WEEKDAY_MAPPING = ['一', '二', '三', '四', '五', '六', '日'];

// 时间段映射
const TIME_SLOTS = ['早晨', '上午', '下午', '晚上'];

// 目标映射
const GOAL_MAPPING = {
  // 存储键（英文）
  STORAGE_KEYS: {
    FAT_LOSS: 'fat_loss',
    MUSCLE_GAIN: 'muscle_gain',
    BODY_RECOMP: 'body_recomposition',
    ENDURANCE: 'endurance',
    GENERAL_FITNESS: 'general_fitness'
  },
  
  // 显示文本（中文）
  DISPLAY_TEXT: {
    fat_loss: '减脂',
    muscle_gain: '增肌',
    body_recomposition: '塑形',
    endurance: '提高体能',
    general_fitness: '保持健康'
  },
  
  // 提示词映射
  PROMPT_TEXT: {
    fat_loss: '减脂',
    muscle_gain: '增肌',
    body_recomposition: '塑形',
    endurance: '提高体能',
    general_fitness: '保持体型'
  }
};

// 训练频率映射
const FREQUENCY_MAPPING = {
  // 存储键（英文）
  STORAGE_KEYS: {
    THREE_TIMES: 'three_times_week',
    FOUR_TIMES: 'four_times_week',
    FIVE_TIMES: 'five_times_week',
    SIX_TIMES: 'six_times_week',
    EVERYDAY: 'everyday'
  },
  
  // 显示文本（中文）
  DISPLAY_TEXT: {
    three_times_week: '每周3次',
    four_times_week: '每周4次',
    five_times_week: '每周5次',
    six_times_week: '每周6次',
    everyday: '每天'
  }
};

// 训练时长映射
const DURATION_MAPPING = {
  // 存储键（英文）
  STORAGE_KEYS: {
    THIRTY_MIN: 'thirty_min',
    FORTY_FIVE_MIN: 'forty_five_min',
    SIXTY_MIN: 'sixty_min',
    NINETY_MIN: 'ninety_min',
    ONE_TWENTY_MIN: 'one_twenty_min'
  },
  
  // 显示文本（中文）
  DISPLAY_TEXT: {
    thirty_min: '30分钟',
    forty_five_min: '45分钟',
    sixty_min: '60分钟',
    ninety_min: '90分钟',
    one_twenty_min: '120分钟'
  }
};

// 训练水平映射
const LEVEL_MAPPING = {
  // 存储键（英文）
  STORAGE_KEYS: {
    BEGINNER: 'beginner',
    INTERMEDIATE: 'intermediate',
    ADVANCED: 'advanced'
  },
  
  // 显示文本（中文）
  DISPLAY_TEXT: {
    beginner: '初级',
    intermediate: '中级',
    advanced: '高级'
  },
  
  // 提示词映射
  PROMPT_TEXT: {
    beginner: '初级',
    intermediate: '中级',
    advanced: '高级'
  }
};

/**
 * 转换工具类
 */
class DictionaryConverter {
  /**
   * 转换目标
   * @param {string} value - 要转换的值
   * @param {string} from - 源格式 ('storage'|'display'|'prompt')
   * @param {string} to - 目标格式 ('storage'|'display'|'prompt')
   * @returns {string} 转换后的值
   */
  static convertGoal(value, from, to) {
    let sourceMap, targetMap;
    
    // 确定源映射
    switch (from) {
      case 'storage':
        sourceMap = GOAL_MAPPING.STORAGE_KEYS;
        break;
      case 'display':
        sourceMap = GOAL_MAPPING.DISPLAY_TEXT;
        break;
      case 'prompt':
        sourceMap = GOAL_MAPPING.PROMPT_TEXT;
        break;
      default:
        throw new Error('不支持的源格式');
    }
    
    // 确定目标映射
    switch (to) {
      case 'storage':
        targetMap = GOAL_MAPPING.STORAGE_KEYS;
        break;
      case 'display':
        targetMap = GOAL_MAPPING.DISPLAY_TEXT;
        break;
      case 'prompt':
        targetMap = GOAL_MAPPING.PROMPT_TEXT;
        break;
      default:
        throw new Error('不支持的目标格式');
    }
    
    // 查找源值对应的键
    const key = Object.entries(sourceMap).find(([_, v]) => v === value)?.[0];
    if (!key) return value; // 如果找不到对应的键，返回原值
    
    // 使用找到的键在目标映射中查找对应的值
    return targetMap[key.toLowerCase()] || value;
  }
  
  /**
   * 转换训练水平
   * @param {string} value - 要转换的值
   * @param {string} from - 源格式 ('storage'|'display'|'prompt')
   * @param {string} to - 目标格式 ('storage'|'display'|'prompt')
   * @returns {string} 转换后的值
   */
  static convertLevel(value, from, to) {
    let sourceMap, targetMap;
    
    // 确定源映射
    switch (from) {
      case 'storage':
        sourceMap = LEVEL_MAPPING.STORAGE_KEYS;
        break;
      case 'display':
        sourceMap = LEVEL_MAPPING.DISPLAY_TEXT;
        break;
      case 'prompt':
        sourceMap = LEVEL_MAPPING.PROMPT_TEXT;
        break;
      default:
        throw new Error('不支持的源格式');
    }
    
    // 确定目标映射
    switch (to) {
      case 'storage':
        targetMap = LEVEL_MAPPING.STORAGE_KEYS;
        break;
      case 'display':
        targetMap = LEVEL_MAPPING.DISPLAY_TEXT;
        break;
      case 'prompt':
        targetMap = LEVEL_MAPPING.PROMPT_TEXT;
        break;
      default:
        throw new Error('不支持的目标格式');
    }
    
    // 查找源值对应的键
    const key = Object.entries(sourceMap).find(([_, v]) => v === value)?.[0];
    if (!key) return value; // 如果找不到对应的键，返回原值
    
    // 使用找到的键在目标映射中查找对应的值
    return targetMap[key.toLowerCase()] || value;
  }


  /**
   * 转换训练频率
   * @param {string} value - 要转换的值
   * @param {string} from - 源格式 ('storage'|'display')
   * @param {string} to - 目标格式 ('storage'|'display')
   * @returns {string} 转换后的值
   */
  static convertFrequency(value, from, to) {
    let sourceMap, targetMap;
    
    // 确定源映射
    switch (from) {
      case 'storage':
        sourceMap = FREQUENCY_MAPPING.STORAGE_KEYS;
        break;
      case 'display':
        sourceMap = FREQUENCY_MAPPING.DISPLAY_TEXT;
        break;
      default:
        throw new Error('不支持的源格式');
    }
    
    // 确定目标映射
    switch (to) {
      case 'storage':
        targetMap = FREQUENCY_MAPPING.STORAGE_KEYS;
        break;
      case 'display':
        targetMap = FREQUENCY_MAPPING.DISPLAY_TEXT;
        break;
      default:
        throw new Error('不支持的目标格式');
    }
    
    // 查找源值对应的键
    const key = Object.entries(sourceMap).find(([_, v]) => v === value)?.[0];
    if (!key) return value; // 如果找不到对应的键，返回原值
    
    // 使用找到的键在目标映射中查找对应的值
    return targetMap[key.toLowerCase()] || value;
  }

  /**
   * 转换训练时长
   * @param {string} value - 要转换的值
   * @param {string} from - 源格式 ('storage'|'display')
   * @param {string} to - 目标格式 ('storage'|'display')
   * @returns {string} 转换后的值
   */
  static convertDuration(value, from, to) {
    let sourceMap, targetMap;
    
    // 确定源映射
    switch (from) {
      case 'storage':
        sourceMap = DURATION_MAPPING.STORAGE_KEYS;
        break;
      case 'display':
        sourceMap = DURATION_MAPPING.DISPLAY_TEXT;
        break;
      default:
        throw new Error('不支持的源格式');
    }
    
    // 确定目标映射
    switch (to) {
      case 'storage':
        targetMap = DURATION_MAPPING.STORAGE_KEYS;
        break;
      case 'display':
        targetMap = DURATION_MAPPING.DISPLAY_TEXT;
        break;
      default:
        throw new Error('不支持的目标格式');
    }
    
    // 查找源值对应的键
    const key = Object.entries(sourceMap).find(([_, v]) => v === value)?.[0];
    if (!key) return value; // 如果找不到对应的键，返回原值
    
    // 使用找到的键在目标映射中查找对应的值
    return targetMap[key.toLowerCase()] || value;
  }
}

// 时间时段映射
const TIME_SLOTS = {
  DISPLAY_TEXT: ['早晨', '上午', '下午', '晚上']
};

// 星期映射
const WEEKDAY_MAPPING = {
  DISPLAY_TEXT: ['日', '一', '二', '三', '四', '五', '六']
};

module.exports = {
  GOAL_MAPPING,
  FREQUENCY_MAPPING,
  DURATION_MAPPING,
  LEVEL_MAPPING,
  TIME_SLOTS,
  WEEKDAY_MAPPING,
  DictionaryConverter
};