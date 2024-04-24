// jq引入
const script = document.createElement("script");
script.async = "async";
script.src = "https://cdn.staticfile.org/jquery/3.0.0/jquery.min.js";
script.type = "text/javascript";

function initHotAnalyse() {
  // 网页热力点击SDK（勿删勿删勿删）
  /* eslint-disable */
  let isClick = false;
  const infoBoxWidth = 220;
  const infoBoxheight = 315;
  const currentWindowHeight =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    document.body.clientHeight ||
    0;
  const createShadowBox = (data) => {
    const {
      H_element_content,
      H_element_selector,
      button_click_prop,
      button_click_rate,
      button_click_times,
      button_click_users,
      his_H_element_content,
    } = data;
    const strContent = `
    <div style='padding: 8px;'>
        <div style='color: #CACACA'>当前内容：</div>
        <div style='white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>${
          H_element_content || "-"
        }</div>
        </div>
            <div style='background: #444; height:1px;'></div>
            <div style='padding: 8px;'>
                <table style='width:100%;color:#fff;font-size:13px;background:#333;border:1px solid #333;'>
                    <tr>
                        <td>点击次数：</td>
                        <td style='text-align:right;'>${button_click_times}</td>
                    </tr>
                    <tr>
                        <td>点击人数：</td>
                        <td style='text-align:right;'>${button_click_users}</td>
                    </tr>
                    <tr>
                        <td>点击率：</td>
                        <td style='text-align:right;'>${button_click_rate}</td>
                    </tr>
                    <tr>
                        <td>点击占比：</td>
                        <td style='text-align:right;'>${button_click_prop}</td>
                    </tr>
                </table>
            </div>
            <div style='background: #444; height:1px;'></div>
            <div style='padding: 8px;'>
                <div style='color: #CACACA;'>历史内容：</div>
                <div style='white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>${
                  his_H_element_content || "-"
                }</div>
            </div>
            <div style='background: #444; height:1px;'></div>
            <div style='padding: 6px 8px;' class='user-list' hina-tag-disable='true'>
                <p style='color:#2a90e2;text-decoration: none;'>查看用户列表</p>
            </div>
      `;
    const divWrapBox = document.createElement("div");

    document.body.appendChild(divWrapBox);
    divWrapBox.setAttribute("class", "shadeBoxWrap");
    // 设置弹出盒子样式
    divWrapBox.setAttribute(
      "style",
      `
          border-radius:3px;
          display: none;
          border:1px solid #000;
          cursor: pointer;
          position: absolute;
          left:0;
          top:0;
          background: #333;
          line-height:24px;
          font-size:13px;
          width:${infoBoxWidth}px;
          height:${infoBoxheight}px;
          color: #fff;
          box-shadow: 0 2px 4px rgba(0,0,0,0.24);
          z-index:9999;
      `
    );
    divWrapBox.innerHTML = strContent;
    return divWrapBox;
  };

  function debounce(fn, wait) {
    let timeout = null;
    return function () {
      if (timeout !== null) clearTimeout(timeout);
      timeout = setTimeout(fn, wait);
    };
  }

  function throttle(fn, wait) {
    let pre = Date.now();
    return function () {
      const _this = this;
      const _arguments = arguments;
      const now = Date.now();
      if (now - pre >= wait) {
        fn.apply(_this, _arguments);
        pre = Date.now();
      }
    };
  }

  const posEleBetweenspace = (arr, num) => {
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] > num) {
        return i;
      }
    }
  };

  function setCssStyle(css) {
    const style = document.createElement("style");
    style.type = "text/css";
    try {
      style.appendChild(document.createTextNode(css));
    } catch (e) {
      style.styleSheet.cssText = css;
    }
    const head = document.getElementsByTagName("head")[0];
    const firstScript = document.getElementsByTagName("script")[0];
    if (head) {
      if (head.children.length) {
        head.insertBefore(style, head.children[0]);
      } else {
        head.appendChild(style);
      }
    } else {
      firstScript.parentNode.insertBefore(style, firstScript);
    }
  }

  const customHotClickCss = `
  .hina-click-area:before{
    pointer-events: none;
    cursor: pointer;
    content: "";
    width: 100%;
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: rgba(56, 166, 251, 0.6);
    box-shadow: rgba(0, 0, 0, 0.6) 0px 2px 4px;
    cursor: pointer
  }
  .hina-click-area:after{
    pointer-events: none;
    height: 14px;
    line-height: 14px;
    margin: -7px 0 0 -28px;
    width: 56px;
    color: #fff;
    content: attr(data-click);
    font-size: 14px;
    font-weight: 700;
    left: 50%;
    line-height: 1em;
    position: absolute;
    text-align: center;
    text-indent: 0;
    text-shadow: 1px 1px 2px #000;
    top: 50%;
    z-index: 999;
}
`;
  setCssStyle(customHotClickCss);
  window.addEventListener(
    "message",
    (event) => {
      const type = event.data?.type;
      // 浏览图
      if (type === "view") {
        // 清空点击图
        // 监听屏幕尺寸变化
        const lastGraphData = event.data?.lastGraph;
        $("body > .shadeBoxWrap").remove();
        // 如果为空，则使用上次的缓存数据清空页面渲染点
        for (let i = 0; i < lastGraphData?.length; i++) {
          const { H_element_selector } = lastGraphData[i];
          $(H_element_selector).removeClass("hina-click-area");
        }
        isClick = false;
        window.removeEventListener("scroll", () => {}, true);
        const viewRenderData = event.data?.viewData?.[0];
        const baseLineArrays = [
          viewRenderData?.view100,
          viewRenderData?.view90,
          viewRenderData?.view80,
          viewRenderData?.view70,
          viewRenderData?.view60,
          viewRenderData?.view50,
          viewRenderData?.view40,
          viewRenderData?.view30,
          viewRenderData?.view20,
          viewRenderData?.view10,
        ]?.map((i) => i + currentWindowHeight);
        const percentageArr = new Array(10)
          .fill(1)
          .map((item, index) => (index + 1) * 10)
          .reverse(); // [100,90,80...]
        const viewBaseInnerSpan = (percent) => `
            <span 
              style='
                font-size:12px;
                position:absolute;
                padding: 0 12px;
                top: -24px;
                height: 26px;
                line-height: 26px;
                left: 0;
                background: #E6F1FB;
                color: #0174df;
                border-radius: 2px;
              '>
              ${percent}%
            </span>
          `;
        for (let i = 0; i < percentageArr.length; i++) {
          const viewBaseLine = document.createElement("div");
          viewBaseLine.setAttribute(
            "style",
            `
            border-bottom: 1px dashed #0174df;
            height: 1px;
            width: 100%;
            position: absolute;
            top: 50px;
            z-index:999;
          `
          );
          viewBaseLine.setAttribute("class", "viewBaseLineStyle");
          const strParam = viewRenderData[`view${percentageArr[i]}`];
          viewBaseLine.style.top = `${strParam + currentWindowHeight}px`;
          if (i !== 0) {
            if (
              viewRenderData[`view${percentageArr[i]}`] -
                viewRenderData[`view${percentageArr[i - 1]}`] >
              26
            ) {
              viewBaseLine.innerHTML = viewBaseInnerSpan(percentageArr[i]);
            }
          } else if (viewRenderData[`view${percentageArr[i]}`] > 26) {
            viewBaseLine.innerHTML = viewBaseInnerSpan(percentageArr[i]);
          }

          document.body.appendChild(viewBaseLine);
        }
        const viewMoveLine = document.createElement("div");
        const moveLineInnerTag = (val) => `
          <span 
          style='
            font-size:12px;
            height:26px;
            line-height: 26px;
            background: #E6F1FB;
            color: #0174df;
            border-radius: 2px;
            left:50%;
            margin-left:-65px;
            position: absolute;
            top:-13px;
            padding: 0 5px;
          '>
          ${val || 0}%的用户浏览到这里
          </span>
        `;
        viewMoveLine.setAttribute(
          "style",
          `
          border-bottom: 1px solid  #0174df;
          height: 1px;
          width: 100%;
          position: absolute;
          z-index: 9999;
          top: 0;
        `
        );
        viewMoveLine.setAttribute("class", "viewMoveLineStyle");
        document.body.appendChild(viewMoveLine);
        $(document).on(
          "mousemove",
          throttle((e) => {
            viewMoveLine.style.top = `${e.pageY}px`;
            // 获取当前值在那个区间的index
            const spaceIndex = posEleBetweenspace(baseLineArrays, e.pageY);
            // 获取当前值在那个区间的值
            const spaceShowValue = percentageArr[spaceIndex];
            viewMoveLine.innerHTML = moveLineInnerTag(spaceShowValue);
          }, 150)
        );
      } else if (type === "click") {
        // 清空浏览图横线
        isClick = true;
        $("body > .viewBaseLineStyle").remove();
        $("body > .viewMoveLineStyle").remove();
        // 点击图渲染数据
        const renderData = event.data?.hotData;
        // 监听屏幕尺寸变化
        const isResize = event.data?.isResize;
        const lastGraphData = event.data?.lastGraph;
        isResize && $("body > .shadeBoxWrap").remove();
        // 如果为空，则使用上次的缓存数据清空页面渲染点
        if (!renderData?.length) {
          for (let i = 0; i < lastGraphData?.length; i++) {
            const { H_element_selector } = lastGraphData[i];
            $(H_element_selector).removeClass("hina-click-area");
          }
          return;
        }

        for (let i = 0; i < renderData?.length; i++) {
          const {
            H_element_content,
            H_element_selector,
            button_click_prop,
            button_click_rate,
            button_click_times,
            button_click_users,
            his_H_element_content,
          } = renderData[i];
          const hinClickArea = document.createElement("div");
          // 设置弹出盒子样式
          hinClickArea.setAttribute(
            "style",
            `position: relative;
       `
          );
          hinClickArea.setAttribute("class", "hina-click-area");
          // 设置conteng内容
          const divWrapBox = createShadowBox(renderData[i]);
          const currentBoxOffsetLeft = $(H_element_selector)?.offset()?.left;
          const currentBoxScrollY = window.scrollY;
          const currentWindowWidth = $(window).width();
          const currentWindowHeight =
            window.innerHeight ||
            document.documentElement.clientHeight ||
            document.body.clientHeight ||
            0;
          const currentBoxPosTop = $(H_element_selector)?.position()?.top;
          const currentBoxOffsetTop = $(H_element_selector)?.offset()?.top;
          const currentBoxWidth = $(H_element_selector)?.css("width");
          const currentBoxHeight = $(H_element_selector)?.css("height");

          $(H_element_selector).addClass("hina-click-area");
          $(H_element_selector).css("position", "relative");
          $(`${H_element_selector}:before`).css("position", "absolute");
          $(H_element_selector).attr("data-click", button_click_rate);
          if (
            [currentBoxWidth, currentBoxHeight, "undefined"].includes("0px")
          ) {
            $(H_element_selector).removeClass("display", "inline-block");
            $(H_element_selector).css("width", "15px");
            $(H_element_selector).css("height", "15px");
          }

          $(H_element_selector).mouseenter(() => {
            $("body > .shadeBoxWrap > .user-list > p").attr(
              "drillSelector",
              H_element_selector
            );
            // 兼容头部固定，内容滚动场景
            if (currentBoxOffsetTop < 50) {
              $("body > .shadeBoxWrap").css("position", "fixed");
            } else {
              $("body > .shadeBoxWrap").css("position", "absolute");
            }
            divWrapBox.style.display = "block";

            const currentBoxLeft = currentWindowWidth - currentBoxOffsetLeft;

            if (currentBoxLeft < infoBoxWidth) {
              divWrapBox.style.left = `${
                currentBoxOffsetLeft - infoBoxWidth
              }px`;
              if (currentBoxOffsetTop > infoBoxheight) {
                divWrapBox.style.top = `${
                  currentBoxOffsetTop +
                  parseFloat(currentBoxHeight) -
                  infoBoxheight
                }px`;
              } else {
                divWrapBox.style.top = `${currentBoxOffsetTop}px`;
              }
              return;
            }
            divWrapBox.style.left = `${currentBoxOffsetLeft}px`;

            // 根据盒子高度设置显示方向
            if (currentWindowHeight - currentBoxOffsetTop > infoBoxheight) {
              if (window.scrollY > infoBoxheight) {
                divWrapBox.style.top = `${
                  currentBoxPosTop + parseFloat(currentBoxHeight)
                }px`;
              } else {
                divWrapBox.style.top = `${
                  currentBoxOffsetTop +
                  parseFloat(currentBoxHeight) -
                  currentBoxScrollY
                }px`;
              }
            } else {
              divWrapBox.style.top = `${currentBoxOffsetTop - infoBoxheight}px`;
            }
          });
          $(H_element_selector).mouseleave(() => {
            // divWrapBox.style.display = 'none'
            $("body > .shadeBoxWrap").css("display", "none");
          });

          divWrapBox.addEventListener("mouseenter", () => {
            divWrapBox.style.display = "block";
          });
          divWrapBox.addEventListener("mouseleave", () => {
            // divWrapBox.style.display = 'none'
            $("body > .shadeBoxWrap").css("display", "none");
          });
        }
        $("body > .shadeBoxWrap > .user-list > p").on("click", (e) => {
          event.stopPropagation();
          window.parent.postMessage(
            { eleSelector: e?.target?.attributes?.drillselector?.value },
            "*"
          );
        });
      }
    },
    false
  );

  window.addEventListener(
    "scroll",
    debounce(() => {
      isClick && window.parent.postMessage({ isRefush: true }, "*");
    }, 800),
    true
  );
  /* eslint-enable */
  // 网页热力点击SDK（勿删勿删勿删）
}

script.addEventListener("load", initHotAnalyse)

document.head.appendChild(script);
