const frame = document.querySelector('#point-field');
const canvas = document.querySelector('#point-canvas');
const button = document.querySelector('#field-motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const ctx = canvas.getContext('2d');
if (ctx) {
  const css = getComputedStyle(document.documentElement);
  const colors = ['--point-lo', '--point-mid', '--point-hi', '--color-accent-2'].map(name => css.getPropertyValue(name).trim());
  const mask = document.createElement('canvas'); mask.width = 480; mask.height = 480;
  const pen = mask.getContext('2d');
  pen.fillStyle = colors[2]; pen.scale(10, 10); pen.translate(-2, 0);
  pen.fill(new Path2D('M9 13h4v9h9v-9h4v23h-4V26h-9v10H9zM30 13h13v4L33 36h-5l10-19h-8z'));
  const pixels = pen.getImageData(0, 0, 480, 480).data;
  const points = [];
  for (let y = 122; y < 365; y += 4) for (let x = 60; x < 420; x += 4) {
    if (pixels[(y * 480 + x) * 4 + 3] < 150) continue;
    for (let layer = 0; layer < 3; layer++) points.push({ x: (x - 240) * 1.35, y: (y - 245) * 1.35, z: (layer - 1) * 24, layer });
  }
  let width = 1, height = 1, raf = 0, last = 0, phase = 0;
  let userPaused = false, hovering = false, focused = false, visible = true;
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const scale = Math.min(width / 510, height / 420);
    const angle = reduced.matches ? .2 : .2 + Math.sin(phase / 13000) * .13;
    const scan = Math.sin(phase / 2400) * 270;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    for (const p of points) {
      const x = p.x * ca + p.z * sa;
      const depth = p.z * ca - p.x * sa;
      const y = p.y + depth * .18;
      const swept = Math.abs(p.x - scan) < 19;
      ctx.fillStyle = swept ? colors[3] : colors[p.layer];
      ctx.globalAlpha = p.layer === 2 ? .95 : .5;
      const size = (swept ? 1.9 : 1.35) * scale;
      ctx.fillRect(width / 2 + x * scale, height / 2 + y * scale, size, size);
    }
    ctx.globalAlpha = 1;
  }
  function running() { return !userPaused && !reduced.matches && !hovering && !focused && visible && !document.hidden; }
  function tick(time) {
    if (!running()) { raf = 0; last = 0; return; }
    if (!last || time - last >= 33) { phase += last ? Math.min(time - last, 100) : 0; last = time; draw(); }
    raf = requestAnimationFrame(tick);
  }
  function sync() {
    button.disabled = reduced.matches;
    button.textContent = reduced.matches ? 'Движение отключено' : userPaused ? 'Продолжить движение' : 'Остановить движение';
    button.setAttribute('aria-pressed', String(userPaused));
    frame.dataset.motion = running() ? 'running' : 'paused';
    if (running() && !raf) raf = requestAnimationFrame(tick);
    if (!running() && raf) { cancelAnimationFrame(raf); raf = 0; last = 0; }
    if (reduced.matches) draw();
  }
  function resize() {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    width = canvas.clientWidth; height = canvas.clientHeight;
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); draw();
  }
  button.addEventListener('click', () => { userPaused = !userPaused; sync(); });
  frame.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') { hovering = true; sync(); } });
  frame.addEventListener('pointerleave', () => { hovering = false; sync(); });
  frame.addEventListener('focusin', () => { focused = true; sync(); });
  frame.addEventListener('focusout', event => { focused = frame.contains(event.relatedTarget); sync(); });
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(frame);
  new ResizeObserver(resize).observe(frame);
  resize(); frame.classList.add('cloud-ready'); sync();
}
