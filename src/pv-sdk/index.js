import { AjaxSend, BatchSend, BeaconSend, ImageSend } from "../common/http";
import {
  HinaDataStore,
  addProps,
  getPresetProperties,
  initLatestProps,
} from "../common/property";
import { Log, SDKDebug, _ } from "../common/utils";
import AutoTrack from "./autoTrack";
import plugin from "./plugin";

let defaultPara = {
  name: "",
  showLog: false,
  autoTrackConfig: {
    clickAutoTrack: false, //自动采集web点击事件 
    stayAutoTrack: false, //自动采集web停留事件
    pageviewAutoTrack: false, //自动采集web浏览事件 auto singlePage false 默认关闭
    pageLeaveAutoTrack: false, //自动采集web离开事件 false object(PageLeave的配置) 默认关闭
  },
  stayAutoTrackConfig: {},
  imgUseCrossOrigin: false,
  isSinglePage: false, //自动采集web浏览事件
  batchSend: false,
  appJsBridge: false,
  sendType: "image",
  dataSendTimeout: 3000,
  isTrackDeviceId: false,
  presetProperties: {
    latest_utm: true,
    latest_traffic_source_type: true,
    latest_search_keyword: true,
    latest_referrer: true,
    url: true,
    title: true,
  },
};

class HinaDataLib {
  constructor() {
    if (!HinaDataLib.instance) {
      HinaDataLib.instance = this;
      this.config = {};
      this.initialized = false;
      this._ = _;
    }
    return HinaDataLib.instance;
  }

  setConfig(config) {
    if (_.check.isObject(config)) {
      _.extend(this.config, config);
    }
  }

  getConfig(propName) {
    return this.config[propName];
  }

  //初始化时需要启动全埋点
  init(para) {
    if (_.check.isEmptyObject(this.config)) {
      this.setConfig(_.extend({}, defaultPara, para));

      Log.showLog = this.getConfig("showLog");
      SDKDebug.serverUrl = this.getConfig("serverUrl");
      if (!SDKDebug.checkServerUrl(this.getConfig["serverUrl"])) return;

      _.initUrlChange();

      // 初始化存储和属性
      HinaDataStore.load(this.config);
      initLatestProps(this.config);
      this.store = HinaDataStore;

      //初始化请求参数
      let sendType = this.getConfig("sendType");
      if (!["image", "ajax", "beacon"].includes(sendType)) {
        this.setConfig({
          sendType: "image",
        });
      }

      if (
        this.getConfig("batchSend") === true ||
        _.check.isObject(this.getConfig("batchSend"))
      ) {
        this.batchSender = new BatchSend(this.config);
        this.batchSender.batchInterval();
      }

      //初始化全埋点
      let autoTrackConfig = this.getConfig("autoTrackConfig");
      let stayAutoTrackConfig = this.getConfig("stayAutoTrackConfig");
      const pageviewAutoTrack = autoTrackConfig.pageviewAutoTrack;
      const pageLeaveAutoTrack = autoTrackConfig.pageLeaveAutoTrack;
      let autoTrackInstance = new AutoTrack(
        autoTrackConfig,
        stayAutoTrackConfig,
        this
      );
      this.autoTrackInstance = autoTrackInstance;
      autoTrackInstance.initWebClick();
      autoTrackInstance.initWebStay();
      if (pageviewAutoTrack === 'auto') {
        autoTrackInstance.autoTrack();
      } else if (pageviewAutoTrack === 'singlePage' || this.getConfig("isSinglePage")) {
        this.config.isSinglePage = true
        autoTrackInstance.listenSinglePage();
      }
      if (pageLeaveAutoTrack) {
        if (_.check.isObject(pageLeaveAutoTrack)) {
          this.use("PageLeave", pageLeaveAutoTrack);
        } else {
          this.use("PageLeave");
        }
      }
      this.initialized = true;
      Log.log("hinaSDK initialized successfully");
      _.mitt.emit("hasInit");
    } else {
      Log.log("hinaSDK has been initialized");
    }
  }

  sendRequest(data, callback) {
    data = addProps(data, this);
    data.send_time = _.now();
    Log.log(data);
    let useAppJsBridge = this.getConfig("appJsBridge");
    if (useAppJsBridge) {
      let jsBridge = window.Hina_Cloud_H5_Bridge || {};
      if (_.check.isObject(jsBridge) && jsBridge.track) {
        // android
        jsBridge.track(data.event, data.type, JSON.stringify(data));
        if (_.check.isFunction(callback)) callback();
        Log.log("The data has been sent to the Android side");
        return;
      } else if (_.info.os() === "iOS") {
        // ios
        let iosTracker = window.webkit?.messageHandlers?.hinaNativeTracker;
        if (iosTracker?.postMessage) {
          let param = JSON.stringify({
            eventName: data.event,
            eventType: data.type,
            properties: data
          });
          iosTracker.postMessage(param);
          if (_.check.isFunction(callback)) callback();
          Log.log("The data has been sent to the iOS side");
          return;
        }
      }
      Log.log("The app JSBridge data transmission has failed.");
    }
    let isBatchSend = this.getConfig("batchSend");
    if (isBatchSend) {
      new BatchSend(this.config).add(data);
    } else {
      if (!_.check.isString(data)) {
        data = JSON.stringify(data);
      }
      let base64Data = _.base64Encode(data);
      let crc = "crc=" + _.hashCode(base64Data);
      let urlData =
        "data=" +
        _.encodeURIComponent(base64Data) +
        "&ext=" +
        _.encodeURIComponent(crc);
      let sendType = this.getConfig("sendType");
      let para = {
        callback: this.getConfig('globalCallback'),
        data: urlData,
        serverUrl: this.getConfig("serverUrl"),
        dataSendTimeout: this.getConfig("dataSendTimeout"),
      };
      switch (sendType) {
        case "ajax":
          new AjaxSend(para).run();
          break;

        case "beacon":
          new BeaconSend(para).run();
          break;

        default:
          new ImageSend(
            _.extend(para, {
              imgUseCrossOrigin: this.getConfig("imgUseCrossOrigin"),
            })
          ).run();
          break;
      }
    }
  }

