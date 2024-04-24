import { addProps } from "../common/property";
import { Log, _ } from "../common/utils";

let { location } = window;

class SiteLinker {
  constructor() {
    this.ctx = {};
    this.option = {};
    this.isInited = false;
  }

  init(ctx, option) {
    this.ctx = ctx;
    this.option = option;
    if (this.isInited) return;

    this.isInited = true;

    if (
      _.check.isObject(option) &&
      _.check.isArray(option.linker) &&
      option.linker.length > 0
    ) {
      this.setRefferId(option);
      this.addClickListen();
    } else {
      Log.log("siteLinker plugin: Please configure the linker parameter");
      return;
    }
    function resolveOption(option) {
      let l = option.length,
        arr = [];
      for (let i = 0; i < l; i++) {
        if (
          /[A-Za-z0-9]+\./.test(option[i].part_url) &&
          _.check.isBoolean(option[i].after_hash)
        ) {
          arr.push(option[i]);
        } else {
          Log.log(
            "The configuration of linker " +
              (i + 1) +
              " is not supported.Please check format"
          );
        }
      }
      return arr;
    }
    this.option = resolveOption(option.linker);
  }

  getPartUrl(part) {
    let l = this.option.length;
    if (l) {
      for (let i = 0; i < l; i++) {
        if (part.indexOf(this.option[i]["part_url"]) > -1) {
          return true;
        }
      }
    }
    return false;
  }

  getPartHash(part) {
    let l = this.option.length;
    if (l) {
      for (let i = 0; i < l; i++) {
        if (part.indexOf(this.option[i]["part_url"]) > -1) {
          return this.option[i]["after_hash"];
        }
      }
    }
    return false;
  }

  getCurrentId() {
    let accountId = this.ctx.store.getAccountId() || "";
    let firstId = this.ctx.store.getFirstId() || "";
    let urlId = firstId ? "f" + accountId : "d" + accountId;
    return _.encodeURIComponent(urlId);
  }

