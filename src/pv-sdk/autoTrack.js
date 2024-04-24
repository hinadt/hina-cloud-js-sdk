import { pageInfo, sendFirstProfile } from "../common/property";
import { Log, _ } from "../common/utils";

let { location } = window;

let ignoreTags = [
  "mark",
  "/mark",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "abbr",
  "ins",
  "del",
  "s",
  "sup",
];

let defaultTags = ["a", "div", "input", "button", "textarea"];

class AutoTrack {
  constructor(autoTrackConfig, stayAutoTrackConfig, ctx) {
    this.autoTrackIsUsed = false;
    this.otherTag = [];
    this.isTrackList = {
      a: true,
      button: true,
    };
    this.autoTrackConfig = _.extend(
      {
        clickAutoTrack: true,
        stayAutoTrack: true,
        // 返回true采集，返回false不采集
        isCollectUrl: () => {
          return true;
        },
        isCollectElement: () => {
          return true;
        },
        isCollectInput: () => {
          return false;
        },
        // 根据特定标签添加上报的自定义字段
        addCustomProperty: () => {},
        // 滚动超过4s触发，单位ms
        stayDelayTime: 4000,
        // 页面停留最大为5小时，单位s
        maxStayPageDuration: 18000, // 18000s 默认5小时
        collectTags: {
          div: false, 
        },
        trackAttr: [],
      },
      autoTrackConfig
    );
    this.stayAutoTrackConfig = _.extend(
      {
        // 返回true采集，返回false不采集
        isCollectUrl: () => {
          return true;
        },
      },
      stayAutoTrackConfig
    );
    this.ctx = ctx;
    this.load(autoTrackConfig);
  }

  load(config) {
    if (_.check.isArray(config.trackAttr)) {
      this.autoTrackConfig.trackAttr = config.trackAttr.filter((v) =>
        _.check.isString(v)
      );
      this.autoTrackConfig.trackAttr.push("hn-click");
    } else {
      this.autoTrackConfig.trackAttr = ["hn-click"];
    }

    if (_.check.isObject(config.collectTags)) {
      if (config.collectTags.div === true) {
        this.autoTrackConfig.collectTags.div = {
          ignoreTags: ignoreTags,
          maxLevel: 1,
        };
      } else if (_.check.isObject(config.collectTags.div)) {
        this.autoTrackConfig.collectTags.div.ignoreTags = ignoreTags;
        if (_.check.isNumber(config.collectTags.div.maxLevel)) {
          let supportDivLevel = [1, 2, 3];
          if (!supportDivLevel.includes(config.collectTags.div.maxLevel)) {
            this.autoTrackConfig.collectTags.div.maxLevel = 1;
          }
        } else {
          this.autoTrackConfig.collectTags.div.maxLevel = 1;
        }
      } else {
        this.autoTrackConfig.collectTags.div = false;
      }

      _.each(config.collectTags, (val, key) => {
        if (key !== "div" && val) {
          this.otherTag.push(key);
        }
      });

      if (this.autoTrackConfig.clickAutoTrack === true) {
        _.each(this.otherTag, (tagName) => {
          if (tagName in this.isTrackList) {
            this.isTrackList[tagName] = true;
          }
        });
      }
    } else {
      this.autoTrackConfig.collectTags = {
        div: false,
      };
    }
  }

  autoTrack(data = {}, callback) {
    this.ctx.track(
      "H_pageview",
      _.extend(
        {
          H_referrer: _.getReferrer(null, true),
          H_url: location.href,
          H_url_path: location.pathname,
          H_title: document.title,
        },
        data
      ),
      callback
    );
    sendFirstProfile(this.ctx.userSetOnce, true, this.ctx);
    this.autoTrackIsUsed = true;
  }

  autoTrackSinglePage(data = {}, callback) {
    let referrer;
    if (this.autoTrackIsUsed) {
      referrer = location.href;
    } else {
      referrer = _.getReferrer();
    }
    this.ctx.track(
      "H_pageview",
      _.extend(
        {
          H_referrer: referrer,
          url: location.href,
          H_url_path: location.pathname,
          H_title: document.title,
        },
        data
      ),
      callback
    );
    sendFirstProfile(this.ctx.userSetOnce, false, this.ctx);
  }

