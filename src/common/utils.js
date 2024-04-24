// import CryptoJS from 'crypto'
import MobileDetect from 'mobile-detect'
// const MobileDetect = require('mobile-detect')

const MAX_REFERRER_STRING_LENGTH = 2000;
const PV_LIB_VERSION = "3.1.2";
const EPM_LIB_VERSION = "1.0.0";

const utmTypes = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
];

const searchTypes = [
  "www.baidu.",
  "m.baidu.",
  "m.sm.cn",
  "so.com",
  "sogou.com",
  "youdao.com",
  "google.",
  "yahoo.com/",
  "bing.com/",
  "ask.com/",
];

const socialTypes = [
  "weibo.com",
  "renren.com",
  "kaixin001.com",
  "douban.com",
  "qzone.qq.com",
  "zhihu.com",
  "tieba.baidu.com",
  "weixin.qq.com",
];

const searchKeywords = {
  baidu: ["wd", "word", "kw", "keyword"],
  google: "q",
  bing: "q",
  yahoo: "p",
  sogou: ["query", "keyword"],
  so: "q",
  sm: "q",
};

const cookieTestName = "hinasdk_domain_test";

let slice = Array.prototype.slice;
let toString = Object.prototype.toString;
let nativeForEach = Array.prototype.forEach;
let hasOwnProperty = Object.prototype.hasOwnProperty;

let { location, screen, localStorage, history, navigator } = window;

// 日志打印 需要注入showLog
class Log {
  static log() {
    if (!this.showLog) {
      return false;
    }
    // if (this.showLog === true || this.showLog === "string") {
    //   arguments[0] = _.formatJsonString(arguments[0]);
    // }
    if (typeof console === "object" && console.log) {
      try {
        return console.log.apply(console, arguments);
      } catch (e) {
        console.log(arguments[0]);
      }
    }
  }
}

// 检查sdk参数
class SDKDebug {
  static checkProtocolIsSame(url1, url2) {
    try {
      if (_.URL(url1).protocol !== _.URL(url2).protocol) {
        return false;
      }
    } catch (error) {
      Log.log("The _.URL method is not supported");
      return false;
    }
    return true;
  }
  static checkServerUrl() {
    if (!_.check.isString(this.serverUrl) || _.trim(this.serverUrl) === "") {
      Log.log(
        "当前 serverUrl 为空或不正确，只在控制台打印日志，network 中不会发数据，请配置正确的 serverUrl！"
      );
      return false;
    } else if (
      _.check.isString(this.serverUrl) &&
      this.serverUrl !== "" &&
      !this.checkProtocolIsSame(this.serverUrl, location.href)
    ) {
      Log.log(
        "SDK 检测到您的数据发送地址和当前页面地址的协议不一致，建议您修改成一致的协议。\n因为：1、https 下面发送 http 的图片请求会失败。2、http 页面使用 https + ajax 方式发数据，在 ie9 及以下会丢失数据。"
      );
    }
    return true;
  }
  static checkAjax(url) {
    if (url === this.serverUrl) {
      return false;
    }
    if (
      _.check.isString(url) &&
      url !== "" &&
      !this.checkProtocolIsSame(url, location.href)
    ) {
      Log.log(
        "SDK 检测到您的数据发送地址和当前页面地址的协议不一致，建议您修改成一致的协议。因为 http 页面使用 https + ajax 方式发数据，在 ie9 及以下会丢失数据。"
      );
    }
  }
}

let _ = {};

_.MAX_REFERRER_STRING_LENGTH = MAX_REFERRER_STRING_LENGTH;
_.PV_LIB_VERSION = PV_LIB_VERSION;
_.EPM_LIB_VERSION = EPM_LIB_VERSION;
_.utmTypes = utmTypes;
_.searchTypes = searchTypes;
_.socialTypes = socialTypes;
_.searchKeywords = searchKeywords;

_.each = function (obj, iterator, context) {
  if (obj === null) {
    return;
  }
  if (nativeForEach && obj.forEach === nativeForEach) {
    obj.forEach(iterator, context);
  } else if (obj.length === +obj.length) {
    for (let i = 0, l = obj.length; i < l; i++) {
      if (i in obj && iterator.call(context, obj[i], i, obj) === false) {
        return;
      }
    }
  } else {
    for (let key in obj) {
      if (hasOwnProperty.call(obj, key)) {
        if (iterator.call(context, obj[key], key, obj) === false) {
          return;
        }
      }
    }
  }
};

_.map = function (obj, iterator) {
  let results = [];
  if (obj == null) {
    return results;
  }
  if (Array.prototype.map && obj.map === Array.prototype.map) {
    return obj.map(iterator);
  }
  _.each(obj, function (value, index, list) {
    results.push(iterator(value, index, list));
  });
  return results;
};

_.extend = function (obj) {
  _.each(slice.call(arguments, 1), function (source) {
    for (let prop in source) {
      if (source[prop] !== void 0) {
        if (
          (_.check.isString(source[prop]) || _.check.isDate(source[prop])) &&
          _.transformUTCTime(source[prop])
        ) {
          obj[prop] = _.transformUTCTime(source[prop]);
        } else {
          obj[prop] = source[prop];
        }
      }
    }
  });
  return obj;
};

_.transformUTCTime = function (timeString) {
  const UTCTimeRegex = /^\d{4}-\d{2}-\d{2}(?: |T)\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
  if (
    _.check.isDate(timeString) ||
    timeString?.includes("GMT") ||
    UTCTimeRegex.test(timeString)
  ) {
    const date = new Date(timeString);
    date.setHours(date.getHours() - date.getTimezoneOffset() / 60);
    const formattedDateString = date
      .toISOString()
      .replace("T", " ")
      .replace("Z", " ")
      .slice(0, -5);
    return formattedDateString;
  }

  return false;
};

_.indexOf = function (arr, target) {
  let indexof = arr.indexOf;
  if (indexof) {
    return indexof.call(arr, target);
  } else {
    for (let i = 0; i < arr.length; i++) {
      if (target === arr[i]) {
        return i;
      }
    }
    return -1;
  }
};

_.trim = function (str) {
  return str.replace(/(^[\s\uFEFF\xA0]+)|([\s\uFEFF\xA0]+$)/g, "");
};

_.arrayify = function (maybeArray) {
  return Array.isArray(maybeArray) ? maybeArray : [maybeArray];
};

_.isNil = function (obj) {
  return obj === null || obj === undefined;
}

_.formatDate = function (d) {
  function pad(n) {
    return n < 10 ? "0" + n : n;
  }
  function padMilliseconds(n) {
    if (n < 10) {
      return "00" + n;
    } else if (n < 100) {
      return "0" + n;
    } else {
      return n;
    }
  }
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    " " +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes()) +
    ":" +
    pad(d.getSeconds()) +
    "." +
    padMilliseconds(d.getMilliseconds())
  );
};

