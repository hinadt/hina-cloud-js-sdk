function checkBlankPage(blankTarget, ...args) {

}

function snapshotPage(blankTarget, blankTimeout) {
  let timer = null;

  timer = setTimeout(() => {
    const target = blankTarget
      ? document.querySelector(blankTarget)
      : document.body;

    if (window.html2canvas) {
      uploadIMage(target);
    } else {
      const script = document.createElement("script");
      script.async = "async";
      script.src = "https://html2canvas.hertzen.com/dist/html2canvas.min.js";
      script.type = "text/javascript";
      script.addEventListener("load", uploadIMage(target));
      document.head.appendChild(script);
    }
  }, blankTimeout);
}

function uploadIMage(target) {
  window
    .html2canvas(target, { scale: 750 / window.innerWidth })
    .then((canvas) => {
      const dataURL = canvas.toDataURL("image/png");
      //todo 后续上传
    });
}