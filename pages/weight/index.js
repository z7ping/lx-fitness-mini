const { dataService } = require('../../services/dataService');
const utils = require('../../utils/utils');
// import * as echarts from '../../ec-canvas/echarts';

Page({
  data: {
    loading: true,
    weightStats: {
      currentWeight: 0,
      startWeight: 0,
      weightChange: 0,
      trend: 'none',
      startDate: '',
      changePercentage: 0
    },
    weightRecords: [],
    showAddForm: false,
    isEditing: false,
    currentView: 'week', // 默认显示周视图
    newRecord: {
      weight: '',
      bodyFat: '',
      note: ''
    },
    ec: {
      lazyLoad: true
    }
  },

  onLoad() {
    this.loadData();
    // this.initChart();
  },

  onShow() {
    this.loadData();
  },

  // 初始化图表
  async initChart() {
    const ecComponent = this.selectComponent('#weightChart');
    if (ecComponent) {
      ecComponent.init((canvas, width, height, dpr) => {
        const chart = echarts.init(canvas, null, {
          width: width,
          height: height,
          devicePixelRatio: dpr
        });
        this.setChartOption(chart);
        return chart;
      });
    }
  },

  // 设置图表配置
  setChartOption(chart) {
    const { weightRecords, currentView } = this.data;
    const chartData = this.processChartData(weightRecords, currentView);

    const option = {
      animation: false,
      backgroundColor: '#ffffff',
      grid: {
        left: '8%',
        right: '5%',
        bottom: '8%',
        top: '8%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: chartData.dates,
        axisLine: {
          lineStyle: {
            color: '#ddd'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 10,
          interval: 'auto'
        }
      },
      yAxis: {
        type: 'value',
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#666',
          fontSize: 10,
          formatter: '{value}kg'
        },
        splitLine: {
          lineStyle: {
            color: '#f5f5f5'
          }
        }
      },
      series: [
        {
          name: '体重',
          type: 'line',
          smooth: true,
          data: chartData.weights,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#ff6b00'
          },
          lineStyle: {
            width: 2,
            color: '#ff6b00'
          },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: 'rgba(255, 107, 0, 0.15)'
              },
              {
                offset: 1,
                color: 'rgba(255, 107, 0, 0)'
              }
            ])
          }
        }
      ],
      tooltip: {
        trigger: 'axis',
        formatter: function(params) {
          const data = params[0];
          return `${data.name}<br/>体重：${data.value}kg`;
        },
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        textStyle: {
          color: '#fff',
          fontSize: 12
        },
        padding: [8, 12]
      }
    };

    chart.setOption(option);
    
    // 添加点击事件
    chart.on('click', (params) => {
      this.handleChartPointClick(params, chartData);
    });
  },

  // 处理图表点击事件
  handleChartPointClick(params, chartData) {
    const index = params.dataIndex;
    const date = chartData.dates[index];
    const weight = chartData.weights[index];
    const fullRecord = this.findRecordByDateAndWeight(date, weight);
    
    if (fullRecord) {
      wx.showModal({
        title: '体重记录详情',
        content: `日期：${fullRecord.date}\n体重：${fullRecord.weight}kg${fullRecord.bodyFat ? '\n体脂率：' + fullRecord.bodyFat + '%' : ''}`,
        showCancel: false,
        confirmText: '确定'
      });
    }
  },
  
  // 根据日期和体重查找完整记录
  findRecordByDateAndWeight(date, weight) {
    const { weightRecords, currentView } = this.data;
    let dateFormat = 'MM-DD';
    if (currentView === 'year') {
      dateFormat = 'YYYY-MM';
    }
    
    return weightRecords.find(record => {
      const recordDate = utils.formatDate(new Date(record.date), dateFormat);
      return recordDate === date && parseFloat(record.weight) === parseFloat(weight);
    });
  },

  // 处理图表数据
  processChartData(records, view) {
    const now = new Date();
    let startDate;
    let dateFormat;

    switch (view) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFormat = 'MM-DD';
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFormat = 'MM-DD';
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        dateFormat = 'YYYY-MM';
        break;
    }

    const filteredRecords = records.filter(record => {
      const recordDate = new Date(record.date);
      return recordDate >= startDate && recordDate <= now;
    });

    // 按日期排序
    filteredRecords.sort((a, b) => new Date(a.date) - new Date(b.date));

    const dates = filteredRecords.map(record => 
      utils.formatDate(new Date(record.date), dateFormat)
    );
    const weights = filteredRecords.map(record => record.weight);
    
    // 保存原始记录索引，用于点击事件
    const originalIndices = filteredRecords.map((_, index) => index);

    return { dates, weights, originalIndices, records: filteredRecords };
  },

  // 切换视图
  switchView(e) {
    const view = e.currentTarget.dataset.view;
    this.setData({ currentView: view }, () => {
      this.refreshChart();
    });
  },

  // 刷新图表
  refreshChart() {
    this.initChart();
  },

  // 加载数据
  loadData() {
    try {
      this.setData({ loading: true });
      
      // 获取体重统计数据
      const weightStats = dataService.getWeightStats();
      
      // 获取体重记录列表
      const weightRecords = dataService.getWeightRecords();
      
      this.setData({
        weightStats,
        weightRecords,
        loading: false
      }, () => {
        this.refreshChart();
      });
    } catch (error) {
      console.error('加载体重数据失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
      this.setData({ loading: false });
    }
  },

  // 显示添加记录表单
  showAddForm() {
    this.setData({ 
      showAddForm: true,
      newRecord: {
        weight: '',
        bodyFat: '',
        note: ''
      }
    });
  },

  // 隐藏添加记录表单
  hideAddForm() {
    this.setData({ showAddForm: false });
  },

  // 输入体重
  onWeightInput(e) {
    this.setData({
      'newRecord.weight': e.detail.value
    });
  },

  // 输入体脂率
  onBodyFatInput(e) {
    this.setData({
      'newRecord.bodyFat': e.detail.value
    });
  },

  // 输入备注
  onNoteInput(e) {
    this.setData({
      'newRecord.note': e.detail.value
    });
  },

  // 保存记录
  async saveRecord() {
    const { newRecord } = this.data;
    
    if (!newRecord.weight) {
      wx.showToast({
        title: '请输入体重',
        icon: 'none'
      });
      return;
    }

    try {
      // 保存记录
      await dataService.saveWeightRecord(newRecord);
      
      // 刷新数据
      this.loadData();
      
      // 隐藏表单
      this.hideAddForm();
      
      wx.showToast({
        title: '记录已保存',
        icon: 'success'
      });
    } catch (error) {
      console.error('保存体重记录失败:', error);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  // 删除记录
  deleteRecord(e) {
    const { id } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条记录吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            dataService.deleteWeightRecord(id);
            this.loadData();
            wx.showToast({
              title: '已删除',
              icon: 'success'
            });
          } catch (error) {
            console.error('删除体重记录失败:', error);
            wx.showToast({
              title: '删除失败',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => {
      wx.stopPullDownRefresh();
    });
  }
}); 