_.formatTimeZone = function (d, i) {
  if (typeof i !== "number") return d;
  let len = d.getTime();
  let offset = d.getTimezoneOffset() * 60000;
  let utcTime = len + offset;
  return new Date(utcTime + 3600000 * i);
};

_.formatJsonString = function (obj) {
  try {
    return JSON.stringify(obj, null, 8);
  } catch (e) {
    return JSON.stringify(obj);
  }
};

_.searchObjDate = function (o, i) {
  if (_.check.isObject(o) || _.check.isArray(o)) {
    _.each(o, function (a, b) {
      if (_.check.isObject(a) || _.check.isArray(a)) {
        _.searchObjDate(o[b], i);
      } else {
        if (_.check.isDate(a)) {
          o[b] = _.formatDate(_.formatTimeZone(a, i));
        }
      }
    });
  }
};

_.paramType = function (param) {
  return Object.prototype.toString
    .call(param)
    .replace("[object ", "")
    .replace("]", "");
};

_.check = {
  isUndefined: function (obj) {
    return obj === void 0;
  },

  isObject: function (obj) {
    return toString.call(obj) === "[object Object]" && obj !== null;
  },

  isEmptyObject: function (obj) {
    if (_.check.isObject(obj)) {
      for (let key in obj) {
        if (hasOwnProperty.call(obj, key)) {
          return false;
        }
      }
      return true;
    }
    return false;
  },

  isArray: function (obj) {
    return toString.call(obj) === "[object Array]";
  },

  isString: function (obj) {
    return toString.call(obj) === "[object String]";
  },

  isDate: function (obj) {
    return toString.call(obj) === "[object Date]";
  },

  isNumber: function (obj) {
    return toString.call(obj) === "[object Number]";
  },

  isBoolean: function (obj) {
    return toString.call(obj) === "[object Boolean]";
  },

  isFunction: function (obj) {
    if (!obj) {
      return false;
    }
    let type = Object.prototype.toString.call(obj);
    return type === "[object Function]" || type === "[object AsyncFunction]";
  },

  isJSONString: function (str) {
    try {
      JSON.parse(str);
    } catch (e) {
      return false;
    }
    return true;
  },

  isElement: function (arg) {
    return !!(arg && arg.nodeType === 1);
  },
};

_.UUID = (function () {
  let T = function () {
    let d = 1 * new Date();
    let i = 0;
    while (d === 1 * new Date()) {
      i++;
    }
    return d.toString(16) + i.toString(16);
  };
  let R = function () {
    return Math.random().toString(16).replace(".", "");
  };
  let UA = function () {
    let ua = navigator.userAgent;
    let i;
    let ch;
    let buffer = [];
    let ret = 0;
    function xor(result, byteArray) {
      let j;
      let tmp = 0;
      for (j = 0; j < byteArray.length; j++) {
        tmp |= buffer[j] << (j * 8);
      }
      return result ^ tmp;
    }
    for (i = 0; i < ua.length; i++) {
      ch = ua.charCodeAt(i);
      buffer.unshift(ch & 0xff);
      if (buffer.length >= 4) {
        ret = xor(ret, buffer);
        buffer = [];
      }
    }
    if (buffer.length > 0) {
      ret = xor(ret, buffer);
    }
    return ret.toString(16);
  };
  return function () {
    let se = String(screen.height * screen.width);
    if (se && /\d{5,}/.test(se)) {
      se = se.toString(16);
    } else {
      se = String(Math.random() * 31242)
        .replace(".", "")
        .slice(0, 8);
    }
    let val = T() + "-" + R() + "-" + UA() + "-" + se + "-" + T();
    if (val) {
      return val;
    } else {
      return (
        String(Math.random()) +
        String(Math.random()) +
        String(Math.random())
      ).slice(2, 15);
    }
  };
})();
// getReferrer 获取当前页面的referrer
_.getReferrer = function (targetReferrer) {
  let referrer = targetReferrer || document.referrer;
  if (typeof referrer !== "string") {
    return "referrer exception" + String(referrer);
  }
  if (referrer.indexOf("https://www.baidu.com/") === 0) {
    referrer = referrer.split("?")[0];
  }
  referrer = referrer.slice(0, MAX_REFERRER_STRING_LENGTH);
  return typeof referrer === "string" ? referrer : "";
};

// getCookielDomain 获取cookie的domain
_.getCookielDomain = function (hostname) {
  hostname = hostname || location.hostname;
  if (
    !(
      _.check.isString(hostname) &&
      hostname.match(/^[a-zA-Z0-9\u4e00-\u9fa5\-\.]+$/)
    )
  ) {
    hostname = "";
  }

  let splitResult = hostname.split(".");
  if (
    _.check.isArray(splitResult) &&
    splitResult.length >= 2 &&
    !/^(\d+\.)+\d+$/.test(hostname)
  ) {
    let domainStr = "." + splitResult.splice(splitResult.length - 1, 1);
    while (splitResult.length > 0) {
      domainStr =
        "." + splitResult.splice(splitResult.length - 1, 1) + domainStr;
      document.cookie = cookieTestName + "=true; path=/; domain=" + domainStr;

      if (document.cookie.indexOf(cookieTestName + "=true") !== -1) {
        let nowDate = new Date();
        nowDate.setTime(nowDate.getTime() - 1000);

        document.cookie =
          cookieTestName +
          "=true; expires=" +
          nowDate.toGMTString() +
          "; path=/; SameSite=Lax; domain=" +
          domainStr;

        return domainStr;
      }
    }
  }
  return "";
};

// getCurrentDomain 获取当前页面的domain
_.getCurrentDomain = function (url) {
  let cookieDomain = _.getCookielDomain();
  if (url === "" || cookieDomain === "") {
    return "url解析失败";
  } else {
    return cookieDomain;
  }
};

