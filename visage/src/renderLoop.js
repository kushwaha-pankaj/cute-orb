/** Keep scenes alive while stopping GPU work outside the viewport or hidden tabs. */
export function createRenderLoop(host, render, {fps = 60} = {}) {
  let frame = 0, disposed = false, visible = true, previous = 0, elapsed = 0;
  const interval = 1000 / fps;
  function tick(now) {
    if (disposed || !visible || document.hidden) { frame = 0; return; }
    frame = requestAnimationFrame(tick);
    if (previous && now - previous < interval - 1) return;
    const delta = previous ? Math.min((now - previous) / 1000, .05) : 1 / fps;
    previous = now;
    elapsed += delta;
    render(now, delta, elapsed);
  }
  function resume() {
    if (!disposed && visible && !document.hidden && !frame) {
      previous = 0;
      frame = requestAnimationFrame(tick);
    } else if (!visible || document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resume(); });
  observer.observe(host);
  document.addEventListener('visibilitychange', resume);
  resume();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    document.removeEventListener('visibilitychange', resume);
  };
}

// Bound the drawing buffer: DPR 2 quadruples the fragment work of DPR 1.
export function renderPixelRatio(width, height, deviceRatio = globalThis.devicePixelRatio || 1) {
  const cap = (globalThis.navigator?.hardwareConcurrency || 8) <= 4 ? 1.25 : 1.5;
  return Math.max(.75, Math.min(deviceRatio, cap, Math.sqrt(1_500_000 / Math.max(1, width * height))));
}