  listenSinglePage() {
    let isSinglePage = this.ctx.getConfig("isSinglePage");
    if (isSinglePage) {
      _.mitt.on("hasInit", () => {
        this.onUrlChange((url) => {
          let _autoTrackSinglePage = (extraData = {}) => {
            if (url !== location.href) {
              pageInfo.pageProp.H_referrer = url;
              let data = _.extend(
                {
                  H_url: location.href,
                  H_referrer: url,
                },
                extraData
              );
              this.autoTrack(data);
            }
          };

          if (_.check.isBoolean(isSinglePage)) {
            _autoTrackSinglePage();
          } else if (_.check.isFunction(isSinglePage)) {
            let extraData = isSinglePage();
            if (_.check.isObject(extraData)) {
              _autoTrackSinglePage(extraData);
            } else if (extraData === true) {
              _autoTrackSinglePage();
            }
          }
        });
      });
    }
  }

  initWebClick() {
    if (this.autoTrackConfig.clickAutoTrack !== true) {
      return;
    }

    let isCurrentPageCollect = true;
    if (_.check.isFunction(this.autoTrackConfig.isCollectUrl)) {
      this.onUrlChange(() => {
        isCurrentPageCollect = !!this.autoTrackConfig.isCollectUrl();
      });
    }

    _.addCaptureEvent(document, "click", (e) => {
      if (!isCurrentPageCollect) return;
      let event = e || window.event;
      if (!event) return;
      let eventTarget = event.target || event.srcElement;
      let target = this.getTargetElement(eventTarget, event);
      if (target) {
        this.emitClick(event, target);
      }
    });
  }

  emitClick(event, target, customProps = {}, callback) {
    if (
      _.check.isFunction(this.autoTrackConfig.isCollectElement) &&
      !this.autoTrackConfig.isCollectElement(target)
    ) {
      return false;
    }

    let props = this.getClickElementInfo(target);

    if (_.check.isFunction(this.autoTrackConfig.addCustomProperty)) {
      let customProperty = this.autoTrackConfig.addCustomProperty(target);
      if (_.check.isObject(customProperty)) {
        props = _.extend(props, customProperty);
      }
    }

    props = _.extend(props, this.getPageXYInfo(event, target), customProps);
    this.ctx.track("H_WebClick", props, callback);
  }

  initWebStay() {
    if (this.autoTrackConfig.stayAutoTrack !== true) {
      return;
    }

    let isCurrentPageCollect = true;
    if (_.check.isFunction(this.stayAutoTrackConfig.isCollectUrl)) {
      this.onUrlChange(() => {
        isCurrentPageCollect = !!this.stayAutoTrackConfig.isCollectUrl();
      });
    }

    let stayDelayFn = function (cb) {
      let instance = {
        timer: null,
        timeout: 1000,
        callback: cb,
      };

      instance.run = function (isNoDelay = false) {
        let para = {};
        if (!instance.timer) {
          let offsetTop =
            document.documentElement?.scrollTop ||
            window.pageYOffset ||
            document.body.scrollTop ||
            0;
          para.H_viewport_position = Math.round(offsetTop) || 0;
          if (isNoDelay) {
            instance.callback(para, true);
            instance.timer = null;
          } else {
            instance.timer = setTimeout(() => {
              instance.callback(para, false);
              instance.timer = null;
            }, instance.timeout);
          }
        }
      };
      return instance;
    };

    let stayDelayTime = this.autoTrackConfig.stayDelayTime;
    let maxStayPageDuration = this.autoTrackConfig.maxStayPageDuration;
    let ctx = this.ctx;
    let stayDelay = stayDelayFn(function (para, isClosePage) {
      let offsetTop =
        document.documentElement?.scrollTop ||
        window.pageYOffset ||
        document.body.scrollTop ||
        0;
      let viewOffsetTop = para.H_viewport_position;
      let nowTime = new Date();
      let durationTime = nowTime - this.nowTime;
      if (
        (durationTime > stayDelayTime && offsetTop - viewOffsetTop !== 0) ||
        isClosePage
      ) {
        _.extend(
          para,
          {
            event_duration: Math.min(
              parseInt(durationTime) / 1000,
              maxStayPageDuration
            ),
          },
          _.info.pageProperties()
        );
        ctx.track("H_WebStay", para);
      }
      this.nowTime = nowTime;
    });

    stayDelay.nowTime = new Date();

    _.addCaptureEvent(window, "scroll", () => {
      if (isCurrentPageCollect) {
        stayDelay.run();
      }
    });

    _.addCaptureEvent(window, "unload", () => {
      if (isCurrentPageCollect) {
        stayDelay.run(true);
      }
    });
  }