_.hashCode = function (str) {
  if (typeof str !== "string") {
    return 0;
  }
  let hash = 0;
  let char = null;
  if (str.length === 0) {
    return hash;
  }
  for (let i = 0; i < str.length; i++) {
    char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
};

_.base64Decode = function (str) {
  let result = "";
  try {
    result = decodeURIComponent(escape(atob(str)));
  }
  catch (e) {
    result = str;
  }
  return result;
};

_.base64Encode = function (str) {
  let result = "";
  try {
    result = btoa(unescape(encodeURIComponent(str)));
  } catch (e) {
    result = str;
  }
  return result;
};

_.decodeURIComponent = function (val) {
  let result = "";
  try {
    result = decodeURIComponent(val);
  } catch (e) {
    result = val;
  }
  return result;
};

_.encodeURIComponent = function (val) {
  let result = "";
  try {
    result = encodeURIComponent(val);
  } catch (e) {
    result = val;
  }
  return result;
};

_.cookie = {
  get: function (name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(";");
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === " ") {
        c = c.substring(1, c.length);
      }
      if (c.indexOf(nameEQ) === 0) {
        return _.decodeURIComponent(c.substring(nameEQ.length, c.length));
      }
    }
    return null;
  },

  set: function (
    name,
    value,
    days,
    cross_subdomain,
    cookie_samesite,
    is_secure,
    domain
  ) {
    let cdomain = domain,
      expires = "",
      secure = "",
      samesite = "";
    days = days == null ? 73000 : days;

    if (days !== 0) {
      let date = new Date();
      if (String(days).slice(-1) === "s") {
        date.setTime(date.getTime() + Number(String(days).slice(0, -1)) * 1000);
      } else {
        date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      }

      expires = "; expires=" + date.toGMTString();
    }
    if (_.check.isString(cookie_samesite) && cookie_samesite !== "") {
      samesite = "; SameSite=" + cookie_samesite;
    }
    if (is_secure) {
      secure = "; secure";
    }

    function getValid(data) {
      if (data) {
        return data.replace(/\r\n/g, "");
      } else {
        return false;
      }
    }
    let valid_name = "";
    let valid_value = "";
    let valid_domain = "";
    if (name) {
      valid_name = getValid(name);
    }
    if (value && _.check.isString(value)) {
      valid_value = getValid(value);
    } else {
      valid_value = value;
    }
    if (cdomain) {
      valid_domain = getValid(cdomain);
    }
    if (valid_name && valid_value) {
      document.cookie =
        valid_name +
        "=" +
        encodeURIComponent(valid_value) +
        expires +
        "; path=/" +
        valid_domain +
        samesite +
        secure;
    }
  },
  setDomain: function (name, value, days, cross_subdomain) {
    let cdomain = "";
    cross_subdomain = _.check.isUndefined(cross_subdomain)
      ? true
      : cross_subdomain;

    if (cross_subdomain) {
      let domain = _.getCurrentDomain(location.href);
      if (domain === "url解析失败") {
        domain = "";
      }
      cdomain = domain ? "; domain=" + domain : "";
    }
    return this.set(name, value, days, cross_subdomain, null, null, cdomain);
  },
  remove: function (name, cross_subdomain) {
    this.set(name, "1", -1, cross_subdomain);
  },
  isSupport: function (testKey, testValue) {
    testKey = testKey || "cookie_support_test";
    testValue = testValue || "1";
    let self = this;

    function accessNormal() {
      self.set(testKey, testValue);
      let val = self.get(testKey);
      if (val !== testValue) return false;
      self.remove(testKey);
      return true;
    }
    return navigator.cookieEnabled && accessNormal();
  },
};

_.localStorage = {
  get: function (key) {
    return localStorage.getItem(key);
  },
  parse: function (key) {
    let storedValue;
    try {
      storedValue = JSON.parse(_.localStorage.get(key)) || null;
    } catch (err) {
      Log.log("parse localStorage failed");
    }
    return storedValue;
  },
  set: function (key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      Log.log("localStorage is not support");
    }
  },
  remove: function (key) {
    localStorage.removeItem(key);
  },
  isSupport: function () {
    let supported = true;
    try {
      let supportName = "__localStorageSupport__";
      let val = "testIsSupportStorage";
      _.localStorage.set(supportName, val);
      if (_.localStorage.get(supportName) !== val) {
        supported = false;
      }
      _.localStorage.remove(supportName);
    } catch (err) {
      supported = false;
    }
    return supported;
  },
  key: function (key) {
    return localStorage.key(key);
  },
  length: localStorage.length,
};

_.memory = {
  data: {},
  get: function (name) {
    let result = this.data[name];
    if (_.check.isUndefined(result)) return null;
    if (!_.check.isUndefined(result.expireTime)) {
      if (result.expireTime < _.now()) {
        return null;
      }
      return result.value;
    }
    return result;
  },
  set: function (name, value, expires) {
    if (expires) {
      let nowTime = _.now();
      let expireTime;
      // ns ==> n秒
      if (String(expires).slice(-1) === "s") {
        expireTime = nowTime + Number(String(expires).slice(0, -1)) * 1000;
      } else {
        // n ==> n天
        expireTime = nowTime + expires * 24 * 60 * 60 * 1000;
      }
      this.data[name] = {
        value: value,
        expireTime: expireTime,
      };
    }
    this.data[name] = value;
  },
  setDomain: function (name, value, expires) {
    this.set(name, value, expires);
  },
};

_.now = function () {
  if (Date.now && _.check.isFunction(Date.now)) {
    return Date.now();
  }
  return new Date().getTime();
};

// _.unique = function (arr) {
//   let temp,
//     n = [],
//     o = {};
//   for (let i = 0; i < arr.length; i++) {
//     temp = arr[i];
//     if (!(temp in o)) {
//       o[temp] = true;
//       n.push(temp);
//     }
//   }
//   return n;
// };

_.getRandom = function () {
  let today = new Date();
  let seed = today.getTime();
  let num = Math.floor(Math.random() * 1000000);
  return seed + "_" + num;
};

_.get32RandomString = function () {
  var characters =
    "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
  var result = "";
  for (var i = 0; i < 32; i++) {
    var randomIndex = Math.floor(Math.random() * characters.length);
    result += characters[randomIndex];
  }
  return result;
};

_.safeJSONParse = function (str) {
  let val = null;
  try {
    val = JSON.parse(str);
  } catch (e) {
    return str;
  }
  return val;
};

_.saveObjectVal = function (name, value, secretKey) {
  if (!_.check.isString(value)) {
    value = JSON.stringify(value);
  }
  if (secretKey) {
    //加密
  }
  _.localStorage.set(name, value);
};
_.readObjectVal = function (name, secretKey) {
  let value = _.localStorage.get(name);
  if (!value) return null;
  if (secretKey) {
    //解密
  }
  return _.safeJSONParse(value);
};

_.stripEmptyProperties = function (p) {
  let ret = {};
  _.each(p, function (v, k) {
    if (_.check.isString(v) && v.length > 0) {
      ret[k] = v;
    }
  });
  return ret;
};

