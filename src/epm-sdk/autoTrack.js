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
  constructor(config, ctx) {
    AutoTrack.instance = this;
    this.config = config;
    this.ctx = ctx
    this.initialized = true;
    this.load(config);

  }
  load(config) {
    if (!this.initialized) {
      this.config = config;
      this.initialized = true;
    }
  }
  autoTrack(data = {}, callback) {
    this.ctx.track(
      "H_pageview",
      _.extend(
        {
          ...data,
          H_referrer: _.getReferrer(null, true),
          H_url: location.href,
          H_url_path: location.pathname,
          H_title: document.title,
        },
      ),
      callback
    );
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
        ...data,
          H_referrer: referrer,
          url: location.href,
          H_url_path: location.pathname,
          H_title: document.title,
        },
      ),
      callback
    );
    // sendFirstProfile(this.ctx.userSetOnce, false, this.ctx);
  }

  listenSinglePage() {
    const isSinglePage = this.ctx.getConfig("isSinglePage");

    if (isSinglePage) {
      _.mitt.on("hasInitEpm", () => {
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

  onUrlChange(cb) {
    if (_.check.isFunction(cb)) {
      cb();
      _.mitt.on("urlChange", cb);
    }
  }
}

export default AutoTrack;