  rewriteUrl(url, target) {
    let reg = /([^?#]+)(\?[^#]*)?(#.*)?/;
    let arr = reg.exec(url),
      nurl = "";
    if (!arr) return;

    let host = arr[1] || "";
    let search = arr[2] || "";
    let hash = arr[3] || "";

    let idIndex;
    let hnId = "_hnsdk=" + this.getCurrentId();

    function changeHnId(str) {
      let arr = str.split("&");
      let res = [];
      _.each(arr, function (val) {
        if (val.indexOf("_hnsdk=") > -1) {
          res.push(hnId);
        } else {
          res.push(val);
        }
      });
      return res.join("&");
    }

    if (this.getPartHash(url)) {
      idIndex = hash.indexOf("_hnsdk");
      let queryIndex = hash.indexOf("?");
      if (queryIndex > -1) {
        if (idIndex > -1) {
          nurl =
            host +
            search +
            "#" +
            hash.substring(1, idIndex) +
            changeHnId(hash.substring(idIndex, hash.length));
        } else {
          nurl = host + search + "#" + hash.substring(1) + "&" + hnId;
        }
      } else {
        nurl = host + search + "#" + hash.substring(1) + "?" + hnId;
      }
    } else {
      idIndex = search.indexOf("_hnsdk");
      let hasQuery = /^\?(\w)+/.test(search);
      if (hasQuery) {
        if (idIndex > -1) {
          nurl = host + "?" + changeHnId(search.substring(1)) + hash;
        } else {
          nurl = host + "?" + search.substring(1) + "&" + hnId + hash;
        }
      } else {
        nurl = host + "?" + search.substring(1) + hnId + hash;
      }
    }

    if (target) {
      target.href = nurl;
    }
    return nurl;
  }

  getUrlId() {
    let hnId = location.href.match(/_hnsdk=([aufd][^\?\#\&\=]+)/);
    if (_.check.isArray(hnId) && hnId[1]) {
      let uid = _.decodeURIComponent(hnId[1]);
      return uid;
    } else {
      return "";
    }
  }

  setRefferId(option) {
    let accountId = this.ctx.store.getAccountId();
    let urlId = this.getUrlId();
    if (urlId === "") return false;
    let isAnonymousId = urlId.substring(0, 1) === "d";
    urlId = urlId.substring(1);

    if (urlId === accountId) return;

    if (isAnonymousId) {
      this.ctx.setDeviceUId(urlId, true);
      let firstId = this.ctx.store.getFirstId();
      if (firstId) {
        this.ctx.sendRequest({
          anonymous_id: urlId,
          account_id: accountId,
          type: "track_signup",
          event: "H_SignUp",
          properties: {},
        });
      }
    } else if (!this.ctx.store.getFirstId() || option.re_login) {
      this.ctx.setUserUId(urlId);
    }
  }

  addClickListen() {
    let clickFn = (event) => {
      let target = event.target;
      let nodeName = target.tagName?.toLowerCase();
      let parentTarget = target.parentNode;
      let parentNodeName = parentTarget?.tagName?.toLowerCase();
      let sdkUrl, sdkTarget;
      if (
        (nodeName === "a" && target.href) ||
        (parentNodeName === "a" && parentTarget.href)
      ) {
        if (nodeName === "a" && target.href) {
          sdkUrl = target.href;
          sdkTarget = target;
        } else {
          sdkUrl = parentTarget.href;
          sdkTarget = parentTarget;
        }
        let location = _.URL(sdkUrl);
        let protocol = location.protocol;
        if (protocol === "http:" || protocol === "https:") {
          if (this.getPartUrl(sdkUrl)) {
            this.rewriteUrl(sdkUrl, sdkTarget);
          }
        }
      }
    };

    _.addEvent(document, "mosedown", clickFn);
    if (
      !!window.PointerEvent &&
      "maxTouchPoints" in window.navigator &&
      window.navigator.maxTouchPoints >= 0
    ) {
      _.addEvent(document, "pointerdown", clickFn);
    }
  }
}

class PageLoad {
  constructor() {
    this.ctx = {};
    this.option = {};
    this.isInited = false;
  }

  init(ctx, option) {
    this.ctx = ctx;
    this.option = option;
    let observe = () => {
      let duration = 0;
      let p =
        window.performance ||
        window.webkitPerformance ||
        window.msPerformance ||
        window.mozPerformance;
      let { location } = window;
      let prop = {
        H_url: location.href,
        H_title: document.title,
        H_url_path: location.pathname,
        H_referrer: _.getReferrer(null, true),
      };
      if (!p) {
        Log.log("your browser not support performance API");
        return;
      } else {
        duration = this.getDuration(p) || this.getDurationCompatible(p);
        this.getPageSize(p, prop);
      }

      if (duration > 0) {
        let maxDuration = 1800;
        if (_.check.isObject(this.option) && this.option?.max_duration) {
          maxDuration = this.option?.max_duration;
        }
        duration = Number((duration / 1000).toFixed(3));
        if (
          !_.check.isNumber(maxDuration) ||
          maxDuration <= 0 ||
          duration <= maxDuration
        ) {
          prop.event_duration = duration;
        }
      }

      if (!this.isInited) {
        this.ctx.track("H_WebPageLoad", prop);
        this.isInited = true;
      }

      if (window.removeEventListener) {
        window.removeEventListener("load", observe);
      }
    };
    if (document.readyState === "complete") {
      observe();
    } else if (window.addEventListener) {
      window.addEventListener("load", observe);
    }
  }

  getPageSize(p, prop) {
    if (p.getEntries && _.check.isFunction(p.getEntries)) {
      let entries = p.getEntries();

      let totalSize = 0;
      for (let i = 0; i < entries.length; i++) {
        if ("transferSize" in entries[i]) {
          totalSize += entries[i].transferSize;
        }
      }

      if (
        _.check.isNumber(totalSize) &&
        totalSize >= 0 &&
        totalSize < 10737418240
      ) {
        prop.H_page_resource_size = Number((totalSize / 1024).toFixed(3));
      }
    }
  }

  getDurationCompatible(p) {
    let duration = 0;
    if (p.timing) {
      let t = p.timing;
      if (
        t.fetchStart === 0 ||
        !_.check.isNumber(t.fetchStart) ||
        t.domContentLoadedEventEnd === 0 ||
        !_.check.isNumber(t.domContentLoadedEventEnd)
      ) {
        Log.log("performance data parsing exception");
      } else {
        duration = t.domContentLoadedEventEnd - t.fetchStart;
      }
    }
    return duration;
  }

  getDuration(p) {
    let duration = 0;
    if (_.check.isFunction(p.getEntriesByType)) {
      let entries = p.getEntriesByType("navigation") || [{}];
      duration = (entries[0] || {}).domContentLoadedEventEnd || 0;
    }
    return duration;
  }
}

class PageLeave {
  constructor() {
    this.startTime = _.now();
    this.currentPageUrl = document.referrer;
    this.url = location.href;
    this.title = document.title || "";
    this.pageShowStatus = true;
    this.pageHiddenStatus = false;

    this.timer = null;
    this.heartbeatIntervalTime = 5000;
    this.heartbeatIntervalTimer = null;
    this.pageId = null;
    this.maxDuration = 432000;
    this.storageName = "hinasdk_pageleave_";
  }

  init(ctx, option) {
    this.ctx = ctx;

    if (option) {
      this.option = option;

      let heartbeatIntervalTime = option.heartbeat_interval_time;
      if (
        heartbeatIntervalTime &&
        _.check.isNumber(heartbeatIntervalTime * 1) &&
        heartbeatIntervalTime * 1 > 0
      ) {
        this.heartbeatIntervalTime = heartbeatIntervalTime * 1000;
      }

      let maxDuration = option.max_duration;
      if (
        maxDuration &&
        _.check.isNumber(maxDuration * 1) &&
        maxDuration * 1 > 0
      ) {
        this.maxDuration = maxDuration;
      }
    }

    this.pageId = Number(
      String(_.getRandom()).slice(2, 5) +
        String(_.getRandom()).slice(2, 4) +
        String(_.now()).slice(-4)
    );
    this.addPageLeaveEventListener();
    if (document.hidden) {
      this.pageShowStatus = false;
    } else {
      this.addHeartBeatInterval();
    }
  }

  refreshPageEndTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.timer = setTimeout(() => {
      this.pageHiddenStatus = false;
    }, 5000);
  }

  hiddenStatusHandler() {
    clearTimeout(this.timer);
    this.timer = null;
    this.pageHiddenStatus = false;
  }

  pageStartHandler() {
    this.startTime = _.now();

    if (document.hidden === true) {
      this.pageShowStatus = false;
    } else {
      this.pageShowStatus = true;
    }
    this.url = location.href;
    this.title = document.title;
  }

  pageEndHandler() {
    if (this.pageHiddenStatus) return;

    let data = this.getPageLeaveProperties();
    if (!this.pageShowStatus) delete data.event_duration;

    this.pageShowStatus = false;
    this.pageHiddenStatus = true;
    if (this.isCollectUrl(this.url)) {
      this.ctx.track("H_WebPageLeave", data);
    }

    this.refreshPageEndTimer();
    this.delHeartBeatData();
  }

  addPageLeaveEventListener() {
    this.addPageStartListener();
    this.addPageSwitchListener();
    this.addSinglePageListener();
    this.addPageEndListener();
  }

  addPageStartListener() {
    if ("onpageshow" in window) {
      _.addEvent(window, "pageshow", () => {
        this.pageStartHandler();
        this.hiddenStatusHandler();
      });
    }
  }

  addPageSwitchListener() {
    _.listenPageState({
      visible: () => {
        this.pageStartHandler();
        this.hiddenStatusHandler();
        this.addHeartBeatInterval();
      },
      hidden: () => {
        this.url = location.href;
        this.title = document.title;
        this.pageEndHandler();
        this.stopHeartBeatInterval();
      },
    });
  }

  addSinglePageListener() {
    _.mitt.prepend("urlChange", (url) => {
      if (url !== location.href) {
        this.url = url;
        this.pageEndHandler();
        this.stopHeartBeatInterval();
        this.currentPageUrl = url;
        this.pageStartHandler();
        this.hiddenStatusHandler();
        this.addHeartBeatInterval();
      }
    });
  }

  addPageEndListener() {
    _.each(["pagehide", "beforeunload", "unload"], (key) => {
      if ("on" + key in window) {
        _.addEvent(window, key, () => {
          this.pageEndHandler();
          this.stopHeartBeatInterval();
        });
      }
    });
  }

  addHeartBeatInterval() {
    if (!_.localStorage.isSupport()) return;
    this.startHeartBeatInterval();
  }

  startHeartBeatInterval() {
    if (this.heartbeatIntervalTimer) {
      this.stopHeartBeatInterval();
    }
    let collectUrlStatus = true;
    if (!this.isCollectUrl(this.url)) {
      collectUrlStatus = false;
    }

    if (collectUrlStatus) {
      this.heartbeatIntervalTimer = setInterval(() => {
        this.saveHeartBeatData();
      }, this.heartbeatIntervalTime);
      this.saveHeartBeatData("first");
    }
    this.reissueHeartBeatData();
  }

  reissueHeartBeatData() {
    let storageLen = _.localStorage.length;
    for (let i = storageLen - 1; i >= 0; i--) {
      let itemKey = _.localStorage.key(i);
      if (
        itemKey &&
        itemKey !== this.storageName + this.pageId &&
        itemKey.indexOf(this.storageName) > -1
      ) {
        let itemValue = _.readObjectVal(itemKey);
        if (
          _.check.isObject(itemValue) &&
          _.now() - itemValue.time > itemValue.heartbeat_interval_time + 5000
        ) {
          delete itemValue.heartbeat_interval_time;
          this.ctx.sendRequest(itemValue);
          this.delHeartBeatData(itemKey);
        }
      }
    }
  }

  stopHeartBeatInterval() {
    this.heartbeatIntervalTimer && clearInterval(this.heartbeatIntervalTimer);
    this.heartbeatIntervalTimer = null;
  }

  saveHeartBeatData(type) {
    let pageleaveProperties = this.getPageLeaveProperties();
    pageleaveProperties.H_time = _.now();
    if (type === "first") {
      pageleaveProperties.event_duration = 3;
    }

    let data = addProps(
      {
        type: "track",
        event: "H_WebPageLeave",
        properties: pageleaveProperties,
      },
      this.ctx
    );

    data.heartbeat_interval_time = this.heartbeatIntervalTime;
    _.saveObjectVal(this.storageName + this.pageId, data);
  }

  delHeartBeatData(storageKey) {
    if (_.localStorage.isSupport()) {
      _.localStorage.remove(storageKey || this.storageName + this.pageId);
    }
  }

  isCollectUrl(url) {
    if (_.check.isFunction(this.option?.isCollectUrl)) {
      if (_.check.isString(url)) {
        return this.option?.isCollectUrl(url);
      } else {
        return true;
      }
    }
    return true;
  }

  getPageLeaveProperties() {
    let duration = (_.now() - this.startTime) / 1000;
    if (
      !_.check.isNumber(duration) ||
      duration < 0 ||
      duration > this.maxDuration
    ) {
      duration = 0;
    }
    duration = Number(duration.toFixed(3));

    let referrer = _.getReferrer(this.currentPageUrl);
    let viewportPosition =
      document.documentElement?.scrollTop ||
      window.pageYOffset ||
      document.body?.scrollTop ||
      0;
    viewportPosition = Math.round(viewportPosition) || 0;

    let data = {
      H_title: this.title,
      H_url: this.url,
      H_url_path: _.URL(this.url).pathname,
      H_referrer_host: referrer ? _.getHostname(referrer) : "",
      H_referrer: referrer,
      H_viewport_position: viewportPosition,
    };
    if (duration) {
      data.event_duration = duration;
    }
    data = _.extend(data, this.option?.custom_props);
    return data;
  }
}

const plugin = {
  SiteLinker,
  PageLoad,
  PageLeave,
};

export default plugin;