// 获取预置属性
_.info = {
  os: function () {
    let a = navigator.userAgent;
    if (/Windows/i.test(a)) {
      if (/Phone/.test(a) || /WPDesktop/.test(a)) {
        return "Windows Phone";
      }
      return "Windows";
    } else if (/(iPhone|iPad|iPod)/.test(a) && !window.MSStream) {
      return "iOS";
    } else if (/Android/.test(a)) {
      return "Android";
    } else if (/(BlackBerry|PlayBook|BB10)/i.test(a)) {
      return "BlackBerry";
    } else if (/Mac/i.test(a)) {
      return "Mac OS X";
    } else if (/Linux/.test(a)) {
      return "Linux";
    } else if (/CrOS/.test(a)) {
      return "Chrome OS";
    } else {
      return "取值异常";
    }
  },
  browser: function () {
    let browser = { type: "", version: "" };
    try {
      let ua = navigator.userAgent?.toLowerCase();
      let versionMatch = [];
      if (ua.match(/baidubrowser/) !== null) {
        browser["type"] = "baidu";
        versionMatch.push(/baidubrowser\/([\d.]+)/);
      } else if (ua.match(/bidubrowser/) !== null) {
        browser["type"] = "baidu";
        versionMatch.push(/bidubrowser\/([\d.]+)/);
      } else if (ua.match(/edg/) !== null) {
        browser["type"] = "edge";
        versionMatch.push(/edg\/([\d.]+)/);
      } else if (ua.match(/edgios/) !== null) {
        browser["type"] = "edge";
        versionMatch.push(/edgios\/([\d.]+)/);
      } else if (ua.match(/liebaofast/) !== null) {
        browser["type"] = "liebao";
        versionMatch.push(/liebaofast\/([\d.]+)/);
      } else if (ua.match(/sogoumobilebrowser/) !== null) {
        browser["type"] = "sogou";
        versionMatch.push(/sogoumobilebrowser\/([\d.]+)/);
      } else if (ua.match(/lbbrowser/) !== null) {
        browser["type"] = "liebao";
        versionMatch.push(/lbbrowser\/([\d.]+)/);
      } else if (ua.match(/crios/) !== null) {
        browser["type"] = "chrome";
        versionMatch.push(/crios\/([\d.]+)/);
      } else if (ua.match(/qihoobrowser/) !== null) {
        browser["type"] = "360";
        versionMatch.push(/qihoobrowser\/([\d.]+)/);
      } else if (ua.match(/mxios/) !== null) {
        browser["type"] = "maxthon";
        versionMatch.push(/mxios\/([\d.]+)/);
      } else if (ua.match(/fxios/) !== null) {
        browser["type"] = "firefox";
        versionMatch.push(/fxios\/([\d.\w]+)/);
      } else if (ua.match(/edge/) !== null) {
        browser["type"] = "edge";
        versionMatch.push(/edge\/([\d.]+)/);
      } else if (ua.match(/metasr/) !== null) {
        browser["type"] = "sogou";
        versionMatch.push(/metasr ([\d.]+)/);
      } else if (ua.match(/micromessenger/) !== null) {
        browser["type"] = "micromessenger";
        versionMatch.push(/micromessenger\/([\d.]+)/);
      } else if (ua.match(/mqqbrowser/) !== null) {
        browser["type"] = "qq";
        versionMatch.push(/mqqbrowser\/([\d.]+)/);
      } else if (ua.match(/qqbrowserlite/) !== null) {
        browser["type"] = "qq";
        versionMatch.push(/qqbrowserlite\/([\d.]+)/);
      } else if (ua.match(/tencenttraveler/) !== null) {
        browser["type"] = "qq";
        versionMatch.push(/tencenttraveler\/([\d.]+)/);
      } else if (ua.match(/qqbrowser/) !== null) {
        browser["type"] = "qq";
        versionMatch.push(/qqbrowser\/([\d.]+)/);
      } else if (ua.match(/maxthon/) !== null) {
        browser["type"] = "maxthon";
        versionMatch.push(/maxthon\/([\d.]+)/);
      } else if (ua.match(/ubrowser/) !== null) {
        browser["type"] = "uc";
        versionMatch.push(/ubrowser\/([\d.]+)/);
      } else if (ua.match(/ucbrowser/) !== null) {
        browser["type"] = "uc";
        versionMatch.push(/ucbrowser\/([\d.]+)/);
      } else if (ua.match(/firefox/) !== null) {
        browser["type"] = "firefox";
        versionMatch.push(/firefox\/([\d.]+)/);
      } else if (ua.match(/opera/) !== null) {
        browser["type"] = "opera";
        versionMatch.push(/opera\/([\d.]+)/);
      } else if (ua.match(/opr/) !== null) {
        browser["type"] = "opera";
        versionMatch.push(/opr\/([\d.]+)/);
      } else if (ua.match(/chrome/) !== null) {
        browser["type"] = "chrome";
        versionMatch.push(/chrome\/([\d.]+)/);
      } else if (ua.match(/safari/) !== null) {
        browser["type"] = "safari";
        versionMatch.push(/version\/([\d.]+)/);
      } else if (ua.match(/trident/) !== null || ua.match(/msie/) !== null) {
        browser["type"] = "ie";
      }

      if (browser["type"] === "ie") {
        let tridentVersion = ua.match(/trident\/([\d.]+)/)
          ? ua.match(/trident\/([\d.]+)/)[1]
          : "";
        let msieVersion = ua.match(/msie ([\d.]+)/)
          ? ua.match(/msie ([\d.]+)/)[1]
          : "";

        if (tridentVersion !== "") {
          browser["version"] = String(parseInt(tridentVersion) + 4);
        } else if (msieVersion !== "") {
          browser["version"] = msieVersion;
        }
      } else if (versionMatch) {
        browser["version"] = ua.match(versionMatch[0])
          ? ua.match(versionMatch[0])[1]
          : "";
      }
    } catch (e) {
      browser.type = "取值异常";
      Log.log("getting browser info failed due to ", e);
    }
    return browser;
  },
  // 获取设备品牌
  modelInfo: function() {
    const md = new MobileDetect(navigator.userAgent)
    const os = md.os();
    if (os === "iOS") {
      return md.mobile();
    } else if (os === "AndroidOS") {
      return md.mobile();
    } else {
      // Mac
      const mac = navigator.userAgent.match(/Mac/);
      if (mac) {
        return mac[0];
      }
      // Windows
      const windows = navigator.userAgent.match(/Windows/);
      if (windows) {
        return windows[0];
      }
      // Linux
      const linux = navigator.userAgent.match(/Linux/);
      if (linux) {
        return linux[0];
      }
      return "取值异常";


    }

  },
  // 获取系统版本
  osVersion: function () {
    let a = navigator.userAgent;
    if (/Windows/i.test(a)) {
      let reg = /Windows NT ([\d.]+)/;
      return a.match(reg) ? a.match(reg)[1] : "";
    } else if (/(iPhone|iPad|iPod)/.test(a) && !window.MSStream) {
      let reg = /OS ([\d_]+)/;
      return a.match(reg) ? a.match(reg)[1].replace(/_/g, ".") : "";
    } else if (/Android/.test(a)) {
      let reg = /Android ([\d.]+)/;
      return a.match(reg) ? a.match(reg)[1] : "";
    } else if (/Mac/i.test(a)) {
      let reg = /Mac OS X ([\d_]+)/;
      return a.match(reg) ? a.match(reg)[1].replace(/_/g, ".") : "";
    } else {
      return "";
    }
  },
  properties: function (prop) {
    let browserInfo = _.info.browser();
    return _.extend(
      {
        H_os: _.info.os(),
        H_os_version: _.info.osVersion(), // 获取系统版本
        H_lib_version: _.PV_LIB_VERSION,
        H_lib: "js",
        H_lib_method: "code",
        H_screen_height: Number(screen.height) || 0,
        H_screen_width: Number(screen.width) || 0,
        H_browser: browserInfo.type,
        H_browser_version: browserInfo.version,
        H_network_type: _.info.networkType(),
        H_language: _.check.isString(navigator.language)
          ? navigator.language?.toLowerCase()
          : "取值异常",
        H_model: _.info.modelInfo(),
      },
      prop
    );
  },
  epmProperties: function () {
    return this.properties({
      H_lib_version: _.EPM_LIB_VERSION,
      H_url: location.href,
      H_title: document.title,
    });
  },
  pageProperties: function () {
    let referrer = _.getReferrer();
    let url_domain = _.getCurrentDomain(location.href);
    return _.stripEmptyProperties({
      H_referrer: referrer,
      H_referrer_host: referrer ? _.getHostname(referrer) : "",
      H_url: location.href,
      H_url_host: _.getHostname(location.url, "url_host取值异常"),
      H_url_domain: url_domain,
      H_url_path: location.pathname,
      H_title: document.title,
    });
  },
  getElementInfo: function (target, isCollectInputContent) {
    if (!_.check.isElement(target)) return {};
    let tagName = target.tagName?.toLowerCase();
    let props = {
      H_element_type: tagName,
      H_element_name: target.getAttribute("name"),
      H_element_id: target.getAttribute("id"),
      H_element_target_url: target.getAttribute("href"),
      H_element_class_name: _.check.isString(target.className)
        ? target.className
        : null,
      H_element_content: _.getElementContent(
        target,
        tagName,
        isCollectInputContent
      ),
    };

    return _.stripEmptyProperties(props);
  },
  networkType: function () {
    if (navigator.connection === undefined) return "unknown";
    let connection = navigator.connection;
    if (connection.effectiveType) {
      return connection.effectiveType;
    } else if (connection.type) {
      return connection.type;
    }
    return "取值异常";

  }
};

