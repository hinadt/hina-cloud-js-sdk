import Raven from "raven-js";
// import * as Sentry from '@sentry/browser';
import { Log, _ } from "../common/utils";
// const Raven = require('raven-js');

const classify = (str) => str.replace(/(?:^|[-_])(\w)/g, c => c.toUpperCase()).replace(/[-_]/g, '')

class EPMErrorMonitor {
  constructor(config, ctx) {
    if (!EPMErrorMonitor.instance) {
      EPMErrorMonitor.instance = this;
      this.config = config;
      this.ctx = ctx
      this.initialized = false;
    }
    return EPMErrorMonitor.instance;
  }

  setConfig(config) {
    if (_.check.isObject(config)) {
      _.extend(this.config, config);
    }
  }

  getConfig(propName) {
    return this.config[propName];
  }

  /**
   * @param {'vue2'|'vue3'|'js'} type vue2、vue3、js
   * @param {object} app vue3实例
   * @param {object} Vue vue2实例
   * @param {object} React react实例 
   * @param {boolean} showVueError vue框架中是否显示错误
   * @param {string} serverUrl 请求上报地址  
   * @param {boolean} showLog 是否显示日志
   * @param {string} sourcemapVersion sourcemap版本号
   */
  init() {
    const serverUrl = this.getConfig("serverUrl");
    if (!_.check.isString(serverUrl) || _.trim(serverUrl) === "") {
      Log.log(
        "当前 serverUrl 为空或不正确，请配置正确的 serverUrl！"
      );
      return;
    }
    this.initCommon();
    this.initialized = true;
    Log.log("hinaSDK initialized successfully");
  }
  initCommon() {
    const { type, app } = this.config;
    if (type.includes('vue')) {
      this.vueInit(app, this.config)
    }
    this.ravenInit()
  }
  ravenInit() {
    const { sourcemapVersion, serverUrl} = this.config;
    if (!sourcemapVersion) {
      sourcemapVersion = '1.0.0'
    }
    Raven.config(serverUrl).install();
    Raven.setTransport((options) => {
      const exception = options.data.exception;
      let customRequest = {
        H_js_error_type: exception?.values?.[0]?.type || '',
        H_js_error_summary: exception?.values?.[0]?.value || '',
        H_js_error_id: exception ? _.hash(JSON.stringify(exception)) : '',
        H_js_error_content: exception ? JSON.stringify(exception) : '',
        H_js_sourcemap_version: sourcemapVersion,
      };
      this.ctx.sendRequest('track', 'H_performance_js', customRequest)
      options.onSuccess();
    });
  }

  vueInit(app, config) {
    const isMounted = false
    if (isMounted) {
      console.warn('epm-sdk：请确保 `app.mount()` 是在 `EpmSDK.init()` 之后调用')
      return;
    }
    const oldErrorHandler = app.config.errorHandler;
    app.config.errorHandler = (err, vm, lifecycleHook) => {

      this.captureVueError(err, vm, lifecycleHook);

      if (typeof oldErrorHandler === 'function') {
        oldErrorHandler.call(app, err, vm, lifecycleHook);
      }

      if (!config.showVueError) {
        return
      }
      console.error(err)
    }

  }
  ReactInit(app, config) {
    // const oldErrorHandler = app.config.errorHandler;
    app.errorHandler = (err, vm, lifecycleHook) => {
      this.captureReactError(err, vm, lifecycleHook);
      if (!config.showError) {
        return
      }
      console.error(err)
    }
  }

  captureVueError(err, vm, lifecycleHook) {
    const componentName = this.formatComponentName(vm);
    const metaData = {
      componentName, lifecycleHook
    }
    if (vm) {
      if (vm.$options && vm.$options.propsData) {
        metaData.propsData = vm.$options.propsData
      } else if (vm.$props) {
        metaData.propsData = vm.$props
      }
    }
    setTimeout(() => {
      Raven.captureException(err, {
        extra: metaData
      })
    })
    Log.log(err, lifecycleHook)
  }
  captureReactError(err, vm, lifecycleHook) {
    const componentName = formatComponentName(vm);
    const metaData = {
      componentName, lifecycleHook
    }
    if (vm) {
      // React - props
      // Next.js - props
      // Remix - props
      if (vm.props) {
        metaData.propsData = vm.props
      }
    }
    setTimeout(() => {
      Raven.captureException(err, {
        extra: info
      })
    })
  }
  formatComponentName(vm) {
    if (!vm) {
      return '<Anonymous>'
    }

    if (vm.$root === vm) {
      return '<Root>'
    }

    if (!vm.$options) {
      return '<Anonymous>'
    }

    const options = vm.$options

    let name = options.name || options._componentTag;
    const file = options.__file;
    if (!name && file) {
      const match = file.match(/([^/\\]+)\.vue$/);
      if (match) {
        name = match[1];
      }
    }

    return (name ? `<${classify(name)}>` : '<Anonymous>') + (file ? ` at ${file}` : '')
  }

  captureError(...arg) {
    return Raven.captureException(...arg)
  }
}


// const epmErrorMonitor = new Proxy(new EPMErrorMonitor(), {
//   get(target, prop) {
//     if (_.check.isFunction(target[prop])) {
//       return function (...args) {
//         if (!target.initialized && prop !== "init") {
//           console.log("epm-sdk not yet initialized!");
//           return;
//         }
//         return target[prop].apply(target, args);
//       };
//     }
//     return target[prop];
//   },
// });

export default EPMErrorMonitor;