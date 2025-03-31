const { dataService } = require('../../services/dataService');
const TimeUtils = require('../../utils/timeUtils');

Page({
  data: {
    recordId: null,
    record: null,
    latitude: 0,
    longitude: 0,
    polyline: [{
      points: [],
      color: '#1296db',
      width: 5,
      dottedLine: false,
      arrowLine: true
    }],
    markers: [],
    // 图表配置
    paceChart: {
      lazyLoad: true
    },
    cadenceChart: {
      lazyLoad: true
    },
    elevationChart: {
      lazyLoad: true
    }
  },

  onLoad(options) {
    const { id } = options;
    if (!id) {
      wx.showToast({
        title: '记录ID不存在',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
      return;
    }

    this.setData({ recordId: id });
    this.loadRecordDetail(id);
  },

  // 加载运动记录详情
  loadRecordDetail(id) {
    try {
      this.setData({ loading: true });
      
      const records = dataService.getExerciseRecords();
      const record = records.find(r => r.id == id);
      
      if (!record) {
        this.setData({ loading: false, notFound: true });
        getApp().utils.showToast('记录不存在');
        return;
      }
      
      // 获取工具类
      const utils = getApp().utils;
      
      // 解析日期
      let recordDate;
      if (record.timestamp) {
        recordDate = new Date(record.timestamp);
      } else {
        recordDate = new Date(record.date);
      }
      
      // 检查日期是否有效
      if (isNaN(recordDate.getTime())) {
        console.error('无效的日期:', record.date);
        recordDate = new Date();
      }
      
      // 格式化日期和时间
      const formattedDate = record.date || utils.formatDateTime(recordDate, 'YYYY年MM月DD日');
      const formattedTime = utils.formatDateTime(recordDate, 'HH:mm:ss');
      
      // 确保数值格式正确
      const distance = parseFloat(record.totalDistance) || 0;
      const duration = parseInt(record.duration) || 0;
      const calories = parseInt(record.calories) || 0;
      
      // 格式化持续时间
      const durationFormatted = record.durationFormatted || TimeUtils.formatDuration(duration, true);
      
      // 计算平均配速
      let avgPaceFormatted = record.avgPaceFormatted;
      if (!avgPaceFormatted && distance > 0 && duration > 0) {
        const pace = (duration / 60) / (distance / 1000);
        avgPaceFormatted = TimeUtils.formatPace(pace);
      }
      
      // 准备轨迹数据
      let polyline = [];
      let markers = [];

      // 处理轨迹数据
      if (record.polyline && record.polyline.length > 0) {
        polyline = record.polyline;
      } else if (record.trackPoints && record.trackPoints.length > 0) {
        polyline = [{
          points: record.trackPoints.map(point => ({
            latitude: point.latitude,
            longitude: point.longitude
          })),
          color: '#1296db',
          width: 4,
          arrowLine: true
        }];
      }

      // 设置起点和终点标记
      if (polyline.length > 0 && polyline[0].points.length > 0) {
        const points = polyline[0].points;
        const startPoint = points[0];
        const endPoint = points[points.length - 1];
        const startAddress = record.startPoint ? record.startPoint.address : "起点";
        const endAddress = record.endPoint ? record.endPoint.address : "终点";
        
        markers = [
          {
            id: 0,
            latitude: startPoint.latitude,
            longitude: startPoint.longitude,
            iconPath: '/assets/images/start_marker.png',
            width: 32,
            height: 32,
            callout: {
              content: startAddress,
              color: '#000000',
              fontSize: 14,
              borderRadius: 4,
              padding: 8,
              display: 'ALWAYS',
              textAlign: 'center'
            }
          },
          {
            id: 1,
            latitude: endPoint.latitude,
            longitude: endPoint.longitude,
            iconPath: '/assets/images/end_marker.png',
            width: 32,
            height: 32,
            callout: {
              content: endAddress,
              color: '#000000',
              fontSize: 14,
              borderRadius: 4,
              padding: 8,
              display: 'ALWAYS',
              textAlign: 'center'
            }
          }
        ];

        // 设置地图中心点
        const centerPoint = points[Math.floor(points.length / 2)];
        this.setData({
          latitude: centerPoint.latitude,
          longitude: centerPoint.longitude,
          hasTrackData: true
        });
      } else {
        if (record.startLocation) {
          this.setData({
            latitude: record.startLocation.latitude,
            longitude: record.startLocation.longitude,
            hasTrackData: false
          });
        }
      }
      
      this.setData({
        record: {
          ...record,
          formattedDate,
          formattedTime,
          displayDistance: this.formatDistance(distance),
          displayDistanceUnit: this.getDistanceUnit(distance),
          durationFormatted,
          calories,
          avgPaceFormatted: avgPaceFormatted || '--\--'
        },
        polyline,
        markers,
        loading: false
      }, () => {
        // 初始化图表
        this.initCharts();
      });
    } catch (error) {
      console.error('加载运动记录详情失败:', error);
      this.setData({
        loading: false,
        notFound: true
      });
      getApp().utils.showToast('加载失败，请重试');
    }
  },

  // 初始化图表
  initCharts() {
    const record = this.data.record;
    
    // 初始化配速图表
    if (record.paceStats && record.paceStats.chart) {
      this.initPaceChart(record.paceStats.chart);
    }
    
    // 初始化步频图表
    if (record.cadenceStats && record.cadenceStats.chart) {
      this.initCadenceChart(record.cadenceStats.chart);
    }
    
    // 初始化海拔图表
    if (record.elevationData && record.elevationData.chart) {
      this.initElevationChart(record.elevationData.chart);
    }
  },

  // 初始化配速图表
  initPaceChart(data) {
    const chartComponent = this.selectComponent('#paceChart');
    if (!chartComponent) return;

    const option = {
      grid: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 40,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(item => this.formatDuration(item.time)),
        axisLabel: {
          interval: Math.floor(data.length / 5),
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: value => TimeUtils.formatPace(value),
          fontSize: 10
        },
        inverse: true
      },
      series: [{
        data: data.map(item => item.value),
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#FF9800'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: 'rgba(255, 152, 0, 0.3)'
            }, {
              offset: 1,
              color: 'rgba(255, 152, 0, 0.1)'
            }]
          }
        }
      }]
    };

    chartComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr
      });
      chart.setOption(option);
      return chart;
    });
  },

  // 初始化步频图表
  initCadenceChart(data) {
    const chartComponent = this.selectComponent('#cadenceChart');
    if (!chartComponent) return;

    const option = {
      grid: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 40,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(item => this.formatDuration(item.time)),
        axisLabel: {
          interval: Math.floor(data.length / 5),
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value} spm',
          fontSize: 10
        }
      },
      series: [{
        data: data.map(item => item.value),
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#2196F3'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: 'rgba(33, 150, 243, 0.3)'
            }, {
              offset: 1,
              color: 'rgba(33, 150, 243, 0.1)'
            }]
          }
        }
      }]
    };

    chartComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr
      });
      chart.setOption(option);
      return chart;
    });
  },

  // 初始化海拔图表
  initElevationChart(data) {
    const chartComponent = this.selectComponent('#elevationChart');
    if (!chartComponent) return;

    const option = {
      grid: {
        top: 20,
        right: 20,
        bottom: 20,
        left: 40,
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.map(item => (item.distance / 1000).toFixed(1) + 'km'),
        axisLabel: {
          interval: Math.floor(data.length / 5),
          fontSize: 10
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '{value}m',
          fontSize: 10
        }
      },
      series: [{
        data: data.map(item => item.altitude),
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: {
          color: '#4CAF50'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0,
              color: 'rgba(76, 175, 80, 0.3)'
            }, {
              offset: 1,
              color: 'rgba(76, 175, 80, 0.1)'
            }]
          }
        }
      }]
    };

    chartComponent.init((canvas, width, height, dpr) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: dpr
      });
      chart.setOption(option);
      return chart;
    });
  },

  formatDistance(distance) {
    if (!distance) return '0';
    return distance >= 1000 ? (distance / 1000).toFixed(2) : Math.round(distance);
  },

  getDistanceUnit(distance) {
    return distance >= 1000 ? '公里' : '米';
  },

  formatDuration(seconds) {
    return TimeUtils.formatDuration(seconds, true);
  },

  onBack() {
    wx.navigateBack();
  },

  onShareRecord() {
    wx.showLoading({
      title: '正在生成分享图片...',
    });

    // 获取画布上下文
    const query = wx.createSelectorQuery();
    query.select('#shareCanvas')
      .fields({ node: true, size: true })
      .exec(async (res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 设置画布大小
        const dpr = wx.getSystemInfoSync().pixelRatio;
        canvas.width = res[0].width * dpr;
        canvas.height = res[0].height * dpr;
        ctx.scale(dpr, dpr);

        // 获取用户信息
        const userInfo = dataService.getUserInfo() || { nickName: '健身爱好者' };

        // 绘制分享图片
        this.drawShareImage(ctx, canvas, userInfo);
      });
  },

  // 绘制分享图片
  drawShareImage(ctx, canvas, userInfo) {
    const record = this.data.record;
    
    // 绘制背景
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#1296db');
    gradient.addColorStop(1, '#0a5d8f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制白色卡片背景
    const cardMargin = 15;
    const cardRadius = 10;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    this.drawRoundRect(ctx, cardMargin, 60, canvas.width - cardMargin * 2, canvas.height - 90, cardRadius);
    ctx.fill();

    // 绘制用户信息
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(userInfo.nickName, 20, 40);
    
    ctx.font = '14px sans-serif';
    const recordText = '的运动记录';
    const textWidth = ctx.measureText(userInfo.nickName).width;
    ctx.fillText(recordText, 20 + textWidth + 5, 40);

    // 绘制日期时间
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(record.formattedDate + ' ' + record.formattedTime, canvas.width - 20, 40);

    // 绘制运动类型图标
    ctx.fillStyle = '#1296db';
    ctx.beginPath();
    ctx.arc(45, 110, 25, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('跑步', 45, 116);

    // 绘制主要数据
    this.drawMainStats(ctx, record);

    // 绘制分隔线
    ctx.strokeStyle = '#eeeeee';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 150);
    ctx.lineTo(canvas.width - 30, 150);
    ctx.stroke();

    // 绘制地图缩略图（如果有轨迹数据）
    if (record.trackPoints && record.trackPoints.length > 0) {
      this.drawMapThumbnail(ctx, record, canvas);
    }

    // 绘制详细数据
    this.drawDetailStats(ctx, record, canvas);

    // 生成分享图片
    wx.canvasToTempFilePath({
      canvas: canvas,
      success: (res) => {
        wx.hideLoading();
        wx.navigateTo({
          url: `/pages/share/preview?imagePath=${encodeURIComponent(res.tempFilePath)}&recordId=${this.data.recordId}`
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({
          title: '生成图片失败',
          icon: 'none'
        });
      }
    });
  },

  // 绘制主要数据
  drawMainStats(ctx, record) {
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(record.displayDistance + ' ' + record.displayDistanceUnit, 85, 110);
    
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText('总距离', 85, 130);
  },

  // 绘制地图缩略图
  drawMapThumbnail(ctx, record, canvas) {
    const bounds = this.calculateTrackBounds(record.trackPoints);
    const padding = 0.0002;
    const mapWidth = canvas.width - 60;
    const mapHeight = 120;
    const mapY = 170;

    // 绘制地图背景
    ctx.fillStyle = '#f5f5f5';
    this.drawRoundRect(ctx, 30, mapY, mapWidth, mapHeight, 8);
    ctx.fill();

    // 计算缩放比例
    const latScale = mapHeight / (bounds.maxLat - bounds.minLat + padding * 2);
    const lngScale = mapWidth / (bounds.maxLng - bounds.minLng + padding * 2);
    const scale = Math.min(latScale, lngScale);

    // 绘制轨迹线
    ctx.beginPath();
    record.trackPoints.forEach((point, index) => {
      const x = 30 + ((point.longitude - bounds.minLng + padding) * scale);
      const y = mapY + mapHeight - ((point.latitude - bounds.minLat + padding) * scale);
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.strokeStyle = '#1296db';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // 绘制起点和终点标记
    const startPoint = record.trackPoints[0];
    const endPoint = record.trackPoints[record.trackPoints.length - 1];

    // 起点（绿色）
    const startX = 30 + ((startPoint.longitude - bounds.minLng + padding) * scale);
    const startY = mapY + mapHeight - ((startPoint.latitude - bounds.minLat + padding) * scale);
    ctx.fillStyle = '#4CAF50';
    ctx.beginPath();
    ctx.arc(startX, startY, 4, 0, Math.PI * 2);
    ctx.fill();

    // 终点（红色）
    const endX = 30 + ((endPoint.longitude - bounds.minLng + padding) * scale);
    const endY = mapY + mapHeight - ((endPoint.latitude - bounds.minLat + padding) * scale);
    ctx.fillStyle = '#FF5252';
    ctx.beginPath();
    ctx.arc(endX, endY, 4, 0, Math.PI * 2);
    ctx.fill();
  },

  // 绘制详细数据
  drawDetailStats(ctx, record, canvas) {
    const startY = 310;
    const colWidth = (canvas.width - 60) / 2;
    const rowHeight = 50;

    // 配速数据
    this.drawDataItem(ctx, '平均配速', record.avgPaceFormatted + '/km', 30, startY);
    this.drawDataItem(ctx, '最佳配速', record.paceStats?.best ? TimeUtils.formatPace(record.paceStats.best) + '/km' : '--\--', 30 + colWidth, startY);

    // 心率数据
    this.drawDataItem(ctx, '平均心率', record.heartRate?.avg ? record.heartRate.avg + ' bpm' : '--', 30, startY + rowHeight);
    this.drawDataItem(ctx, '最高心率', record.heartRate?.max ? record.heartRate.max + ' bpm' : '--', 30 + colWidth, startY + rowHeight);

    // 步频数据
    this.drawDataItem(ctx, '平均步频', record.cadenceStats?.avg ? record.cadenceStats.avg + ' spm' : '--', 30, startY + rowHeight * 2);
    this.drawDataItem(ctx, '总步数', record.totalSteps || '--', 30 + colWidth, startY + rowHeight * 2);

    // 训练效果
    if (record.trainingEffect) {
      this.drawDataItem(ctx, '训练效果', record.trainingEffect.aerobic.toFixed(1) + '/' + record.trainingEffect.anaerobic.toFixed(1), 30, startY + rowHeight * 3);
      this.drawDataItem(ctx, '恢复时间', record.trainingEffect.recovery + 'h', 30 + colWidth, startY + rowHeight * 3);
    }
  },

  // 绘制数据项
  drawDataItem(ctx, label, value, x, y) {
    ctx.fillStyle = '#333333';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(value, x, y);
    
    ctx.fillStyle = '#666666';
    ctx.font = '14px sans-serif';
    ctx.fillText(label, x, y + 20);
  },

  // 绘制圆角矩形
  drawRoundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.arcTo(x + width, y, x + width, y + radius, radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius);
    ctx.lineTo(x + radius, y + height);
    ctx.arcTo(x, y + height, x, y + height - radius, radius);
    ctx.lineTo(x, y + radius);
    ctx.arcTo(x, y, x + radius, y, radius);
    ctx.closePath();
  },

  // 计算轨迹边界
  calculateTrackBounds(trackPoints) {
    let minLat = Number.MAX_VALUE;
    let maxLat = Number.MIN_VALUE;
    let minLng = Number.MAX_VALUE;
    let maxLng = Number.MIN_VALUE;

    trackPoints.forEach(point => {
      minLat = Math.min(minLat, point.latitude);
      maxLat = Math.max(maxLat, point.latitude);
      minLng = Math.min(minLng, point.longitude);
      maxLng = Math.max(maxLng, point.longitude);
    });

    return { minLat, maxLat, minLng, maxLng };
  }
}); 