  onUrlChange(cb) {
    if (_.check.isFunction(cb)) {
      cb();
      _.mitt.on("urlChange", cb);
    }
  }

  getTargetElement(eventTarget, event) {
    if (!_.check.isElement(eventTarget)) {
      return null;
    }

    if (!_.check.isString(eventTarget.tagName)) {
      return null;
    }

    let tagName = eventTarget.tagName?.toLowerCase();
    if (["body", "html"].includes(tagName)) {
      return null;
    }

    let tag = ["a", "button", "input", "textarea"].concat(this.otherTag);
    if (tag.includes(tagName)) {
      return eventTarget;
    }
    if (
      tagName === "div" &&
      this.autoTrackConfig.collectTags.div &&
      this.isDivLevelValid(eventTarget)
    ) {
      let maxLevel = this.autoTrackConfig.collectTags?.div?.maxLevel || 1;
      if (maxLevel > 1 || this.isCollectableDiv(eventTarget)) {
        return eventTarget;
      }
    }
    if (this.isStyleTag(tagName) && this.autoTrackConfig.collectTags.div) {
      let parentTrackDiv = this.getCollectableParent(eventTarget);
      if (parentTrackDiv && this.isDivLevelValid(parentTrackDiv)) {
        return parentTrackDiv;
      }
    }

    return (
      this.hasElement({
        event: event?.originalEvent || event,
        element: eventTarget,
      }) || null
    );
  }

  isDivLevelValid(element) {
    let maxLevel = this.autoTrackConfig.collectTags?.div?.maxLevel || 1;
    let allDiv = element.getElementsByTagName("div");
    for (let i = allDiv.length - 1; i >= 0; i--) {
      if (this.getDivLevel(allDiv[i], element) > maxLevel) {
        return false;
      }
    }
    return true;
  }

  getDivLevel(element, rootElement) {
    let path = this.getElementPath(element, true, rootElement);
    let pathArr = path.split(" > ");
    let ans = 0;
    pathArr.forEach((tag) => {
      if (tag === "div") {
        ans++;
      }
    });
    return ans;
  }

  getElementPath(element, ignoreId, rootElement) {
    let names = [];
    while (element.parentNode && _.check.isElement(element)) {
      if (
        element.id &&
        !ignoreId &&
        /^[A-Za-z][-A-Za-z0-9_:.]*$/.test(element.id)
      ) {
        names.unshift(element.tagName?.toLowerCase() + "#" + element.id);
        break;
      } else {
        if (rootElement && element === rootElement) {
          names.unshift(element.tagName?.toLowerCase());
          break;
        } else if (element === document.body) {
          names.unshift("body");
          break;
        } else {
          names.unshift(element.tagName?.toLowerCase());
        }
        element = element.parentNode;
      }
    }
    return names.join(" > ");
  }

  isCollectableDiv(target) {
    try {
      let targetChildren = target.children || [];
      if (targetChildren?.length === 0) {
        return true;
      } else {
        for (let i = 0; i < targetChildren.length; i++) {
          if (targetChildren[i].nodeType !== 1) {
            continue;
          }
          let tagName = targetChildren[i].tagName?.toLowerCase();
          let maxLevel = this.autoTrackConfig.collectTags?.div?.maxLevel || 1;
          if ((tagName === "div" && maxLevel > 1) || this.isStyleTag(tagName)) {
            if (!this.isCollectableDiv(targetChildren[i])) {
              return false;
            }
          } else {
            return false;
          }
        }
        return true;
      }
    } catch (error) {
      Log.log(error);
    }
    return false;
  }

  getCollectableParent(target) {
    try {
      let parentNode = target.parentNode;
      let parentTagName = parentNode ? parentNode.tagName?.toLowerCase() : "";
      if (parentTagName === "body") {
        return false;
      }
      let maxLevel = this.autoTrackConfig.collectTags?.div?.maxLevel || 1;
      if (
        parentTagName === "div" &&
        (maxLevel > 1 || this.isCollectableDiv(parentNode))
      ) {
        return parentNode;
      } else if (parentNode && this.isStyleTag(parentTagName)) {
        return this.getCollectableParent(parentNode);
      }
    } catch (error) {
      Log.log(error);
    }
    return false;
  }

  isStyleTag(tagName) {
    if (defaultTags.includes(tagName)) {
      return false;
    }
    if (this.autoTrackConfig.collectTags?.div?.ignoreTags?.includes(tagName)) {
      return true;
    }
    return false;
  }

