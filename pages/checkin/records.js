// pages/checkin/records.js
const app = getApp()
const { dataService } = require('../../services/dataService')

Page({
  data: {
    timeRange: 'week',
    currentType: 'all',
    searchValue: '',
    stats: {
      count: 0,
      duration: 0,
      calories: 0,
      avgDuration: 0
    },
    records: [],
    loading: false,
    loadingMore: false,
    refreshing: false,
    pageSize: 10,
    currentPage: 1,
    hasMore: true
  },

  onLoad() {
    // 检查登录状态
    if (!app.checkLoginAndAuth()) {
      return;
    }
    this.loadRecords();
    this.updateStats();
  },

  onShow() {
    // 检查登录状态
    if (!app.checkLoginAndAuth()) {
      return;
    }
    // 每次显示页面时重新加载记录，以确保数据最新
    this.loadRecords();
  },

  onPullDownRefresh() {
    this.setData({
      currentPage: 1,
      hasMore: true,
      records: []
    }, () => {
      this.loadRecords();
    });
  },

  // 切换时间范围
  switchTimeRange(e) {
    const range = e.currentTarget.dataset.range;
    this.setData({
      timeRange: range,
      currentPage: 1,
      hasMore: true,
      records: []
    }, () => {
      this.updateStats();
      this.loadRecords();
    });
  },

  // 按类型筛选
  filterByType(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({
      currentType: type,
      currentPage: 1,
      hasMore: true,
      records: []
    }, () => {
      this.loadRecords();
    });
  },

  // 搜索处理
  onSearchChange(e) {
    this.setData({
      searchValue: e.detail
    });
    // 使用防抖处理搜索
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.searchTimer = setTimeout(() => {
      this.setData({
        currentPage: 1,
        hasMore: true,
        records: []
      }, () => {
        this.loadRecords();
      });
    }, 300);
  },

  // 加载更多
  loadMore() {
    if (this.data.loadingMore || !this.data.hasMore) return;
    this.setData({
      currentPage: this.data.currentPage + 1
    }, () => {
      this.loadRecords(true);
    });
  },

  // 刷新处理
  async onRefresh() {
    this.setData({
      refreshing: true,
      currentPage: 1,
      hasMore: true,
      records: []
    });
    await this.loadRecords();
    this.setData({ refreshing: false });
  },

  // 加载打卡记录
  async loadRecords(isLoadMore = false) {
    if (this.data.loading) return;

    try {
      this.setData({ loading: true });
      if (isLoadMore) {
        this.setData({ loadingMore: true });
      }

      // 构建查询参数
      const params = {
        page: this.data.currentPage,
        pageSize: this.data.pageSize,
        timeRange: this.data.timeRange,
        type: this.data.currentType,
        keyword: this.data.searchValue
      };

      // 从服务获取数据
      const response = await dataService.getCheckinRecords(params);
      
      // 处理返回数据
      const formattedRecords = response.records.map(record => ({
        ...record,
        typeText: record.type === 'training' ? '训练打卡' : '饮食打卡',
        checkinTime: this.formatDateTime(record.checkinTime)
      }));

      this.setData({
        records: isLoadMore ? [...this.data.records, ...formattedRecords] : formattedRecords,
        hasMore: formattedRecords.length === this.data.pageSize
      });
    } catch (error) {
      console.error('加载打卡记录失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false,
        loadingMore: false
      });
    }
  },

  // 更新统计数据
  async updateStats() {
    try {
      const stats = await dataService.getCheckinStats({
        timeRange: this.data.timeRange
      });
      
      this.setData({
        stats: {
          ...stats,
          avgDuration: stats.count ? Math.round(stats.duration / stats.count) : 0
        }
      });
    } catch (error) {
      console.error('获取统计数据失败:', error);
    }
  },

  // 查看记录详情
  viewRecordDetail(e) {
    const { id } = e.currentTarget.dataset;
    app.checkLoginAndAuth(() => {
      wx.navigateTo({
        url: `/pages/checkin/detail?id=${id}`
      });
    });
  },

  // 新建打卡
  navigateToCreate() {
    wx.navigateTo({
      url: '/pages/checkin/create'
    });
  },

  // 预览图片
  previewImage(e) {
    const { urls, current } = e.currentTarget.dataset;
    wx.previewImage({
      urls,
      current
    });
  },

  // 格式化日期时间
  formatDateTime(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}`;
  },

  // 删除记录
  deleteRecord(e) {
    const { id, index } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条运动记录吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            const records = dataService.getExerciseRecords();
            // 删除指定记录
            const newRecords = records.filter(record => record.id != id);
            // 使用 dataService 更新数据
            dataService.updateExerciseRecords(newRecords);
            
            // 更新页面数据
            this.loadRecords(); // 重新加载以确保数据同步
            
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

  // 添加点击记录跳转方法
  handleRecordClick(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/exercise/record-detail?id=${id}`
    });
  }
});