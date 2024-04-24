import { Log, SDKDebug, _ } from "./utils";

function xhr() {
  if (
    typeof window.XMLHttpRequest !== "undefined" &&
    "withCredentials" in new XMLHttpRequest()
  ) {
    return new XMLHttpRequest();
  } else if (typeof window.XDomainRequest !== "undefined") {
    let XDomainRequest = window.XDomainRequest;
    return new XDomainRequest();
  } else {
    return null;
  }
}

function ajax(para) {
  SDKDebug.checkAjax(para.url);

  para.timeout = para.timeout || 20000;

  let r = xhr();

  if (!r) {
    return false;
  }

  para = _.extend(
    {
      success: function () {},
      error: function () {},
    },
    para
  );

  let oldSuccess = para.success;
  let oldError = para.error;
  let errorTimer;

  let clearTimer = (isReset = false) => {
    if (errorTimer) {
      clearTimeout(errorTimer);
      errorTimer = null;
      if (isReset) {
        r.onreadystatechange = null;
        r.onload = null;
        r.onerror = null;
      }
    }
  };

  para.success = function (data) {
    oldSuccess(data);
    clearTimer();
  };

  para.error = function (err) {
    oldError(err);
    clearTimer();
  };

  errorTimer = setTimeout(() => {
    try {
      if (r && _.check.isObject(r) && r.abort) {
        r.abort();
      }
    } catch (error) {
      Log.log(error);
    }

    clearTimer(true);
  }, para.timeout);

  let getSafeJSON = (d) => {
    if (!d) {
      return "";
    }
    return _.safeJSONParse(d);
  };

  if (
    typeof XDomainRequest !== "undefined" &&
    r instanceof window.XDomainRequest
  ) {
    r.onload = function () {
      para.success && para.success(getSafeJSON(r.responseText));
      r.onreadystatechange = null;
      r.onload = null;
      r.onerror = null;
    };
    r.onerror = function () {
      para.error && para.error(getSafeJSON(r.responseText), r.status);
      r.onreadystatechange = null;
      r.onerror = null;
      r.onload = null;
    };
  }

  r.open("post", para.url, true);

  if (para.credentials) {
    r.withCredentials = true;
  }

  if (r.setRequestHeader) {
    r.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
    // r.setRequestHeader("Content-type", "application/form-data");
  }

  r.onreadystatechange = function () {
    try {
      if (r.readyState === 4) {
        if ((r.status >= 200 && r.status < 300) || r.status === 304) {
          para.success(getSafeJSON(r.responseText));
        } else {
          para.error('网络异常, 请求失败', r.status);
        }
        r.onreadystatechange = null;
        r.onload = null;
      }
    } catch (e) {
      r.onreadystatechange = null;
      r.onload = null;
    }
  };
  r.send(para.data || null);
}

class AjaxSend {
  constructor(para) {
    this.callback = para.callback;
    this.serverUrl = para.serverUrl;
    this.data = para.data;
    this.dataSendTimeout = para.dataSendTimeout;
  }

  run() {
    ajax({
      url: this.serverUrl,
      data: this.data,
      timeout: this.dataSendTimeout,
      success: () => this.cb("success"),
      error: (err) => this.cb("fail", err),
    });
  }

  cb(type, msg) {
    if (this.callback) {
      if (!_.check.isFunction(this.callback)) {
        Log.log("sdk callback is not a function");
        return;
      }
      const data = new URLSearchParams(this.data).get("data");
      const decodeData = _.base64Decode(data);
      if(decodeData.type === 'track' && decodeData.event === 'H_WebPageLeave') {
        return;
      }
      this.callback(this.serverUrl, decodeData, type, msg);
    }
  }
}

class ImageSend {
  constructor(para) {
    this.callback = para.callback;
    this.serverUrl = para.serverUrl;
    this.data = para.data;
    this.dataSendTimeout = para.dataSendTimeout;

    this.img = document.createElement("img");
    this.img.width = 1;
    this.img.height = 1;

    if (para.imgUseCrossOrigin) {
      this.img.crossOrigin = "anonymous";
    }
  }

  run() {
    let callAndDelete = (type, msg) => {
      if (this.img && !this.img.complete) {
        this.img.complete = true;
        setTimeout(() => {
          let sys = _.info.browser().type;
          if (sys === "ie") {
            this.img.src = "about:blank";
          } else {
            this.img.src = "";
          }
        }, this.dataSendTimeout);
      }
      this.cb(type, msg);
    };

    if (this.serverUrl.indexOf("?") !== -1) {
      this.img.src = this.serverUrl + "&" + this.data;
    } else {
      this.img.src = this.serverUrl + "?" + this.data;
    }

    this.img.onload = function () {
      this.onload = null;
      callAndDelete("success");
    };

    this.img.onerror = function () {
      this.onerror = null;
      callAndDelete("error");
    };

    this.img.onabort = function () {
      this.onabort = null;
      callAndDelete("abort");
    };
  }

  cb(type) {
    if (this.callback) {
      if (!_.check.isFunction(this.callback)) {
        Log.log("sdk callback is not a function");
        return;
      }
      const data = new URLSearchParams(this.data).get("data");
      this.callback(this.serverUrl, _.base64Decode(data), type);
    }
  }
}

class BeaconSend {
  constructor(para) {
    this.callback = para.callback;
    this.serverUrl = para.serverUrl;
    this.data = para.data;
  }

  run() {
    if (
      _.check.isObject(navigator) &&
      _.check.isFunction(navigator.sendBeacon)
    ) {
      let formData = new FormData();
      formData.append("data", _.base64Encode(this.data));
      navigator.sendBeacon(this.serverUrl, formData);
    }

    setTimeout(() => {
      this.cb();
    });
  }

