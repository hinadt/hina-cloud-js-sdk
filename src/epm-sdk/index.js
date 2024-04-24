import { AjaxSend } from "../common/http";
import { HinaDataStore, initLatestProps } from "../common/property";
import { _, Log, SDKDebug } from "../common/utils";
import EmpPerformanceMonitor from "./performance";
import EPMErrorMonitor from "./errorHandler";
import AutoTrack from './autoTrack'

const defaultOptions = {
  errorCapture: true,
  performance: true,
  presetProperties: {
    latest_utm: true,
    latest_traffic_source_type: true,
    latest_search_keyword: true,
    latest_referrer: true,
    url: true,
    title: true,
  },
  autoTrack: {},
  isSinglePage: false
}

class EmpMonitor {
  constructor() {
    if (!EmpMonitor.instance) {
      EmpMonitor.instance = this;
      this.config = {};
      this.initialized = false;
      this._ = _;
    }
    return EmpMonitor.instance
  }

  setConfig(config) {
    if (_.check.isObject(config)) {
      _.extend(this.config, config);
    }
  }

  getConfig(propName) {
    return this.config[propName];
  }

  sendRequest(type, event, p) {
    const presetProperties = _.info.epmProperties()

    let data = {
      properties: {
        ...presetProperties,
        ...p,
      },
      type: type,
      event: event,
      time: _.now(),
      _track_id: Number(
        String(_.getRandom()).slice(2, 5) +
        String(_.getRandom()).slice(2, 4) +
        String(_.now()).slice(-4)
      ),
    };

    if (HinaDataStore.getAnonymousId()) {
      data.anonymous_id = HinaDataStore.getAnonymousId();
    }

    // if (HinaDataStore.getDeviceId()) {
    //   data.properties.device_id = HinaDataStore.getDeviceId();
    // }
    if (HinaDataStore.getSessionId()) {
      // 过了30分钟，重新生成session_id
      const now = _.now();
      if (now - HinaDataStore.getSessionIdUpdateTime() > 30 * 60 * 1000) {
        const session_id = _.getRandom();
        data.properties.H_session_id = session_id
        HinaDataStore.setSessionId(session_id);
      } else {
        data.properties.H_session_id = HinaDataStore.getSessionId();
      }
    } else {
      data.properties.H_session_id = _.getRandom();
      HinaDataStore.setSessionId(data.properties.H_session_id);
    }
    if (HinaDataStore.getAccountId() !== HinaDataStore.getAnonymousId()) {
      data.account_id = HinaDataStore.getAccountId();
    }

    data.send_time = _.now();
    Log.log(data);
    if (!_.check.isString(data)) {
      data = JSON.stringify(data);
    }
    const base64Data = _.base64Encode(data);
    const para = {
      callback: this.getConfig('globalCallback'),
      data: 'data=' + base64Data,
      // data,
      serverUrl: this.getConfig("serverUrl"), // todo
      endServerUrl: this.getConfig("serverUrl"),
      dataSendTimeout: this.getConfig("dataSendTimeout"),
    };
    new AjaxSend(para).run();
  }
  track(event, prop, callback) {
    let cb = _.check.isFunction(callback) ? callback : () => { };
    if (_.check.isString(event) && (_.check.isObject(prop) || _.check.isUndefined(prop))) {
      this.sendRequest(
        "track",
        event,
        prop,
        cb
      );
    } else {
      Log.log("eventName must be a sting and properties must be an object");
    }
  }
  quick(name, ...args) {
    let list = {
      autoTrack: this.autoTrack.autoTrack,
      autoTrackSinglePage: this.autoTrack.autoTrackSinglePage,
    };

    return list[name].call(this.autoTrack, args);
  }
  init(options) {
    if (_.check.isEmptyObject(this.config)) {
      this.setConfig(_.extend(defaultOptions, options));
      Log.showLog = this.getConfig("showLog");
      SDKDebug.serverUrl = this.getConfig("serverUrl");
      this.isSinglePage = this.getConfig("isSinglePage");
      if (!SDKDebug.checkServerUrl(this.getConfig("serverUrl"))) {
        return;
      }
      HinaDataStore.load(this.config);
      initLatestProps(this.config);
      this.store = HinaDataStore;
      if (this.config["performance"]) {
        const empPerformanceMonitor = new EmpPerformanceMonitor(
          this.config,
          this
        );
        empPerformanceMonitor.init();
      }
      if (this.config["errorCapture"]) {
        new EPMErrorMonitor(this.config, this).init();
      }
      this.initialized = true;

      if (!this.config["autoTrackConfig"]) {
        _.initUrlChange();
        let autoTrack =
          new AutoTrack(
            this.config,
            this
          )
        this.autoTrack = autoTrack
        autoTrack.listenSinglePage();
        _.mitt.emit("hasInitEpm");
      }

    } else {
      Log.log("EmpMonitor has been initialized");
    }

  }
}

const epm = new Proxy(new EmpMonitor(), {
  get(target, prop) {
    if (_.check.isFunction(target[prop])) {
      return function (...args) {
        if (!target.initialized && prop !== "init") {
          console.log("performanceErrorSdk not yet initialized!");
          return;
        }
        return target[prop].apply(target, args);
      };
    }
    return target[prop];
  }
})

window.hinaEpmStatistic = epm;

export default epm;
