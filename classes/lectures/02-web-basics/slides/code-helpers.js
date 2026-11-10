/* Smart CSS pickers for the lesson code editors.
 *
 * Put the cursor on a CSS value and a small picker opens under that line:
 *   color / background / border-color …  → swatches + full color picker
 *   font-family                          → font stacks, each shown in its own font
 *   font-size                            → slider
 * Picking writes the value back into the code, so the student still sees (and
 * owns) the CSS text — the picker only saves typing.
 *
 * Framework-free: attaches to any <textarea data-code-editor> and to the
 * dark code textarea of the HTML module (which is rendered by its own bundle).
 */
(function () {
  if (window.__codeHelpers) return;
  window.__codeHelpers = true;

  const SWATCHES = ['#B8461F', '#E4572E', '#F3A712', '#29335C', '#1F5F5B', '#4A7A3C', '#7A4FB8', '#D6336C',
                    '#1E1814', '#5A4B3D', '#8E7B62', '#E0D0B7', '#FBF3E7', '#FFFFFF', 'crimson', 'tomato', 'gold', 'teal', 'navy', 'orchid'];
  const FONTS = [
    ['Georgia, serif', 'Classic serif'],
    ["'Times New Roman', serif", 'Newspaper'],
    ['system-ui, sans-serif', 'Clean & modern'],
    ['Arial, sans-serif', 'Simple sans'],
    ['Verdana, sans-serif', 'Wide & readable'],
    ["'Trebuchet MS', sans-serif", 'Friendly'],
    ["'Courier New', monospace", 'Typewriter'],
    ["'Comic Sans MS', cursive", 'Playful'],
    ['Impact, sans-serif', 'LOUD HEADLINE']
  ];
  const COLOR_PROPS = /^(color|background|background-color|border|border-color|border-top|border-bottom|border-left|border-right|outline|outline-color|fill|stroke|text-decoration-color|caret-color|box-shadow)$/i;

  const css = `
  .ch-pop { position: fixed; z-index: 2147483000; background: #2A221C; color: #F0E4D2; border: 1px solid #4A3E33; border-radius: 10px;
            box-shadow: 0 18px 40px -12px rgba(0,0,0,.55); padding: 10px 12px 12px; font: 12px/1.4 'JetBrains Mono', ui-monospace, monospace;
            min-width: 240px; max-width: 320px; }
  .ch-pop[hidden] { display: none; }
  .ch-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 9px; color: #C9B79C; letter-spacing: .06em; }
  .ch-head b { color: #F0E4D2; font-weight: 700; letter-spacing: 0; }
  .ch-x { background: none; border: 0; color: #8E7B62; font-size: 16px; line-height: 1; cursor: pointer; padding: 0 2px; }
  .ch-x:hover { color: #F0E4D2; }
  .ch-sw { display: grid; grid-template-columns: repeat(10, 1fr); gap: 5px; margin-bottom: 10px; }
  .ch-sw button { width: 100%; aspect-ratio: 1; border-radius: 5px; border: 1px solid rgba(255,255,255,.18); cursor: pointer; padding: 0; }
  .ch-sw button:hover { transform: scale(1.15); }
  .ch-sw button.on { outline: 2px solid #F3A712; outline-offset: 1px; }
  .ch-row { display: flex; align-items: center; gap: 8px; }
  .ch-row input[type=color] { width: 38px; height: 28px; border: 1px solid #4A3E33; border-radius: 6px; background: none; padding: 0; cursor: pointer; }
  .ch-row .ch-val { flex: 1; background: #1E1814; border: 1px solid #4A3E33; border-radius: 6px; padding: 5px 8px; color: #F0E4D2; font: inherit; }
  .ch-fonts { display: grid; gap: 3px; max-height: 260px; overflow-y: auto; }
  .ch-fonts button { display: grid; grid-template-columns: 1fr auto; align-items: baseline; gap: 10px; text-align: left; background: none; border: 1px solid transparent;
                     border-radius: 6px; padding: 6px 8px; color: #F0E4D2; cursor: pointer; }
  .ch-fonts button:hover { background: #3A3028; }
  .ch-fonts button.on { border-color: #F3A712; }
  .ch-fonts .name { font-size: 17px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ch-fonts .hint { font: 10.5px 'JetBrains Mono', monospace; color: #8E7B62; }
  .ch-size { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 12px; }
  .ch-size input[type=range] { width: 100%; accent-color: #F3A712; }
  .ch-size output { min-width: 52px; text-align: right; color: #F3A712; font-weight: 700; }
  .ch-sample { margin-top: 8px; color: #F0E4D2; font-family: Georgia, serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  const pop = document.createElement('div');
  pop.className = 'ch-pop';
  pop.hidden = true;
  const mount = () => document.body && !pop.isConnected && document.body.appendChild(pop);

  let active = null; // { ta, start, end, prop, value }

  /* ── find the CSS declaration value under the cursor ───────────────────── */
  function declarationAt(text, caret) {
    const lineStart = text.lastIndexOf('\n', caret - 1) + 1;
    let lineEnd = text.indexOf('\n', caret);
    if (lineEnd === -1) lineEnd = text.length;
    const line = text.slice(lineStart, lineEnd);
    const re = /([a-z-]+)\s*:\s*([^;{}\n]*)/gi;
    let m;
    while ((m = re.exec(line))) {
      const prop = m[1].toLowerCase();
      const valueStart = lineStart + m.index + m[0].length - m[2].length;
      const rawValue = m[2];
      const value = rawValue.replace(/\s+$/, '');
      const valueEnd = valueStart + value.length;
      const declStart = lineStart + m.index;
      if (caret < declStart || caret > valueEnd + 1) continue;
      if (!insideStyle(text, caret)) return null;
      return { prop, start: valueStart, end: valueEnd, value };
    }
    return null;
  }

  // Only inside <style>…</style>, inside a style="…" attribute, or in a pure CSS file.
  function insideStyle(text, caret) {
    const before = text.slice(0, caret);
    const open = before.lastIndexOf('<style'), close = before.lastIndexOf('</style');
    if (open > close) return true;
    const attr = before.lastIndexOf('style="');
    if (attr !== -1 && before.indexOf('"', attr + 7) === -1) return true;
    return !/<[a-z!]/i.test(text); // a stylesheet with no markup at all
  }

  /* ── color helpers ─────────────────────────────────────────────────────── */
  const probe = document.createElement('canvas').getContext('2d');
  function toHex(value) {
    const token = (value.match(/#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b[a-z]+\b/gi) || []).find(t => {
      probe.fillStyle = '#010203'; probe.fillStyle = t;
      return probe.fillStyle !== '#010203' || /^#010203$/i.test(t);
    });
    if (!token) return null;
    probe.fillStyle = token;
    const v = probe.fillStyle;
    return { token, hex: v.startsWith('#') ? v : rgbToHex(v) };
  }
  function rgbToHex(rgb) {
    const n = (rgb.match(/[\d.]+/g) || []).slice(0, 3).map(x => Math.round(Number(x)));
    return '#' + n.map(x => x.toString(16).padStart(2, '0')).join('');
  }

  /* ── write a new value into the editor the framework can see ───────────── */
  function writeValue(newValue, keepOpen) {
    if (!active) return;
    const { ta, start, end } = active;
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    const next = ta.value.slice(0, start) + newValue + ta.value.slice(end);
    setter.call(ta, next);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    active.end = start + newValue.length;
    active.value = newValue;
    ta.focus();
    ta.setSelectionRange(active.end, active.end);
    if (!keepOpen) close();
  }

  /* ── pickers ───────────────────────────────────────────────────────────── */
  function head(label) {
    return '<div class="ch-head"><span>' + label + '</span><button class="ch-x" data-close title="Close (Esc)">×</button></div>';
  }
  function colorPicker(decl) {
    const found = toHex(decl.value);
    const current = found ? found.hex.toLowerCase() : '#b8461f';
    pop.innerHTML = head('<b>' + decl.prop + '</b> · pick a color') +
      '<div class="ch-sw">' + SWATCHES.map(c => {
        probe.fillStyle = c; const hex = probe.fillStyle.toLowerCase();
        return '<button style="background:' + c + '" title="' + c + '" data-color="' + c + '"' + (hex === current ? ' class="on"' : '') + '></button>';
      }).join('') + '</div>' +
      '<div class="ch-row"><input type="color" value="' + current + '" title="Any color"><input class="ch-val" value="' + (found ? found.token : decl.value) + '" spellcheck="false"></div>';
    pop.querySelectorAll('[data-color]').forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); replaceColor(decl, b.dataset.color); }));
    const wheel = pop.querySelector('input[type=color]');
    wheel.addEventListener('input', () => replaceColor(decl, wheel.value, true));
    const text = pop.querySelector('.ch-val');
    text.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); replaceColor(decl, text.value.trim()); } });
  }
  function replaceColor(decl, color, keepOpen) {
    const found = toHex(active.value);
    // Keep the rest of shorthand values (e.g. "1px solid <color>").
    const next = found ? active.value.replace(found.token, color) : color;
    writeValue(next, keepOpen);
    if (keepOpen) { const v = pop.querySelector('.ch-val'); if (v) v.value = color; }
  }
  function fontPicker(decl) {
    const current = decl.value.replace(/\s+/g, ' ').trim().toLowerCase();
    pop.innerHTML = head('<b>font-family</b> · pick a font') +
      '<div class="ch-fonts">' + FONTS.map(([stack, hint]) =>
        '<button data-font="' + stack.replace(/"/g, '&quot;') + '"' + (stack.toLowerCase() === current ? ' class="on"' : '') + '>' +
        '<span class="name" style="font-family:' + stack.replace(/"/g, '&quot;') + '">' + stack.split(',')[0].replace(/'/g, '') + '</span>' +
        '<span class="hint">' + hint + '</span></button>').join('') + '</div>';
    pop.querySelectorAll('[data-font]').forEach(b => b.addEventListener('mousedown', e => { e.preventDefault(); writeValue(b.dataset.font); }));
  }
  function sizePicker(decl) {
    const m = decl.value.match(/^(\d+(?:\.\d+)?)(px|rem|em|%)?$/);
    const unit = (m && m[2]) || 'px';
    const max = unit === 'px' ? 96 : unit === '%' ? 300 : 6;
    const step = unit === 'px' || unit === '%' ? 1 : 0.1;
    const now = m ? Number(m[1]) : 16;
    pop.innerHTML = head('<b>font-size</b> · drag to resize') +
      '<div class="ch-size"><input type="range" min="' + step + '" max="' + max + '" step="' + step + '" value="' + now + '"><output>' + now + unit + '</output></div>' +
      '<div class="ch-sample" style="font-size:' + Math.min(now, 40) + unit + '">Aa The quick brown fox</div>';
    const range = pop.querySelector('input'), out = pop.querySelector('output'), sample = pop.querySelector('.ch-sample');
    range.addEventListener('input', () => {
      const v = range.value + unit;
      out.textContent = v; sample.style.fontSize = Math.min(Number(range.value), unit === 'px' ? 40 : max) + unit;
      writeValue(v, true);
    });
  }

  /* ── placement: right under the line being edited ──────────────────────── */
  function place(ta, index) {
    const cs = getComputedStyle(ta);
    const lineHeight = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.6;
    const line = ta.value.slice(0, index).split('\n').length - 1;
    const col = index - (ta.value.lastIndexOf('\n', index - 1) + 1);
    probe.font = cs.fontSize + ' ' + cs.fontFamily;
    const charW = probe.measureText('M').width || 8;
    const r = ta.getBoundingClientRect();
    let top = r.top + parseFloat(cs.paddingTop) + (line + 1) * lineHeight - ta.scrollTop + 4;
    let left = r.left + parseFloat(cs.paddingLeft) + col * charW - ta.scrollLeft;
    const w = pop.offsetWidth || 260, h = pop.offsetHeight || 150;
    if (top + h > innerHeight - 8) top = Math.max(8, top - h - lineHeight - 8);
    left = Math.min(Math.max(8, left), innerWidth - w - 8);
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
  }

  function isEditor(el) {
    return el && el.tagName === 'TEXTAREA' && (el.hasAttribute('data-code-editor') || (!el.placeholder && el.spellcheck === false));
  }

  function update(ta) {
    if (!isEditor(ta)) return;
    if (ta.selectionStart !== ta.selectionEnd) return close();
    const decl = declarationAt(ta.value, ta.selectionStart);
    let kind = null;
    if (decl) {
      if (decl.prop === 'font-family') kind = 'font';
      else if (decl.prop === 'font-size') kind = 'size';
      else if (COLOR_PROPS.test(decl.prop) && (toHex(decl.value) || decl.value === '')) kind = 'color';
    }
    if (!kind) return close();
    const same = active && active.ta === ta && active.start === decl.start && active.prop === decl.prop && !pop.hidden;
    active = { ta, start: decl.start, end: decl.end, prop: decl.prop, value: decl.value };
    if (same) return; // don't rebuild while the student drags a slider or types
    mount();
    if (kind === 'color') colorPicker(decl);
    else if (kind === 'font') fontPicker(decl);
    else sizePicker(decl);
    pop.hidden = false;
    place(ta, decl.start);
  }
  function close() { pop.hidden = true; active = null; }

  document.addEventListener('click', e => { if (isEditor(e.target)) update(e.target); }, true);
  document.addEventListener('keyup', e => {
    if (e.key === 'Escape') return close();
    if (isEditor(e.target) && /^(Arrow|Home|End|Page)/.test(e.key)) update(e.target);
  }, true);
  document.addEventListener('mousedown', e => {
    if (pop.hidden || pop.contains(e.target) || isEditor(e.target)) return;
    close();
  }, true);
  // Capture, to catch the textarea's own scroll; passive, because this only
  // ever closes a popup and never cancels the scroll.
  document.addEventListener('scroll', e => { if (active && e.target === active.ta) close(); }, { capture: true, passive: true });
  pop.addEventListener('mousedown', e => { if (e.target.closest('[data-close]')) { e.preventDefault(); close(); } });
  // Typing changes the code under the picker: re-evaluate after the edit settles.
  document.addEventListener('input', e => { if (isEditor(e.target) && e.isTrusted) setTimeout(() => update(e.target), 0); }, true);
})();