  cb() {
    if (this.callback) {
      if (!_.check.isFunction(this.callback)) {
        Log.log("sdk callback is not a function");
        return;
      }
      this.callback();
    }
  }
}

let dataStoragePrefix = "hinasdk_data_";
let tabStoragePrefix = "hinasdk_tab";

/**
 * 批量发送
 * 分为两个cache, 第一个cache存储tabkey和dataKey、expireTime
 * {
 *    k: tabkey,
 *    v: [{dataKey, expireTime}]
 * }
 * 第二个cache存储引用dataKey和data组成真实数据kv
 * {
 *    k: dataKey,
 *    v: data
 * }
 * data不需要加密
 */

class BatchSend {
  constructor(config) {
    this.timer = null;
    this.sendTimeStamp = 0;
    this.batchConfig = _.extend(
      {
        dataSendTimeout: 6000,
        sendInterval: 6000,
        storageLimit: 200,
      },
      config["batchSend"]
    );
    this.tabKey = tabStoragePrefix;
    this.config = config;
  }

  batchInterval() {
    this.timer = setTimeout(() => {
      this.recycle();
      this.send();
      clearTimeout(this.timer);
      this.batchInterval();
    }, this.batchConfig["sendInterval"]);
  }

  request(data, dataKeys) {
    data = data.filter((item) => item != null);
    if (data.length == 0) return;
    ajax({
      url: this.config["serverUrl"],
      data:
        "data_list=" + encodeURIComponent(_.base64Encode(JSON.stringify(data))),
      timeout: this.batchConfig["dataSendTimeout"],
      success: () => {
        this.remove(dataKeys);
        this.sendTimeStamp = 0;
      },
      error: () => {
        this.sendTimeStamp = 0;
      },
    });
  }

  send() {
    if (
      this.sendTimeStamp &&
      _.now() - this.sendTimeStamp < this.batchConfig["dataSendTimeout"]
    ) {
      return;
    }
    let tabStorage = _.localStorage.get(this.tabKey);
    if (tabStorage) {
      this.sendTimeStamp = _.now();
      let tabStorageKeys = _.safeJSONParse(tabStorage) || [];
      if (tabStorageKeys.length) {
        let data = [];
        let tabList = [];
        let len =
          tabStorageKeys.length < this.batchConfig["storageLimit"]
            ? tabStorageKeys.length
            : this.batchConfig["storageLimit"];
        for (let i = 0; i < len; i++) {
          let d = _.readObjectVal(tabStorageKeys[i].dataKey);
          tabList.push(tabStorageKeys[i].dataKey);
          data.push(d);
        }
        this.request(data, tabList);
      }
    }
  }

  remove(dataKeys) {
    let tabStorage = _.localStorage.get(this.tabKey);
    if (tabStorage) {
      let tabStorageArray = _.safeJSONParse(tabStorage) || [];
      const tabStorageKeys = tabStorageArray?.map((item) => item.dataKey);
      for (let i = 0; i < dataKeys.length; i++) {
        let idx = _.indexOf(tabStorageKeys, dataKeys[i]);
        if (idx > -1) {
          tabStorageArray.splice(idx, 1);
          _.localStorage.remove(dataKeys[i]);
        }
      }
      _.localStorage.set(this.tabKey, JSON.stringify(tabStorageArray));
    }
  }

  add(data) {
    let dataKey = dataStoragePrefix + _.getRandom();
    let tabStorage = _.localStorage.get(this.tabKey);
    if (tabStorage == null) {
      tabStorage = [];
    } else {
      tabStorage = _.safeJSONParse(tabStorage) || [];
    }

    tabStorage.push({
      dataKey,
      expireTime: _.now() + this.batchConfig["sendInterval"] * 2,
    });
    _.localStorage.set(this.tabKey, JSON.stringify(tabStorage));
    _.saveObjectVal(dataKey, data);

    if (tabStorage.length > this.batchConfig["storageLimit"]) {
      let spliceData = tabStorage.slice(0, 20);
      let dataList = [];
      for (let i = 0; i < spliceData.length; i++) {
        let item = _.readObjectVal(spliceData[i].dataKey);
        dataList.push(item);
      }
      this.request(
        dataList,
        spliceData.map((item) => item.dataKey)
      );
    }
    // 无加密data
    if (data.type === "track_signup" || data.event === "H_pageview") {
      this.send();
    }
  }

  //找出过期的删除
  recycle() {
    let tabStorageKeys = _.localStorage.get(this.tabKey);
    if (tabStorageKeys) {
      let tabStorage = _.safeJSONParse(tabStorageKeys) || [];
      if (tabStorage.length) {
        let delList = [];
        for (let i = 0; i < tabStorage.length; i++) {
          if (_.now() > tabStorage[i].expireTime) {
            delList.push(tabStorage[i].dataKey);
          }
        }
        this.remove(delList);
      } else {
        let tabStorage = [];
        for (let i = 0; i < _.localStorage.length; i++) {
          let key = _.localStorage.key(i);
          if (key?.indexOf(dataStoragePrefix) === 0) {
            tabStorage.push({
              dataKey: key,
              expireTime: _.now() + this.batchConfig["sendInterval"] * 2,
            });
          }
        }
        if (tabStorage.length > 0) {
          _.localStorage.set(this.tabKey, JSON.stringify(tabStorage));
        }
      }
    }
  }
}

export { ajax, AjaxSend, ImageSend, BeaconSend, BatchSend };
