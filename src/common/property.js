import { _, Log, SearchKeyword } from "./utils";

function checkIsNewUser() {
  if (_.cookie.isSupport()) {
    if (_.cookie.get("hinasdk_isNewUser") != null) {
      return true;
    }
    return false;
  } else {
    if (_.memory.get("hinasdk_isNewUser") != null) {
      return true;
    }
    return false;
  }
}

/*
 *通过cookie或者memory存储加密后的data, 需要执行一次load方法
 *
 */
const HinaDataStore = {
  name: "hinasdk_crossdata",
  state: {
    deviceId: null,
    accountId: null,
    firstId: null,
    sessionId: null,
    //首次访问时间，用户属性用于触发profile_set_once接口
    firstVisitTime: _.now(),
    props: {},
    sessionIdUpdateTime: null
  },
  //首次触发事件
  isFirstTime: false,
  //首日触发事件
  isFirstDay: checkIsNewUser(),
  //第一次访问
  isFirstVisit: true,
  //是否设置第一次访问属性
  isSetFirstVisit: true,
  load() {
    let oldCookie = null;
    if (_.cookie.isSupport()) {
      this.storage = _.cookie;
    } else {
      Log.log(
        "Cookie storage is not supported, SDK internal cache has been enabled"
      );
      this.storage = _.memory;
    }

    if (!oldCookie) {
      oldCookie = this.storage.get(this.name);
    }

    if (oldCookie && _.check.isJSONString(oldCookie)) {
      this.state = _.extend({}, JSON.parse(oldCookie));
    }

    //如果不存在hinasdk_crossdata的存储数据，则说明是第一次访问sdk
    if (oldCookie) {
      this.save();
      this.isSetFirstVisit = false;
      this.isFirstVisit = false;
    } else {
      this.isSetFirstVisit = true;
      this.isFirstVisit = true;
    }

    // 第一次访问sdk必定是新用户
    if (this.isFirstVisit) {
      let date = new Date();
      let dateObj = {
        h: 23 - date.getHours(),
        m: 59 - date.getMinutes(),
        s: 59 - date.getSeconds(),
      };
      this.storage.set(
        "hinasdk_isNewUser",
        true,
        dateObj.h * 3600 + dateObj.m * 60 + dateObj.s + "s"
      );
      this.isFirstDay = true;
      this.isFirstTime = true;
    } else {
      //由于首次访问sdk会触发pageview事件，第二次触发pageview事件开始只返回false
      this.checkIsFirstTime = function (data) {
        if (data.type === "track" && data.event === "H_pageview") {
          data.properties.H_is_first_time = false;
        }
      };
    }

    if (!this.getAccountId()) {
      let uuid = _.UUID();
      this.setDeviceId(uuid);
      this.setAccountId(uuid);
    }
  },

  checkIsFirstTime(data) {
    if (data.type === "track" && data.event === "H_pageview") {
      if (checkIsNewUser() && this.isFirstTime) {
        data.properties.H_is_first_time = true;
        this.isFirstTime = false;
      } else {
        data.properties.H_is_first_time = false;
      }
    }
  },

  checkIsFirstSign(data) {
    if (data.type === "track") {
      if (checkIsNewUser() && this.isFirstDay) {
        data.properties.H_is_first_day = true;
      } else {
        this.isFirstDay = false;
        data.properties.H_is_first_day = false;
      }
    }
  },

  setDeviceId(uuid) {
    if (this.state.deviceId) {
      Log.log(
        "Current deviceId is " + this.getDeviceId() + ", it has been set"  
      );
      return;
    }
    this.set("deviceId", uuid);
  },

  setAccountId(accountId) {
    this.set("accountId", accountId);
  },

  getDeviceId() {
    return this.state.deviceId;
  },

  getAccountId() {
    return this.state.__accountId || this.state.accountId;
  },

  getFirstId() {
    return this.state.__firstId || this.state.firstId;
  },
  getSessionId() {
    return this.state.sessionId;
  },
  getSessionIdUpdateTime() {
    return this.state.sessionIdUpdateTime || this.getSessionId().split("_")[0];
  },
  setSessionId(sessionId) {
    this.set("sessionId", sessionId);
  },
  getAnonymousId() {
    let accountId = this.getAccountId();
    let firstId = this.getFirstId();
    let anonymousId = null;
    if (accountId && firstId) {
      anonymousId = firstId;
    } else {
      anonymousId = accountId;
    }
    return anonymousId;
  },

  change(name, value) {
    this.state["__" + name] = value;
  },

  set(name = "", value) {
    this.state = this.state || {};
    if (["accountId", "firstId"].indexOf(name) > -1) {
      delete this.state["__" + name];
    }
    this.state[name] = value;
    this.save();
  },

  save() {
    // cookie存于子域名中，用于跨站共享account_id
    this.storage.setDomain(this.name, JSON.stringify(this.state), null, true);
  },

  clear() {
    this.state = {};
    this.save();
  },
};

