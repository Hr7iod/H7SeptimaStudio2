const frame = document.querySelector('#point-field');
const canvas = document.querySelector('#point-canvas');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const ctx = canvas.getContext('2d');
if (ctx) {
  const css = getComputedStyle(document.documentElement);
  const colors = ['--point-lo', '--point-mid', '--point-hi', '--color-accent-2'].map(name => css.getPropertyValue(name).trim());
  // Resolve the CSS palette once, then interpolate without per-point color parsing.
  const swatch = document.createElement('canvas'); swatch.width = colors.length; swatch.height = 1;
  const ink = swatch.getContext('2d');
  colors.forEach((color, index) => { ink.fillStyle = color; ink.fillRect(index, 0, 1, 1); });
  const rgb = ink.getImageData(0, 0, colors.length, 1).data;
  const mix = (a, b, amount) => a + (b - a) * amount;
  const palette = [0, 1, 2].map(layer => Array.from({ length: 256 }, (_, step) => {
    const light = step / 255;
    const channels = [0, 1, 2].map(channel => {
      const blue = mix(rgb[layer * 4 + channel], rgb[12 + channel], light);
      return Math.round(mix(blue, rgb[8 + channel], light ** 4 * .8));
    });
    return `rgb(${channels.join(',')})`;
  }));
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
  let visible = true;
  const pointer = { active: false, x: 0, y: 0, targetX: 0, targetY: 0, strength: 0 };
  function draw() {
    ctx.clearRect(0, 0, width, height);
    const scale = Math.min(width / 510, height / 420);
    const angle = reduced.matches ? .2 : .2 + Math.sin(phase / 4000) * .13;
    const scan = Math.sin(phase / 2400) * 270;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const radius = Math.min(105, width * .24);
    for (const p of points) {
      const x = p.x * ca + p.z * sa;
      const depth = p.z * ca - p.x * sa;
      const y = p.y + depth * .18;
      const screenX = width / 2 + x * scale;
      const screenY = height / 2 + y * scale;
      const dx = screenX - pointer.x, dy = screenY - pointer.y;
      const distance = Math.hypot(dx, dy);
      const light = Math.exp(-(distance ** 2) / (2 * (radius * .52) ** 2));
      const sweep = Math.exp(-(((p.x - scan) / 32) ** 2) / 2);
      const intensity = mix(sweep, light, pointer.strength);
      ctx.fillStyle = palette[p.layer][Math.round(intensity * 255)];
      const baseAlpha = p.layer === 2 ? .95 : .5;
      ctx.globalAlpha = baseAlpha + intensity * (1 - baseAlpha);
      const size = (1.35 + intensity * 1.3) * scale;
      ctx.fillRect(screenX, screenY, size, size);
    }
    ctx.globalAlpha = 1;
  }
  function running() { return !reduced.matches && visible && !document.hidden; }
  function tick(time) {
    if (!running()) {
      raf = 0; last = 0; frame.dataset.motion = 'paused';
      if (reduced.matches) draw();
      return;
    }
    if (!last || time - last >= 33) {
      const elapsed = last ? Math.min(time - last, 100) : 33;
      phase += last ? elapsed : 0;
      const follow = 1 - Math.exp(-elapsed / 55);
      pointer.x += (pointer.targetX - pointer.x) * follow;
      pointer.y += (pointer.targetY - pointer.y) * follow;
      pointer.strength = mix(pointer.strength, pointer.active ? 1 : 0, 1 - Math.exp(-elapsed / 160));
      last = time; draw();
    }
    raf = requestAnimationFrame(tick);
  }
  function sync() {
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
  function trackPointer(event) {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const bounds = canvas.getBoundingClientRect();
    pointer.targetX = event.clientX - bounds.left;
    pointer.targetY = event.clientY - bounds.top;
    if (!pointer.active) { pointer.x = pointer.targetX; pointer.y = pointer.targetY; }
    pointer.active = true;
    frame.dataset.pointer = 'active';
  }
  function leavePointer() { pointer.active = false; frame.dataset.pointer = 'idle'; }
  frame.addEventListener('pointerenter', trackPointer);
  frame.addEventListener('pointermove', trackPointer);
  frame.addEventListener('pointerleave', leavePointer);
  frame.addEventListener('pointercancel', leavePointer);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(frame);
  new ResizeObserver(resize).observe(frame);
  resize(); frame.classList.add('cloud-ready'); sync();
}