_.getElementContent = function (
  target,
  tagName,
  isCollectInputContent = false
) {
  if (tagName === "input") {
    if (["button", "submit"].includes(target.type) || isCollectInputContent) {
      return target.value || "";
    }
    return "";
  } else {
    let textContent = "";
    let elementContent = "";
    if (target.textContent) {
      textContent = _.trim(target.textContent);
    } else if (target.innerText) {
      textContent = _.trim(target.innerText);
    }
    if (textContent) {
      textContent = textContent
        .replace(/[\r\n]/g, " ")
        .replace(/[ ]+/g, " ")
        .substring(0, 255);
    }
    elementContent = textContent || "";
    return elementContent;
  }
};

_.getHostname = function (url, defaultValue) {
  if (!defaultValue || typeof defaultValue !== "string") {
    defaultValue = "hostname解析异常";
  }
  if (!url) {
    return defaultValue;
  }
  let hostname = null;
  try {
    hostname = _.URL(url).hostname;
  } catch (e) {
    Log.log("getHostname传入的url参数不合法！");
  }
  return hostname || defaultValue;
};

_.isReferralTraffic = function (referrer) {
  referrer = referrer || document.referrer;
  if (referrer === "") {
    return true;
  }

  return _.getCookielDomain(_.getHostname(referrer)) !== _.getCookielDomain();
};

_.getUtm = function () {
  let params = {};
  _.each(utmTypes, function (kwkey) {
    let kw = _.getQueryParam(location.href, kwkey);
    if (kw.length) {
      params[kwkey] = kw;
    }
  });
  return params;
};

_.getQueryParam = function (url, key) {
  key = key.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
  url = _.decodeURIComponent(url);
  let regexS = "[\\?&]" + key + "=([^&#]*)",
    regex = new RegExp(regexS),
    results = regex.exec(url);
  if (
    results === null ||
    (results && typeof results[1] !== "string" && results[1].length)
  ) {
    return "";
  } else {
    return _.decodeURIComponent(results[1]);
  }
};

//对称加密后续
// _.createString = function (length) {
//   let expect = length;
//   let str = Math.random().toString(36).substr(2);
//   while (str.length < expect) {
//       str += Math.random().toString(36).substr(2);
//   }
//   str = str.substr(0, length);
//   return str;
// };

// _.createAesKey = function () {
//   return _.createString(16);
// };

// _.generateEncryptyData = function (text, secretKey) {

//   if (typeof secretKey === 'undefined') {
//       return text;
//   }

//   let pkey = secretKey['publicKey'];
//   let v = secretKey['version'];

//   if (typeof pkey === 'undefined' || typeof v === 'undefined') {
//       return text;
//   }

//   if (typeof CryptoJS === 'undefined' || typeof JSEncrypt === 'undefined') {
//       return text;
//   }
//   let strKey = _.createAesKey();
//   try {
//       let key = CryptoJS.enc.Utf8.parse(strKey);
//       let data = CryptoJS.enc.Utf8.parse(JSON.stringify(text));
//       let aesStr = CryptoJS.AES.encrypt(data, key, { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }).toString();
//       let encrypt = new JSEncrypt();
//       encrypt.setPublicKey(pkey);
//       let rsaStr = encrypt.encrypt(strKey);
//       if (rsaStr === false) {
//           Log.w('encryption failed');
//           return text;
//       }
//       return {
//           pkv: v,
//           ekey: rsaStr,
//           payload: aesStr
//       };
//   } catch (e) {
//       Log.w('encryption failed');
//   }
//   return text;
// };

// dom相关
class DomElementInfo {
  constructor(dom) {
    this.ele = dom;
  }

  addClass(para) {
    let classes = " " + this.ele.className + " ";
    if (classes.indexOf(" " + para + " ") === -1) {
      this.ele.className =
        this.ele.className + (this.ele.className === "" ? "" : " ") + para;
    }
    return this;
  }

  removeClass(para) {
    let classes = " " + this.ele.className + " ";
    if (classes.indexOf(" " + para + " ") !== -1) {
      this.ele.className = classes.replace(" " + para + " ", " ").slice(1, -1);
    }
    return this;
  }

  hasClass(para) {
    let classes = " " + this.ele.className + " ";
    if (classes.indexOf(" " + para + " ") !== -1) {
      return true;
    } else {
      return false;
    }
  }

  attr(key, value) {
    if (typeof key === "string" && _.check.isUndefined(value)) {
      return this.ele.getAttribute(key);
    }
    if (typeof key === "string") {
      value = String(value);
      this.ele.setAttribute(key, value);
    }
    return this;
  }

  offset() {
    let rect = this.ele.getBoundingClientRect();
    if (rect.width || rect.height) {
      let doc = this.ele.ownerDocument;
      let docElem = doc.documentElement;

      return {
        top: rect.top + window.pageYOffset - docElem.clientTop,
        left: rect.left + window.pageXOffset - docElem.clientLeft,
      };
    } else {
      return {
        top: 0,
        left: 0,
      };
    }
  }