  quick(name, ...args) {
    let list = {
      autoTrack: this.autoTrackInstance.autoTrack,
      autoTrackSinglePage: this.autoTrackInstance.autoTrackSinglePage,
    };

    return list[name].call(this.autoTrackInstance, args);
  }

  track(e, p, c) {
    let cb = _.check.isFunction(c) ? c : () => { };
    if (_.check.isString(e) && (_.check.isObject(p) || _.check.isUndefined(p))) {
      this.sendRequest(
        {
          type: "track",
          event: e,
          properties: p,
        },
        cb
      );
    } else {
      Log.log("eventName must be a sting and properties must be an object");
    }
  }

  setUserUId(uid, callback) {
    if (_.check.isNumber(uid) || _.check.isString(uid)) {
      uid = String(uid);
    } else {
      Log.log("setUserUId: uid must be string or number");
      return;
    }

    let firstId = this.store.getFirstId();
    let accountId = this.store.getAccountId();

    // if (uid === accountId && !firstId) {
    //   Log.log("setUserUId: uid is equal to account_id, failed to execute setUserUId");
    //   return;
    // }

    if (uid !== accountId) {
      if (!firstId) {
        this.store.set("firstId", accountId);
      }
      this.store.setAccountId(uid);

      this.sendRequest(
        {
          account_id: this.store.getAccountId(),
          type: "track_signup",
          event: "H_SignUp",
          properties: {},
        },
        callback
      );
    } else {
      console.log("setUserUId: uid is equal to account_id, , failed to execute setUserUId");
    }
  }

  getDeviceUId() {
    return this.store.getAnonymousId();
  }

  setDeviceUId(uid, isSave) {
    let firstId = this.store.getFirstId();
    if (_.check.isUndefined(uid)) {
      let uuid = _.UUID();
      if (firstId) {
        this.store.set("firstId", uuid);
      } else {
        this.store.setAccountId(uuid);
      }
    } else if (_.check.isNumber(uid) || _.check.isString(uid)) {
      uid = String(uid);
      if (isSave === true) {
        if (firstId) {
          this.store.set("firstId", uid);
        } else {
          this.store.set("accountId", uid);
        }
      } else {
        if (firstId) {
          this.store.change("firstId", uid);
        } else {
          this.store.change("accountId", uid);
        }
      }
    }
  }

  userSet(p, c) {
    if (_.check.isObject(p) && !_.check.isEmptyObject(p)) {
      this.sendRequest(
        {
          type: "user_set",
          properties: p,
        },
        c
      );
    }
  }

  userSetOnce(p, c) {
    if (_.check.isObject(p) && !_.check.isEmptyObject(p)) {
      this.sendRequest(
        {
          type: "user_setOnce",
          properties: p,
        },
        c
      );
    }
  }

  userAdd(p, c) {
    if (_.check.isString(p)) {
      let s = p;
      p = {
        [s]: 1,
      };
    }

    function isCheck(para) {
      for (let s in para) {
        if (s in para && !/-*\d+/.test(String(para[s]))) {
          Log.log("userAdd: value is must be number");
          return false;
        }
      }
      return true;
    }

    if (_.check.isObject(p) && !_.check.isEmptyObject(p) && isCheck(p)) {
      this.sendRequest(
        {
          type: "user_add",
          properties: p,
        },
        c
      );
    }
  }

  userUnset(p, c) {
    let obj = {};
    if (_.check.isString(p)) {
      let s = p;
      p = [s];
    }

    if (_.check.isArray(p)) {
      _.each(p, function (v) {
        if (_.check.isString(v)) {
          obj[v] = true;
        } else {
          Log.log(
            "userUnset: value inside the array must be string and have already been filtered out",
            v
          );
        }
      });
      this.sendRequest(
        {
          type: "user_unset",
          properties: obj,
        },
        c
      );
    } else {
      Log.log("userUnset: param must be an array or string");
    }
  }

  userDelete(c) {
    this.sendRequest(
      {
        type: "user_delete",
      },
      c
    );
    this.store.setAccountId(_.UUID());
    this.store.set("firstId", "");
  }

  registerCommonProperties(para) {
    this.store.set("props", para);
  }

  getPresetProperties() {
    return getPresetProperties();
  }

  use(pluginName, option) {
    if (!_.check.isString(pluginName)) {
      Log.log("pluginName must be string");
      return;
    }

    if (!(pluginName in plugin)) {
      Log.log("please write a valid plugin name");
      return;
    }

    new plugin[pluginName]().init(this, option);
  }
}

const hina = new Proxy(new HinaDataLib(), {
  get(target, prop) {
    if (_.check.isFunction(target[prop])) {
      return function (...args) {
        if (!target.initialized && prop !== "init") {
          console.log("sdk not yet initialized!");
          return;
        }
        return target[prop].apply(target, args);
      };
    }
    return target[prop];
  },
});

window.hinaDataStatistic = hina;

export default hina;