  hasElement(obj) {
    let paths;
    if (obj.event) {
      let e = obj.event;
      paths = e.path || e?._getPath();
    } else if (obj.element) {
      paths = _.getDomElementInfo(obj.element).getParents();
    }

    let trackAttr = this.autoTrackConfig.trackAttr;
    if (_.check.isArray(paths) && paths.length > 0) {
      for (let path of paths) {
        let tagName = path.tagName && path.tagName?.toLowerCase();
        if (
          _.check.isElement(path) &&
          path.nodeType === 1 &&
          (this.isTrackList[tagName] || this.hasAttributes(path, trackAttr))
        ) {
          return path;
        }
      }
    }
  }

  hasAttribute(element, attrName) {
    if (element.hasAttribute) {
      return element.hasAttribute(attrName);
    } else if (element.attributes) {
      return !!element.attributes[attrName]?.value;
    }
  }

  hasAttributes(element, attrNames) {
    if (_.check.isArray(attrNames)) {
      let res = false;
      for (let i = 0; i < attrNames.length; i++) {
        let curRes = this.hasAttribute(element, attrNames[i]);
        if (curRes) {
          res = true;
          break;
        }
      }
      return res;
    }
  }

  getPageXYInfo(event, target) {
    if (!event) {
      return {};
    }

    function getScroll() {
      let scrollLeft =
        document.body.scrollLeft || document.documentElement.scrollLeft || 0;
      let scrollTop =
        document.body.scrollTop || document.documentElement.scrollTop || 0;
      return {
        scrollLeft: scrollLeft,
        scrollTop: scrollTop,
      };
    }

    function getElementPosition() {
      if (document.documentElement.getBoundingClientRect) {
        let targetEle = target.getBoundingClientRect();
        return {
          targetEleX: targetEle.left + getScroll().scrollLeft || 0,
          targetEleY: targetEle.top + getScroll().scrollTop || 0,
        };
      }
    }

    function toFixedThree(v) {
      return Number(Number(v).toFixed(3));
    }

    function getPage(event) {
      let pageX =
        event.pageX ||
        event.clientX + getScroll().scrollLeft ||
        event.offsetX + getElementPosition().targetEleX ||
        0;
      let pageY =
        event.pageY ||
        event.clientY + getScroll().scrollTop ||
        event.offsetY + getElementPosition().targetEleY ||
        0;
      return {
        H_page_x: toFixedThree(pageX),
        H_page_y: toFixedThree(pageY),
      };
    }

    return getPage(event);
  }

  getClickElementInfo(target) {
    let isCollectInput = this.autoTrackConfig.isCollectInput();
    let selector = this.getDomSelector(target);
    let props = _.info.getElementInfo(target, isCollectInput);

    props.H_element_selector = selector || "";
    props.H_element_path = this.getElementPath(target, false);
    return props;
  }

  getDomSelector(el, arr = []) {
    if (!el || !el.parentNode || !el.parentNode.children) return false;
    let nodeName = el.nodeName?.toLowerCase();
    if (!el || nodeName === "body" || el.nodeType !== 1) {
      arr.unshift("body");
      return arr.join(" > ");
    }
    arr.unshift(this.getSelector(el));
    if (
      el?.getAttribute("id") &&
      /^[A-Za-z][-A-Za-z0-9_:.]*$/.test(el.getAttribute("id"))
    ) {
      return arr.join(" > ");
    }
    return this.getDomSelector(el.parentNode, arr);
  }

  getSelector(el) {
    let tagName = el.tagName?.toLowerCase();
    let i = -1;
    if (el?.parentNode?.nodeType !== 9) {
      i = this.getDomIndex(el);
    }
    if (
      el?.getAttribute("id") &&
      /^[A-Za-z][-A-Za-z0-9_:.]*$/.test(el.getAttribute("id"))
    ) {
      return "#" + el.getAttribute("id");
    } else {
      return tagName + (~i ? ":nth-of-type(" + (i + 1) + ")" : "");
    }
  }

  getDomIndex(el) {
    if (!el.parentNode) return -1;
    let index = 0;
    let nodeName = el.tagName?.toLowerCase();
    let list = el.parentNode.children;
    for (let i = 0; i < list.length; i++) {
      let childTagName = list[i]?.tagName?.toLowerCase();
      if (childTagName === nodeName) {
        if (list[i] === el) {
          return index;
        } else {
          index++;
        }
      }
    }
    return -1;
  }
}

export default AutoTrack;