const pageInfo = {
  pageProp: {},
  currentProps: {},
  register: function (obj) {
    _.extend(pageInfo.currentProps, obj);
  },
  getPresetProperties: function () {
    let viewportHeightValue =
      window.innerHeight ||
      document.documentElement.clientHeight ||
      (document.body && document.body.clientHeight) ||
      0;
    let viewportWidthValue =
      window.innerWidth ||
      document.documentElement.clientWidth ||
      (document.body && document.body.clientWidth) ||
      0;

    let propertiesObj = {
      H_timezone_offset: new Date().getTimezoneOffset(),
      H_viewport_height: viewportHeightValue,
      H_viewport_width: viewportWidthValue,
    };
    _.extend(propertiesObj, _.info.properties());
    return propertiesObj;
  },
  getPageProperties: function () {
    _.extend(this.pageProp, _.info.pageProperties());
    return this.pageProp;
  },
  getUmtsParams: function (prefix = "", prefixAdd = "") {
    let utms = _.getUtm();
    let allUtms = {},
      otherUtms = {};
    _.each(utms, function (d, i, utms) {
      if (_.utmTypes.includes(i)) {
        allUtms[prefix + i] = utms[i];
      } else {
        otherUtms[prefixAdd + i] = utms[i];
      }
    });
    return {
      allUtms: allUtms,
      otherUtms: otherUtms,
    };
  },
};

function initLatestProps(para) {
  let latestObj = {};

  _.each(para.presetProperties, function (value, key) {
    if (key.indexOf("latest_") === -1) {
      return false;
    }
    key = key.slice(7);
    if (value) {
      let url_domain = _.getCurrentDomain(window.location.href);
      if (key !== "utm" && url_domain === "url解析失败") {
        latestObj["H_latest_" + key] = "url的domain解析失败";
      } else if (_.isReferralTraffic(document.referrer)) {
        switch (key) {
          case "traffic_source_type":
            latestObj["H_latest_traffic_source_type"] =
              SearchKeyword.getSourceFromReferrer();
            break;

          case "referrer":
            latestObj["H_latest_referrer"] = pageInfo.pageProp.referrer;
            break;

          case "search_keyword":
            if (SearchKeyword.getKeywordFromReferrer()) {
              latestObj["H_latest_search_keyword"] =
                SearchKeyword.getKeywordFromReferrer();
            }
            break;

          default:
            break;
        }
      }
    }
  });

  if (para.presetProperties.latest_utm) {
    let { allUtms, otherUtms } = pageInfo.getUmtsParams(
      "H_latest_",
      "_latest_"
    );
    if (!_.check.isEmptyObject(allUtms)) {
      _.extend(latestObj, allUtms);
    }
    if (!_.check.isEmptyObject(otherUtms)) {
      _.extend(latestObj, otherUtms);
    }
  }
  pageInfo.register(latestObj);
}

