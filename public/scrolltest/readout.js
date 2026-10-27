// Temporary: the same scroll read-out as marketann.ai/?debug, for the bare test pages. Remove with the folder.
(() => {
  const box = document.createElement('pre');
  box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:9999;margin:0;padding:8px 10px;max-width:calc(100% - 16px);' +
    'background:rgba(255,40,40,.92);color:#fff;font:11px/1.35 ui-monospace,Menlo,monospace;border-radius:8px;white-space:pre-wrap;pointer-events:none';
  document.body.append(box);
  const ua = (navigator.userAgent.match(/OS [\d_]+|CriOS\/[\d.]+|Version\/[\d.]+/g) || []).join(' ');
  let minY = 0;
  const draw = () => {
    minY = Math.min(minY, scrollY);
    box.textContent = `${document.title}\nscrollY ${Math.round(scrollY)}  min ${Math.round(minY)}  innerH ${innerHeight}\n${ua}`;
  };
  addEventListener('scroll', draw, { passive: true });
  setInterval(draw, 250);
  draw();
})();
