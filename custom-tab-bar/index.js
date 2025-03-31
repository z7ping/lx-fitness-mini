Component({
  data: {
    active: 0,
    list: [
      {
        icon: 'home-o',
        text: '首页',
        url: '/pages/home/index'
      },
      {
        icon: 'cluster-o',
        // iconPath: "/assets/icons/exercise.png",
        // selectedIconPath: "/assets/icons/exercise-active.png",
        // text: '运动',
        text: '',
        url: '/pages/exercise/index',
        isCenter: true
      },
      {
        icon: 'user-o',
        text: '我的',
        url: '/pages/profile/index'
      }
    ],
    // 添加一个标志位，用于跟踪页面切换状态
    switching: false
  },
  methods: {
    onChange(event) {
      const index = event.detail;
      const url = this.data.list[index].url;
      wx.switchTab({ url });
      this.setData({ active: index });
    },
    
    // 使用全局数据存储当前选中的标签页
    updateGlobalTabBarState(index) {
      if (typeof index !== 'number' || index < 0 || index >= this.data.list.length) {
        return;
      }
      
      try {
        // 使用全局数据存储当前选中的标签页
        if (getApp() && getApp().globalData) {
          getApp().globalData.currentTabBarIndex = index;
        }
      } catch (error) {
        console.error('更新全局TabBar状态失败:', error);
      }
    },
    
    // 从全局数据获取当前选中的标签页
    getGlobalTabBarState() {
      try {
        if (getApp() && getApp().globalData && typeof getApp().globalData.currentTabBarIndex === 'number') {
          return getApp().globalData.currentTabBarIndex;
        }
      } catch (error) {
        console.error('获取全局TabBar状态失败:', error);
      }
      return -1;
    },
    
    // 根据路径获取对应的标签页索引
    getTabIndexByPath(path) {
      if (!path) return -1;
      
      // 标准化路径格式
      if (!path.startsWith('/')) {
        path = '/' + path;
      }
      
      // 移除查询参数
      const queryIndex = path.indexOf('?');
      if (queryIndex > -1) {
        path = path.substring(0, queryIndex);
      }
      
      // 查找匹配的标签页
      return this.data.list.findIndex(item => path === item.url);
    },
    
    // 初始化标签页状态
    initTabBarState() {
      try {
        // 首先尝试从全局数据获取
        const globalIndex = this.getGlobalTabBarState();
        if (globalIndex !== -1) {
          if (this.data.active !== globalIndex) {
            console.log('从全局数据更新tabbar状态:', globalIndex);
            this.setData({ active: globalIndex });
          }
          return;
        }
        
        // 如果全局数据不可用，则尝试从当前页面路径获取
        const pages = getCurrentPages();
        if (!pages || pages.length === 0) return;
        
        const page = pages[pages.length - 1];
        if (!page) return;
        
        const route = page.route;
        const pathIndex = this.getTabIndexByPath(route);
        
        if (pathIndex !== -1 && this.data.active !== pathIndex) {
          console.log('从页面路径更新tabbar状态:', pathIndex);
          this.setData({ active: pathIndex });
          // 同时更新全局状态
          this.updateGlobalTabBarState(pathIndex);
        }
      } catch (error) {
        console.error('初始化tabbar状态失败:', error);
      }
    },

    init() {
      const page = getCurrentPages().pop();
      const route = page ? page.route : 'pages/home/index';
      const active = this.data.list.findIndex(item => item.url.includes(route));
      this.setData({ active });
    }
  },
  lifetimes: {
    attached() {
      // 组件加载时初始化
      this.initTabBarState();
    },
    ready() {
      // 组件准备就绪时再次初始化
      this.initTabBarState();
    }
  },
  pageLifetimes: {
    show() {
      // 页面显示时初始化
      this.initTabBarState();
      
      // 额外的保障措施：延迟检查以确保状态正确
      setTimeout(() => {
        this.initTabBarState();
      }, 100);
    },
    hide() {
      // 页面隐藏时，可能是切换到了其他标签页
      // 不做任何处理，避免干扰切换逻辑
    }
  },
  observers: {
    'active': function(index) {
      // 当active值变化时，更新全局状态
      this.updateGlobalTabBarState(index);
    }
  }
});