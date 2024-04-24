import { onFP, onFCP, onFID, onLCP, onCLS, observe } from "./web-vitals";
import { HinaDataStore } from "../common/property";

const { PerformanceObserver, performance } = window;

class EmpPerformanceMonitor {
  constructor(config, ctx) {
    this.config = config;
    this.ctx = ctx;
    this.submitData = {};
    this.performanceCallback = this.performanceCallback.bind(this);
  }
  init() {
    // const metricTime = this.getMetricTime();
    // const resourceTime = this.getSourceTime();
    this.initVitails();
  }
  setSubmitData(prop, value) {
    if (typeof prop === "string") {
      this.submitData[prop] = value;
    } else if (typeof prop === "object") {
      this.submitData = _.extend(this.config, prop);
    }
  }
  getConfig(key) {
    return this.config[key];
  }
  onLongTask(callback) {
    // 监听长任务，触发及上报
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const len = entries.length;
        let time = 0
        entries.forEach((entry) => {
          time += Math.round(entry.duration)
        });
        callback({
          H_long_task_time: time,
          H_long_task: len
        });
      });
      observer.observe({ entryTypes: ["longtask"] });
    }
  }
  onPageLoad() {
    // 页面加载完毕时间
    observe("navigation", (entries) => {
      entries.forEach((entry) => {
        const data = {
          H_page_load_time: Math.round(entry.loadEventEnd - entry.startTime),
        };
        if (data.H_page_load_time === 0) return
        this.ctx.sendRequest("track", "H_performance_page", data);
        const loadingData = {
          H_url: entry.name,
          // 首字节
          H_first_byte_time: Math.round(entry.responseStart - entry.startTime),
          // 卸载页面(unload)
          H_unload_time: Math.round(entry.unloadEventEnd - entry.unloadEventStart),
          // 重定向(redirect)
          H_redirect_time: Math.round(entry.redirectEnd - entry.redirectStart),
          // 检查缓存(cache)
          H_cache_check_time: Math.round(entry.domainLookupStart - entry.fetchStart),

          // DNS查询耗时
          H_dns_time: Math.round(entry.domainLookupEnd - entry.domainLookupStart),
          // TCP连接耗时
          H_tcp_time: Math.round(entry.connectEnd - entry.connectStart),
          // ssl耗时
          H_ssl_time:
            entry.secureConnectionStart > 0
              ? Math.round(entry.connectEnd - entry.secureConnectionStart)
              : 0,
          // 首字节响应时间(TTFB)
          H_first_byte_response_time: Math.round(entry.responseStart - entry.requestStart),
          // DOM Ready
          H_dom_ready_time: Math.round(entry.domContentLoadedEventEnd - entry.fetchStart),
          //内容传输
          H_content_transfer_time: Math.round(entry.responseEnd - entry.responseStart),
          //DOM解析
          H_dom_parsing_time: Math.round(entry.domInteractive - entry.responseEnd),
          //页面完全加载
          H_page_load_time: Math.round(entry.loadEventEnd - entry.startTime),
          //资源加载
          H_resource_load_time: Math.round(entry.responseEnd - entry.startTime),
          //load事件时间
          H_load_event_time: Math.round(entry.loadEventEnd - entry.startTime),
        };

        this.ctx.sendRequest("track", "H_performance_loading", loadingData)
      });
    });
  }
  // 页面离开或刷新
  onPageUnlaod() {
    window.addEventListener('beforeunload', () => {
      // session_id设为空
      HinaDataStore.setSessionId('')
    })
  }
  // 初始化页面性能采集
  initVitails() {
    onFP(this.performanceCallback); // 首次绘制时间
    onFCP(this.performanceCallback); // 首次内容绘制时间
    onCLS(this.performanceCallback); // 累计布局偏移
    onFID(this.performanceCallback); // 首次交互延迟
    this.onLongTask(this.performanceCallback);
    this.onPageLoad(this.performanceCallback);
    this.onPageUnlaod()
    onLCP(this.performanceCallback); // 最大内容绘制时间

    // const resourceTime = await this.getSourceTime();
  }
  // 采集页面加载性能
  getMetricTime() {
    if (!performance || !performance.timing) {
      console.log("performance api is not supported in your browser");
      return;
    }

    return new Promise((resolve) => {
      if (PerformanceObserver.supportedEntryTypes.includes("navigation")) {
        observe("navigation", (entries) => {
          entries.forEach((entry) => {
            const data = {
              H_url: entry.name,

              // 首字节
              H_first_byte_time: Math.round(entry.responseStart - entry.startTime),
              // 卸载页面(unload)
              H_unload_time: Math.round(entry.unloadEventEnd - entry.unloadEventStart),
              // 重定向(redirect)
              H_redirect_time: Math.round(entry.redirectEnd - entry.redirectStart),
              // 检查缓存(cache)
              H_cache_check_time: Math.round(entry.domainLookupStart - entry.fetchStart),

              // DNS查询耗时
              H_dns_time: Math.round(entry.domainLookupEnd - entry.domainLookupStart),
              // TCP连接耗时
              H_tcp_time: Math.round(entry.connectEnd - entry.connectStart),
              // ssl耗时
              H_ssl_time:
                entry.secureConnectionStart > 0
                  ? Math.round(entry.connectEnd - entry.secureConnectionStart)
                  : 0,
              // 首字节响应时间(TTFB)
              H_first_byte_response_time: Math.round(entry.responseStart - entry.requestStart),
              // DOM Ready
              H_dom_ready_time: Math.round(entry.domContentLoadedEventEnd - entry.fetchStart),
              //内容传输
              H_content_transfer_time: Math.round(entry.responseEnd - entry.responseStart),
              //DOM解析
              H_dom_parsing_time: Math.round(entry.domInteractive - entry.responseEnd),
              //页面完全加载
              H_page_load_time: Math.round(entry.loadEventEnd - entry.startTime),
              //资源加载
              H_resource_load_time: Math.round(entry.responseEnd - entry.startTime),
              //load事件时间
              H_load_event_time: Math.round(entry.loadEventEnd - entry.startTime),
            };

            resolve(data);
          });
        });
      } else {
        const entry = performance.timing;
        const data = {
          H_url: location.href,
          // 首字节
          H_first_byte_time: Math.round(entry.responseStart - entry.startTime),
          // 卸载页面(unload)
          H_unload_time: Math.round(entry.unloadEventEnd - entry.unloadEventStart),
          // 重定向(redirect)
          H_redirect_time: Math.round(entry.redirectEnd - entry.redirectStart),
          // 检查缓存(cache)
          H_cache_check_time: Math.round(entry.domainLookupStart - entry.fetchStart),

          // DNS查询耗时
          H_dns_time: Math.round(entry.domainLookupEnd - entry.domainLookupStart),
          // TCP连接耗时
          H_tcp_time: Math.round(entry.connectEnd - entry.connectStart),
          // ssl耗时
          H_ssl_time:
            entry.secureConnectionStart > 0
              ? Math.round(entry.connectEnd - entry.secureConnectionStart)
              : 0,
          // 首字节响应时间(TTFB)
          H_first_byte_response_time: Math.round(entry.responseStart - entry.requestStart),

          // DOM Ready
          H_dom_ready_time: Math.round(entry.domContentLoadedEventEnd - entry.fetchStart),
          //内容传输
          H_content_transfer_time: Math.round(entry.responseEnd - entry.responseStart),
          // DOM解析
          H_dom_parsing_time: Math.round(entry.domInteractive - entry.responseEnd),

          //页面完全加载
          H_page_load_time: Math.round(entry.loadEventEnd - entry.fetchStart),
          //资源加载
          H_resource_load_time: Math.round(entry.responseEnd - entry.startTime),
          //load事件时间
          H_load_event_time: Math.round(entry.loadEventEnd - entry.startTime),
        };
        resolve(data);
      }
    });
  }

  // 采集静态资源性能
  getSourceTime() {
    if (!performance || !performance.getEntries) {
      console.log(
        "performance.getEntries api is not supported in your browser"
      );
      return;
    }
    return new Promise((resolve) => {
      const entryList = performance.getEntries();
      const sourceList = [];
      if (!entryList || entryList?.length === 0) {
        resolve(sourceList);
      }
      entryList.forEach((item) => {
        let temp = {};
        if (item.entryType === "resource") {
          // 请求资源路径
          temp.name = item.name;
          // 发起资源类型
          temp.initiatorType = item.initiatorType;
          // http协议版本
          temp.nextHopProtocol = item.nextHopProtocol;
          // 重定向时间
          temp.redirectTime = (item.redirectEnd - item.redirectStart).toFixed(
            2
          );
          // dns查询耗时
          temp.dnsTime = (
            item.domainLookupEnd - item.domainLookupStart
          ).toFixed(2);
          // tcp连接耗时
          temp.tcpTime = (item.connectEnd - item.connectStart).toFixed(2);
          // ttfb
          temp.firstByteResponseTime = (
            item.responseStart - item.requestStart
          ).toFixed(2);
          // 请求响应总时间
          temp.totalResponseTime = (
            item.responseEnd - item.requestStart
          ).toFixed(2);
          sourceList.push(temp);
        }
      });
      resolve(sourceList);
    });
  }

  performanceCallback(data) {
    // 获取指标名 评分 数值
    const { name, rating, value } = data;
    // value取整数
    const intValue = Math.round(value);
    let submitData = {};
    if (name === 'FP') {
      submitData = {
        H_first_paint_time: intValue,
      }
    } else if (name === 'FCP') {
      // H_first_contentful_paint_time
      submitData = {
        H_first_contentful_paint_time: intValue,
      }
    } else if (name === 'LCP') {
      // H_largest_contentful_paint_time
      submitData = {
        H_largest_contentful_paint_time: intValue,
      }
    } else if (name === 'FID') {
      // H_first_input_delay
      submitData = {
        H_first_input_delay: intValue,
      }
    } else if (name === 'CLS') {
      // H_cumulative_layout_shift
      submitData = {
        H_cumulative_layout_shift: value,
      }
    } else {
      submitData = data;
    }
    this.ctx.sendRequest("track", "H_performance_page", submitData);
  }
}

export default EmpPerformanceMonitor;