  getSize() {
    if (!window.getComputedStyle) {
      return {
        width: this.ele.offsetWidth,
        height: this.ele.offsetHeight,
      };
    }
    try {
      let bounds = this.ele.getBoundingClientRect();
      return {
        width: bounds.width,
        height: bounds.height,
      };
    } catch (e) {
      return {
        width: 0,
        height: 0,
      };
    }
  }

  getStyle(value) {
    if (this.ele.currentStyle) {
      return this.ele.currentStyle[value];
    } else {
      return this.ele.ownerDocument.defaultView
        .getComputedStyle(this.ele, null)
        .getPropertyValue(value);
    }
  }

  wrap(elementTagName) {
    let ele = document.createElement(elementTagName);
    this.ele.parentNode.insertBefore(ele, this.ele);
    ele.appendChild(this.ele);
    return _.getDomElementInfo(ele);
  }

  getCssStyle(prop) {
    let result = this.ele.style.getPropertyValue(prop);
    if (result) {
      return result;
    }
    let rules = null;
    if (typeof window.getMatchedCSSRules === "function") {
      rules = window.getMatchedCSSRules(this.ele);
    }
    if (!rules || !_.check.isArray(rules)) {
      return null;
    }
    for (let i = rules.length - 1; i >= 0; i--) {
      let r = rules[i];
      result = r.style.getPropertyValue(prop);
      if (result) {
        return result;
      }
    }
  }

  sibling(cur, dir) {
    while ((cur = cur[dir]) && cur.nodeType !== 1) { }
    return cur;
  }

  next() {
    return this.sibling(this.ele, "nextSibling");
  }
  prev() {
    return this.sibling(this.ele, "previousSibling");
  }

  siblingsFn(n, elem) {
    let matched = [];

    for (; n; n = n.nextSibling) {
      if (n.nodeType === 1 && n !== elem) {
        matched.push(n);
      }
    }

    return matched;
  }

  siblings() {
    return this.siblingsFn((this.ele.parentNode || {}).firstChild, this.ele);
  }

  children() {
    return this.siblingsFn(this.ele.firstChild);
  }

  parent() {
    let parent = this.ele.parentNode;
    parent = parent && parent.nodeType !== 11 ? parent : null;
    return _.getDomElementInfo(parent);
  }

  previousElementSibling() {
    let el = this.ele;
    if ("previousElementSibling" in document.documentElement) {
      return _.getDomElementInfo(el.previousElementSibling);
    } else {
      while ((el = el.previousSibling)) {
        if (el.nodeType === 1) {
          return _.getDomElementInfo(el);
        }
      }
      return _.getDomElementInfo(null);
    }
  }

  getSameTypeSiblings() {
    let element = this.ele;
    let parentNode = element.parentNode;
    let tagName = element.tagName?.toLowerCase();
    let arr = [];
    for (let i = 0; i < parentNode.children.length; i++) {
      let child = parentNode.children[i];
      if (child.nodeType === 1 && child.tagName?.toLowerCase() === tagName) {
        arr.push(parentNode.children[i]);
      }
    }
    return arr;
  }

  getParents() {
    try {
      let element = this.ele;
      if (!_.check.isElement(element)) {
        return [];
      }
      let pathArr = [element];
      if (element === null || element.parentElement === null) {
        return [];
      }
      while (element.parentElement !== null) {
        element = element.parentElement;
        pathArr.push(element);
      }
      return pathArr;
    } catch (err) {
      return [];
    }
  }
}

_.getDomElementInfo = function (dom) {
  return new DomElementInfo(dom);
};

_.addEvent = function (target, eventName, eventHandler, useCapture) {
  function fixEvent(event) {
    if (event) {
      event.preventDefault = fixEvent.preventDefault;
      event.stopPropagation = fixEvent.stopPropagation;
      event._getPath = fixEvent._getPath;
    }
    return event;
  }
  fixEvent._getPath = function () {
    let ev = this;
    return this.path || _.getDomElementInfo(ev.target).getParents();
  };

  fixEvent.preventDefault = function () {
    this.returnValue = false;
  };
  fixEvent.stopPropagation = function () {
    this.cancelBubble = true;
  };

  let registerEvent = function (element, type, handler) {
    if (useCapture === undefined && type === "click") {
      useCapture = true;
    }
    if (element && element.addEventListener) {
      element.addEventListener(
        type,
        function (e) {
          e._getPath = fixEvent._getPath;
          handler.call(this, e);
        },
        useCapture
      );
    } else {
      let ontype = "on" + type;
      let old_handler = element[ontype];
      element[ontype] = makeHandler(element, handler, old_handler, type);
    }
  };

  function makeHandler(element, new_handler, old_handlers, type) {
    let handler = function (event) {
      event = event || fixEvent(window.event);
      if (!event) {
        return undefined;
      }
      event.target = event.srcElement;

      let ret = true;
      let old_result, new_result;
      if (typeof old_handlers === "function") {
        old_result = old_handlers(event);
      }
      new_result = new_handler.call(element, event);
      if (type !== "beforeunload") {
        if (false === old_result || false === new_result) {
          ret = false;
        }
        return ret;
      }
    };
    return handler;
  }

  registerEvent.apply(null, arguments);
};

_.addCaptureEvent = function (target, eventName, eventHandler) {
  return this.addEvent(target, eventName, eventHandler, eventName === "click");
};

// 是否存在死循环引用
_.hasCircularReference = function (obj, seen = new Set()) {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  if (seen.has(obj)) {
    return true;
  }

  seen.add(obj);

  for (let key in obj) {
    if (_.hasCircularReference(obj[key], seen)) {
      return true;
    }
  }

  seen.delete(obj);

  return false;
};

_.parseSuperProperties = function (props) {
  let data = props.properties || {};
  let copyProps = JSON.parse(JSON.stringify(props));
  if (_.check.isObject(data)) {
    _.each(data, function (value, key) {
      if (_.check.isFunction(value)) {
        try {
          data[key] = value(copyProps);
          if (_.check.isFunction(data[key])) {
            Log.log("属性--" + key + " 格式不满足要求, 已被删除");
            delete data[key];
          }
        } catch (error) {
          delete data[key];
          Log.log("属性--" + key + " 格式不满足要求, 已被删除");
        }
      }
    });
  }
};

_.getURLSearchParams = function (queryString) {
  queryString = queryString || "";
  let args = {};
  let query = queryString.substring(1);
  let pairs = query.split("&");
  for (let i = 0; i < pairs.length; i++) {
    let pos = pairs[i].indexOf("=");
    if (pos === -1) continue;
    let name = pairs[i].substring(0, pos);
    let value = pairs[i].substring(pos + 1);
    name = _.decodeURIComponent(name);
    value = _.decodeURIComponent(value);
    args[name] = value;
  }
  return args;
};

