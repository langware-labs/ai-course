/* A solved exercise ends in confetti and a big "כל הכבוד!".
 * window.__celebrate(sub) — `sub` is an optional smaller line under the headline.
 * The HTML module runs in a frame inside the lecture page; it calls the lecture's
 * own __celebrate so the burst covers the whole screen, not just the frame. */
(function () {
  const COLORS = ['#B8461F', '#1F5F5B', '#E8A33D', '#4A7A3C', '#7A4FB8', '#F5C99B'];
  let layer = null, timer = null;

  function style() {
    if (document.getElementById('celebrate-style')) return;
    const st = document.createElement('style');
    st.id = 'celebrate-style';
    st.textContent = `
      .celebrate { position: fixed; inset: 0; z-index: 100000; pointer-events: none; display: grid; place-items: center; }
      .celebrate canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
      .celebrate .bravo { position: relative; text-align: center; direction: rtl; font-family: 'Rubik', 'Bricolage Grotesque', system-ui, sans-serif;
        background: rgba(255, 250, 242, .94); border: 2px solid #4A7A3C; border-radius: 18px; padding: 26px 48px 22px;
        box-shadow: 0 24px 60px -24px rgba(30, 24, 20, .55); animation: bravo-in 420ms cubic-bezier(.2, 1.4, .4, 1) both; }
      .celebrate .bravo b { display: block; font-size: clamp(44px, 8vw, 88px); line-height: 1.05; font-weight: 800; color: #3F5B36; letter-spacing: -.02em; }
      .celebrate .bravo span { display: block; margin-top: 8px; font-size: 18px; color: #4A3E33; }
      .celebrate.out { transition: opacity 400ms ease; opacity: 0; }
      @keyframes bravo-in { from { transform: scale(.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    `;
    document.head.appendChild(st);
  }

  function confetti(canvas) {
    const dpr = window.devicePixelRatio || 1, w = innerWidth, h = innerHeight;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const bits = Array.from({ length: 180 }, (_, n) => {
      const fromLeft = n % 2 === 0, a = (fromLeft ? -60 : -120) * Math.PI / 180 + (Math.random() - .5) * .9;
      const v = 11 + Math.random() * 9;
      return { x: fromLeft ? 0 : w, y: h * .75, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
               s: 6 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - .5) * .4,
               c: COLORS[n % COLORS.length] };
    });
    const t0 = performance.now();
    (function frame(t) {
      if (!canvas.isConnected) return;
      ctx.clearRect(0, 0, w, h);
      for (const b of bits) {
        b.vy += .32; b.vx *= .99; b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r); ctx.fillStyle = b.c;
        ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2); ctx.restore();
      }
      if (t - t0 < 3200) requestAnimationFrame(frame);
    })(t0);
  }

  window.__celebrate = function (sub) {
    style();
    if (layer) layer.remove();
    clearTimeout(timer);
    layer = document.createElement('div');
    layer.className = 'celebrate';
    layer.innerHTML = '<canvas></canvas><div class="bravo"><b>כל הכבוד!</b>' + (sub ? '<span></span>' : '') + '</div>';
    if (sub) layer.querySelector('span').textContent = sub;
    document.body.appendChild(layer);
    confetti(layer.querySelector('canvas'));
    const el = layer;
    timer = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 2400);
  };
})();