function getPresetProperties() {
  let { allUtms, otherUtms } = pageInfo.getUmtsParams("H_", "");

  let result = {
    H_is_first_day: HinaDataStore["isFirstDay"],
    H_is_first_time: HinaDataStore["isFirstTime"],
    device_id: HinaDataStore.getDeviceId(),
    anonymous_id: HinaDataStore.getAnonymousId(),
    account_id: HinaDataStore.getAccountId(),
    properties: {
      ...HinaDataStore.state["props"],
    },
  };

  _.extend(
    result.properties,
    allUtms,
    otherUtms,
    pageInfo.getPresetProperties(),
    pageInfo.getPageProperties()
  );

  return result;
}

function sendFirstProfile(setOnceProfileFn, fullReferrer, ctx) {
  if (HinaDataStore.isSetFirstVisit) {
    let { allUtms } = pageInfo.getUmtsParams("H_", "");
    let referrer = _.getReferrer(null, fullReferrer);
    setOnceProfileFn.call(
      ctx,
      _.extend({
        H_first_visit_time: _.now(),
        H_first_referrer: referrer,
        H_first_host: referrer ? _.getHostname(referrer, "取值异常") : "",
        H_first_browser_language: _.check.isString(navigator.languages[1])
          ? navigator.languages[1]?.toLowerCase()
          : "取值异常",
        H_first_traffic_source_type: SearchKeyword.getSourceFromReferrer(),
        H_first_search_keyword: SearchKeyword.getKeywordFromReferrer(),
        ...allUtms
      })
    );
    HinaDataStore.isSetFirstVisit = false;
  }
}

function addProps(p, hn) {
  let config = hn.config || {};
  let { allUtms, otherUtms } = pageInfo.getUmtsParams("H_", "");

  let data = {
    anonymous_id: HinaDataStore.getAnonymousId(),
    properties: {
      device_id: HinaDataStore.getDeviceId(),
      ...HinaDataStore.state["props"],
    },
    type: p.type,
    event: p.event,
    time: _.now(),
    _track_id: Number(
      String(_.getRandom()).slice(2, 5) +
        String(_.getRandom()).slice(2, 4) +
        String(_.now()).slice(-4)
    ),
  };

  if (HinaDataStore.getAccountId() !== HinaDataStore.getAnonymousId()) {
    data.account_id = HinaDataStore.getAccountId();
  }

  // if(config["name"]){
  //   data.properties.name = config["name"];
  // }

  // if (config["isTrackDeviceId"]) {
  //   data.device_id = HinaDataStore.getDeviceId();
  // }

  // track、track_signup
  // user_set、user_setOnce、user_add、user_unset、user_delete
  if (!p.type || p.type.slice(0, 4) !== "user") {
    data.properties = _.extend(
      data.properties,
      allUtms,
      otherUtms,
      pageInfo.currentProps,
      pageInfo.getPageProperties(),
      pageInfo.getPresetProperties(),
      p.properties
    );
  } else {
    data.properties = _.extend(data.properties, p.properties);
  }

  _.parseSuperProperties(data);

  HinaDataStore.checkIsFirstSign(data);
  HinaDataStore.checkIsFirstTime(data);

  return data;
}

function addEPMProps(p){
  let data = {
    anonymous_id: HinaDataStore.getAnonymousId(),
    session_id: _.get32RandomString(),
    properties: {
      device_id: HinaDataStore.getDeviceId(),
    },
    type: p.type,
    event: p.event,
    time: _.now(),
    _track_id: Number(
      String(_.getRandom()).slice(2, 5) +
        String(_.getRandom()).slice(2, 4) +
        String(_.now()).slice(-4)
    ),
  };

  if (HinaDataStore.getAccountId() !== HinaDataStore.getAnonymousId()) {
    data.account_id = HinaDataStore.getAccountId();
  }

  data.properties = _.extend(data.properties, _.info.epmProperties(), p.properties);

  _.parseSuperProperties(data);

  return data;
}

export {
  HinaDataStore,
  pageInfo,
  initLatestProps,
  getPresetProperties,
  sendFirstProfile,
  addProps,
  addEPMProps
};