_.urlParse = function (url) {
  let URLParser = function (url) {
    this._fields = {
      Username: 4,
      Password: 5,
      Port: 7,
      Protocol: 2,
      Host: 6,
      Path: 8,
      URL: 0,
      QueryString: 9,
      Fragment: 10,
    };
    this._values = {};
    this._regex =
      /^((\w+):\/\/)?((\w+):?(\w+)?@)?([^\/\?:]+):?(\d+)?(\/?[^\?#]+)?\??([^#]+)?#?(\w*)/;

    if (typeof url !== "undefined") {
      this._parse(url);
    }
  };

  URLParser.prototype.setUrl = function (url) {
    this._parse(url);
  };

  URLParser.prototype._initValues = function () {
    for (let a in this._fields) {
      this._values[a] = "";
    }
  };

  URLParser.prototype.addQueryString = function (queryObj) {
    if (typeof queryObj !== "object") {
      return false;
    }
    let query = this._values.QueryString || "";
    for (let i in queryObj) {
      if (new RegExp(i + "[^&]+").test(query)) {
        query = query.replace(new RegExp(i + "[^&]+"), i + "=" + queryObj[i]);
      } else {
        if (query.slice(-1) === "&") {
          query = query + i + "=" + queryObj[i];
        } else {
          if (query === "") {
            query = i + "=" + queryObj[i];
          } else {
            query = query + "&" + i + "=" + queryObj[i];
          }
        }
      }
    }
    this._values.QueryString = query;
  };

  URLParser.prototype.getUrl = function () {
    let url = "";
    url += this._values.Origin;
    url += this._values.Port ? ":" + this._values.Port : "";
    url += this._values.Path;
    url += this._values.QueryString ? "?" + this._values.QueryString : "";
    url += this._values.Fragment ? "#" + this._values.Fragment : "";
    return url;
  };

  URLParser.prototype._parse = function (url) {
    this._initValues();

    let b = this._regex.exec(url);
    if (!b) {
      Log.i("URLParser::_parse -> Invalid URL");
    }

    let urlTmp = url.split("#");
    let urlPart = urlTmp[0];
    let hashPart = urlTmp.slice(1).join("#");
    b = this._regex.exec(urlPart);
    for (let c in this._fields) {
      if (typeof b[this._fields[c]] !== "undefined") {
        this._values[c] = b[this._fields[c]];
      }
    }
    this._values["Hostname"] = this._values["Host"].replace(/:\d+$/, "");
    this._values["Origin"] =
      this._values["Protocol"] + "://" + this._values["Hostname"];
    this._values["Fragment"] = hashPart;
  };

  return new URLParser(url);
};

_.URL = function (url) {
  let result = {};
  let isURLAPIWorking = function () {
    let url;
    try {
      url = new URL("http://modernizr.com/");
      return url.href === "http://modernizr.com/";
    } catch (e) {
      return false;
    }
  };
  if (typeof window.URL === "function" && isURLAPIWorking()) {
    result = new URL(url);
    if (!result.searchParams) {
      result.searchParams = (function () {
        let params = _.getURLSearchParams(result.search);
        return {
          get: function (searchParam) {
            return params[searchParam];
          },
        };
      })();
    }
  } else {
    if (!_.check.isString(url)) {
      url = String(url);
    }
    url = _.trim(url);
    let _regex = /^https?:\/\/.+/;
    if (_regex.test(url) === false) {
      Log.log("Invalid URL");
      return;
    }
    let instance = _.urlParse(url);
    result.hash = instance._values.Fragment;
    result.host = instance._values.Host
      ? instance._values.Host +
      (instance._values.Port ? ":" + instance._values.Port : "")
      : "";
    result.href = instance._values.URL;
    result.password = instance._values.Password;
    result.pathname = instance._values.Path;
    result.port = instance._values.Port;
    result.search = instance._values.QueryString
      ? "?" + instance._values.QueryString
      : "";
    result.username = instance._values.Username;
    result.hostname = instance._values.Hostname;
    result.protocol = instance._values.Protocol
      ? instance._values.Protocol + ":"
      : "";
    result.origin = instance._values.Origin
      ? instance._values.Origin +
      (instance._values.Port ? ":" + instance._values.Port : "")
      : "";
    result.searchParams = (function () {
      let params = _.getURLSearchParams("?" + instance._values.QueryString);
      return {
        get: function (searchParam) {
          return params[searchParam];
        },
      };
    })();
  }
  return result;
};

// 查询关键字搜索引擎
class SearchKeyword {
  static getSourceFromReferrer() {
    function getMatchStrFromArr(arr, str) {
      for (let i = 0; i < arr.length; i++) {
        if (str.split("?")[0].indexOf(arr[i]) !== -1) {
          return true;
        }
      }
    }

    let utm_reg = "(" + utmTypes.join("|") + ")\\=[^&]+";
    let referrer = document.referrer || "";
    let url = location.href;
    if (url) {
      let utm_match = url.match(new RegExp(utm_reg));
      if (utm_match && utm_match[0]) {
        return "付费广告流量";
      } else if (getMatchStrFromArr(searchTypes, referrer)) {
        return "自然搜索流量";
      } else if (getMatchStrFromArr(socialTypes, referrer)) {
        return "社交网站流量";
      } else if (referrer === "") {
        return "直接流量";
      } else {
        return "引荐流量";
      }
    } else {
      return "获取url异常";
    }
  }

  static getReferSearchEngine(referrerUrl) {
    let hostname = _.getHostname(referrerUrl);
    if (!hostname || hostname === "hostname解析异常") {
      return "";
    }
    let searchEngineUrls = {
      baidu: [/^.*\.baidu\.com$/],
      bing: [/^.*\.bing\.com$/],
      google: [
        /^www\.google\.com$/,
        /^www\.google\.com\.[a-z]{2}$/,
        /^www\.google\.[a-z]{2}$/,
      ],
      sm: [/^m\.sm\.cn$/],
      so: [/^.+\.so\.com$/],
      sogou: [/^.*\.sogou\.com$/],
      yahoo: [/^.*\.yahoo\.com$/],
    };

    let regexes = {};
    for (let engine in searchEngineUrls) {
      regexes[engine] = searchEngineUrls[engine].map((regex) => {
        return new RegExp(regex);
      });
    }
    for (let engine in regexes) {
      let regexList = regexes[engine];
      for (const regex of regexList) {
        if (regex.test(hostname)) {
          return engine;
        }
      }
    }
    return "未知搜索引擎";
  }

  static getKeywordFromReferrer(referrerUrl, activeValue) {
    referrerUrl = referrerUrl || document.referrer;
    if (document && _.check.isString(referrerUrl)) {
      if (referrerUrl.indexOf("http") === 0) {
        let searchEngine = this.getReferSearchEngine(referrerUrl);
        let query = _.getURLSearchParams(referrerUrl);
        if (_.check.isEmptyObject(query)) {
          return "未取到值";
        }

        let temp = null;
        for (let i in searchKeywords) {
          if (searchEngine === i) {
            if (_.check.isObject(query)) {
              temp = searchKeywords[i];
              if (_.check.isArray(temp)) {
                for (i = 0; i < temp.length; i++) {
                  let _value = query[temp[i]];
                  if (_value) {
                    if (activeValue) {
                      return {
                        active: _value,
                      };
                    } else {
                      return _value;
                    }
                  }
                }
              } else if (query[temp]) {
                if (activeValue) {
                  return {
                    active: query[temp],
                  };
                } else {
                  return query[temp];
                }
              }
            }
          }
        }

        return "未取到值";
      } else {
        if (referrerUrl === "") {
          return "未取到值_直接打开";
        } else {
          return "未取到值_非http的url";
        }
      }
    } else {
      return "取值异常_referrer异常_" + String(referrerUrl);
    }
  }
}

function isVaildFunction(callback) {
  if (_.check.isFunction(callback)) {
    return true;
  } else if (callback && _.check.isObject(callback)) {
    return isVaildFunction(callback.callback);
  } else {
    return false;
  }
}

class EventEmitter {
  constructor() {
    if (!EventEmitter.instance) {
      EventEmitter.instance = this;
      this.events = {};
    }
    return EventEmitter.instance;
  }

  on(event, callback) {
    if (!event || !callback) {
      return false;
    }

    if (!isVaildFunction(callback)) {
      throw new Error("callback must be a fcuntion");
    }

    this.events[event] = this.events[event] || [];
    if (_.check.isObject(callback)) {
      this.events[event].push(callback);
    } else {
      this.events[event].push({ callback: callback, once: false });
    }

    return this;
  }

  prepend(e, c) {
    if (!e || !c) {
      return false;
    }

    if (!isVaildFunction(c)) {
      throw new Error("callback must be a fcuntion");
    }

    this.events[e] = this.events[e] || [];
    if (_.check.isObject(c)) {
      this.events[e].unshift(c);
    } else {
      this.events[e].unshift({ callback: c, once: false });
    }

    return this;
  }

  prependOnce(e, c) {
    return this.prepend(e, {
      callback: c,
      once: true,
    });
  }

  once(e, c) {
    return this.on(e, {
      callback: c,
      once: true,
    });
  }

  off(e, c) {
    let cbs = this.events[e];
    if (!cbs) return false;
    if (_.check.isNumber(c)) {
      cbs.splice(c, 1);
    } else if (_.check.isFunction(c)) {
      for (let i = 0; i < cbs.length; i++) {
        if (cbs[i] && cbs[i].callback === c) {
          cbs.splice(i, 1);
        }
      }
    }
    return this;
  }

  emit(e, args) {
    let cbs = this.events[e];
    if (!cbs) {
      return false;
    }

    for (let cb of cbs) {
      if (_.check.isObject(cb)) {
        cb.callback.call(this, args || {});
        if (cb.once) {
          this.off(e, cb.callback);
        }
      }
    }

    return this;
  }

  clear(e) {
    if (e && this.events(e)) {
      this.events[e] = [];
    } else {
      this.events = {};
    }
  }

  getEvent(e) {
    if (e && this.events[e]) {
      return this.events[e];
    } else {
      return this.events;
    }
  }
}

_.mitt = new EventEmitter();

_.initUrlChange = function () {
  let currentUrl = location.href;
  let historyPushState = history.pushState;
  let historyReplaceState = history.replaceState;

  if (_.check.isFunction(historyPushState)) {
    history.pushState = function () {
      historyPushState.apply(history, arguments);
      _.mitt.emit("urlChange", currentUrl);
      currentUrl = location.href;
    };
  }

  if (_.check.isFunction(historyReplaceState)) {
    history.replaceState = function () {
      historyReplaceState.apply(history, arguments);
      _.mitt.emit("urlChange", currentUrl);
      currentUrl = location.href;
    };
  }

  let pageEventMode = historyPushState ? "popstate" : "hashchange";

  _.addEvent(window, pageEventMode, function () {
    _.mitt.emit("urlChange", currentUrl);
    currentUrl = location.href;
  });
};

_.listenPageState = function (p) {
  const visibilyStore = {
    visibleHandler: _.check.isFunction(p.visible) ? p.visible : function () { },
    hiddenHandler: _.check.isFunction(p.hidden) ? p.hidden : function () { },
    visibilityChange: null,
    hidden: null,
    isSupport: function () {
      return !_.check.isUndefined(document[this.hidden]);
    },
    init: function () {
      if (!_.check.isUndefined(document.hidden)) {
        this.hidden = "hidden";
        this.visibilityChange = "visibilitychange";
      } else if (!_.check.isUndefined(document.msHidden)) {
        this.hidden = "msHidden";
        this.visibilityChange = "msvisibilitychange";
      } else if (!_.check.isUndefined(document.webkitHidden)) {
        this.hidden = "webkitHidden";
        this.visibilityChange = "webkitvisibilitychange";
      } else if (!_.check.isUndefined(document.mozHidden)) {
        this.hidden = "mozHidden";
        this.visibilityChange = "mozvisibilitychange";
      }
      this.listen();
    },
    listen: function () {
      if (!this.isSupport()) {
        _.addEvent(window, "focus", this.visibleHandler);
        _.addEvent(window, "blur", this.hiddenHandler);
      } else {
        _.addEvent(document, this.visibilityChange, () => {
          if (!document[this.hidden]) {
            this.visibleHandler();
          } else {
            this.hiddenHandler();
          }
        });
      }
    },
  };
  visibilyStore.init();
};

// 根据字符串生成10位hash值
_.hash = function (str) {
  let hash = 5381;
  let i = str.length;
  while (i) {
    hash = (hash * 33) ^ str.charCodeAt(--i);
  }
  return hash >>> 0;
};

// (function(){
//   let hasCircularReference = function(obj, seen = new Set()) {
//     if (typeof obj !== 'object' || obj === null) {
//       return false;
//     }

//     if (seen.has(obj)) {
//       return true;
//     }

//     seen.add(obj);

//     for (let key in obj) {
//       if (hasCircularReference(obj[key], seen)) {
//         return true;
//       }
//     }

//     seen.delete(obj);

//     return false;
//   }

//   let JSONStringfy = JSON.stringify;
//   let newJSONStringfy = function(obj, ...option){
//     if(!hasCircularReference(obj)){
//       return JSONStringfy(obj, ...option);
//     }
//     throw new Error("There is a circular reference, please check the data type. If you are using the Vue3 framework, please check if you are using JSON.stringfy to convert ref types.");
//   }
//   JSON.stringify = newJSONStringfy;
// })();

export { _, Log, SDKDebug, SearchKeyword };
