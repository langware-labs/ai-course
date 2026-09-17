/* Mini Postman: the student builds a request, watches it fly, and sees what the
 * server received and answered.
 *
 * The "server" is a tiny bakery API living in this page — no network needed. It
 * behaves like a real one: it reads the method, the path, the query and the body,
 * and answers with a status line, headers and JSON (200, 201, 204, 400, 404, 405).
 *
 * Needs #labMethods, #labPath, #labQuick, #labBody, #labBodyBox, #labSend,
 * #labMethodTag, #labWire, #labServerIn, #labServerOut, #labHistory, #labHint.
 * Call window.__httpLab.show()/hide().
 */
(function () {
  'use strict';

  const HOST = 'bakery.flowpad.test';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const listeners = [];
  const emit = () => listeners.forEach(fn => { try { fn(publicState()); } catch (e) {} });

  /* ── The bakery, as a server would see it ────────────────────────────────── */
  const MENU = [
    { id: 1, name: 'חלה', type: 'bread', price: 18 },
    { id: 2, name: 'בגט', type: 'bread', price: 12 },
    { id: 3, name: 'קרואסון שוקולד', type: 'pastry', price: 9 },
    { id: 4, name: 'עוגת גבינה', type: 'cake', price: 65 },
    { id: 5, name: 'בורקס תפוחי אדמה', type: 'pastry', price: 8 }
  ];
  let orders = [{ id: 1832, item: 'חלה', qty: 2, status: 'baking' }];
  let nextOrder = 1833;

  // Answers like a real server: a status, headers and a body — or an error that explains itself.
  function bakery({ method, path, query, body }) {
    const json = (status, data, extra) => ({ status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extra || {}), body: data });
    const idIn = p => Number((p.match(/^\/orders\/(\d+)$/) || [])[1]);

    if (path === '/menu' && method === 'GET') {
      const items = query.type ? MENU.filter(m => m.type === query.type) : MENU;
      if (query.type && !items.length) return json(200, []);
      return json(200, items, { 'Cache-Control': 'max-age=60' });
    }
    if (path === '/menu' && method !== 'GET') return json(405, { error: 'method not allowed', allow: 'GET' }, { Allow: 'GET' });

    if (path === '/orders' && method === 'POST') {
      if (!body || typeof body !== 'object') return json(400, { error: 'body must be JSON' });
      if (!body.item) return json(400, { error: 'missing field', field: 'item' });
      const known = MENU.some(m => m.name === body.item);
      if (!known) return json(404, { error: 'we do not bake that', item: body.item });
      const order = { id: nextOrder++, item: body.item, qty: Number(body.qty) || 1, status: 'baking' };
      orders.push(order);
      return json(201, order, { Location: '/orders/' + order.id });
    }
    if (path === '/orders' && method === 'GET') return json(200, orders);

    const id = idIn(path);
    if (id) {
      const order = orders.find(o => o.id === id);
      if (!order) return json(404, { error: 'no such order', id });
      if (method === 'GET') return json(200, order);
      if (method === 'PUT') {
        if (!body || !body.qty) return json(400, { error: 'missing field', field: 'qty' });
        order.qty = Number(body.qty);
        return json(200, order);
      }
      if (method === 'DELETE') { orders = orders.filter(o => o.id !== id); return { status: 204, headers: {}, body: null }; }
    }
    return json(404, { error: 'not found', path });
  }

  /* ── What the student can try ────────────────────────────────────────────── */
  const QUICK = [
    { label: 'התפריט', method: 'GET', path: '/menu', why: 'הבקשה הכי פשוטה: תנו לי את התפריט.' },
    { label: 'רק לחמים', method: 'GET', path: '/menu?type=bread', why: 'הסימן ? בכתובת מוסיף פרטים לבקשה: רק type=bread.' },
    { label: 'להזמין חלה', method: 'POST', path: '/orders', body: '{\n  "item": "חלה",\n  "qty": 2\n}', why: 'POST שולח מידע חדש בגוף הבקשה.' },
    { label: 'לבטל הזמנה', method: 'DELETE', path: '/orders/1832', why: 'מספר ההזמנה הוא חלק מהכתובת.' },
    { label: 'כתובת שלא קיימת', method: 'GET', path: '/pizza', why: 'אין כזה דבר במאפייה.' },
    { label: 'הזמנה בלי שם מוצר', method: 'POST', path: '/orders', body: '{\n  "qty": 2\n}', why: 'שכחנו שדה — והשרת מסביר מה חסר.' }
  ];
  const METHODS = [
    { m: 'GET', tip: 'לקבל מידע', body: false },
    { m: 'POST', tip: 'לשלוח מידע חדש', body: true },
    { m: 'PUT', tip: 'לעדכן מידע קיים', body: true },
    { m: 'DELETE', tip: 'למחוק', body: false }
  ];
  const STATUS_HE = {
    200: 'הצליח', 201: 'נוצר חדש', 204: 'הצליח, בלי תוכן', 400: 'הבקשה לא תקינה',
    404: 'לא נמצא', 405: 'הפעולה לא מותרת כאן'
  };

  const state = { method: 'GET', path: '/menu', body: '', sending: false, last: null, count: 0 };

  /* ── Building the request text, exactly as it goes on the wire ───────────── */
  function parse() {
    const [path, qs] = state.path.split('?');
    const query = {};
    (qs || '').split('&').filter(Boolean).forEach(pair => {
      const [k, v] = pair.split('=');
      query[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return { path: path || '/', query, qs };
  }
  function headers() {
    const h = [['Host', HOST], ['Accept', 'application/json']];
    if (hasBody()) h.push(['Content-Type', 'application/json'], ['Content-Length', String(new Blob([state.body]).size)]);
    return h;
  }
  const hasBody = () => METHODS.find(m => m.m === state.method).body && state.body.trim();
  function requestText() {
    const lines = [`${state.method} ${state.path} HTTP/1.1`].concat(headers().map(([k, v]) => `${k}: ${v}`));
    return lines.join('\n') + (hasBody() ? '\n\n' + state.body : '');
  }
  function responseText(res) {
    const lines = [`HTTP/1.1 ${res.status} ${statusName(res.status)}`]
      .concat(Object.entries(res.headers).map(([k, v]) => `${k}: ${v}`));
    return lines.join('\n') + (res.body === null ? '' : '\n\n' + JSON.stringify(res.body, null, 2));
  }
  const statusName = s => ({ 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 404: 'Not Found', 405: 'Method Not Allowed' })[s] || '';
  const statusClass = s => s < 300 ? 'ok' : s < 400 ? 'redirect' : 'bad';

  /* ── Rendering ───────────────────────────────────────────────────────────── */
  function renderControls() {
    $('labMethods').innerHTML = METHODS.map(x =>
      `<button class="lab-method m-${x.m}${state.method === x.m ? ' on' : ''}" data-method="${x.m}" title="${x.tip}"><code>${x.m}</code><span>${x.tip}</span></button>`).join('');
    $('labQuick').innerHTML = QUICK.map((q, i) => `<button data-quick="${i}">${q.label}</button>`).join('');
    const withBody = METHODS.find(m => m.m === state.method).body;
    $('labBodyBox').hidden = !withBody;
    if ($('labPath').value !== state.path) $('labPath').value = state.path;
    if ($('labBody').value !== state.body) $('labBody').value = state.body;
    $('labSend').disabled = state.sending;
    const tag = $('labMethodTag');
    tag.textContent = state.method;
    tag.className = 'lab-url-method m-' + state.method;
  }

  // Colour the parts of the message the same way the HTTP slide does.
  function highlight(text) {
    const [first, ...rest] = text.split('\n');
    const head = first.replace(/^(\w+) (\S+) (\S+)$/, (_, m, p, v) =>
      `<b class="hl-method">${esc(m)}</b> <b class="hl-path">${esc(p)}</b> <span class="hl-dim">${esc(v)}</span>`)
      .replace(/^(HTTP\/1\.1) (\d{3})(.*)$/, (_, v, code, name) =>
        `<span class="hl-dim">${esc(v)}</span> <b class="hl-status s-${statusClass(Number(code))}">${esc(code)}${esc(name)}</b>`);
    const body = rest.join('\n').replace(/^([A-Za-z-]+):/gm, (_, k) => `<span class="hl-key">${esc(k)}:</span>`);
    return head + '\n' + body;
  }

  function renderHistory() {
    $('labHistory').innerHTML = state.history.map((h, i) =>
      `<button class="lab-hist" data-hist="${i}"><span class="m m-${h.method}">${h.method}</span><span class="p" dir="ltr">${esc(h.path)}</span>` +
      `<span class="s s-${statusClass(h.status)}">${h.status}</span></button>`).join('') || '<span class="lab-empty">הבקשות ששלחתם יופיעו כאן.</span>';
  }
  state.history = [];

  /* ── The packet flight between the two panels ────────────────────────────── */
  function fly(kind, text) {
    return new Promise(resolve => {
      const track = $('labWire').querySelector('.track');
      const pill = document.createElement('span');
      pill.className = 'pkt ' + kind;
      pill.textContent = text;
      track.appendChild(pill);
      const ends = $('labWire').querySelectorAll('.end');
      const [from, to] = kind === 'req' ? [ends[0], ends[1]] : [ends[1], ends[0]];
      from.classList.add('pulse');
      const done = () => {
        pill.remove(); from.classList.remove('pulse');
        to.classList.add('got'); setTimeout(() => to.classList.remove('got'), 400);
        resolve();
      };
      if (REDUCED) { setTimeout(done, 500); return; }
      const [a, b] = kind === 'req' ? ['100%', '0%'] : ['0%', '100%'];
      pill.animate([{ left: a, opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { left: b, opacity: 0 }],
        { duration: 1200, easing: 'cubic-bezier(.45,.05,.35,1)' }).finished.then(done, done);
    });
  }

  async function send(why) {
    if (state.sending) return;
    state.sending = true;
    renderControls();
    const { path, query } = parse();
    let body = null, bad = null;
    if (hasBody()) {
      try { body = JSON.parse(state.body); } catch (e) { bad = e.message; }
    }
    $('labServerIn').innerHTML = '<span class="lab-empty">מחכה לבקשה…</span>';
    $('labServerOut').innerHTML = '';
    await fly('req', state.method + ' ' + state.path);
    // The server reads what arrived, then answers.
    $('labServerIn').innerHTML = highlight(requestText());
    const res = bad
      ? { status: 400, headers: { 'Content-Type': 'application/json' }, body: { error: 'body is not valid JSON', detail: bad } }
      : bakery({ method: state.method, path, query, body });
    await new Promise(r => setTimeout(r, REDUCED ? 100 : 450));
    $('labServerOut').innerHTML = highlight(responseText(res));
    await fly('res', res.status + ' ' + statusName(res.status));
    state.last = { method: state.method, path: state.path, status: res.status };
    state.count++;
    state.history.unshift(state.last);
    state.history = state.history.slice(0, 4);
    renderHistory();
    $('labHint').innerHTML = (why ? why + ' ' : '') +
      `<b class="s-${statusClass(res.status)}">${res.status} — ${STATUS_HE[res.status] || ''}</b>`;
    state.sending = false;
    renderControls();
    emit();
  }

  function publicState() {
    return { sent: state.count, building: { method: state.method, path: state.path }, last: state.last };
  }

  let wired = false;
  function wire() {
    $('labMethods').addEventListener('click', e => {
      const b = e.target.closest('[data-method]');
      if (!b) return;
      state.method = b.dataset.method;
      if (METHODS.find(m => m.m === state.method).body && !state.body.trim()) state.body = '{\n  "item": "חלה",\n  "qty": 1\n}';
      renderControls();
    });
    $('labQuick').addEventListener('click', e => {
      const b = e.target.closest('[data-quick]');
      if (!b) return;
      const q = QUICK[Number(b.dataset.quick)];
      state.method = q.method; state.path = q.path; state.body = q.body || '';
      renderControls();
      send(q.why);
    });
    $('labHistory').addEventListener('click', e => {
      const b = e.target.closest('[data-hist]');
      if (!b) return;
      const h = state.history[Number(b.dataset.hist)];
      state.method = h.method; state.path = h.path;
      renderControls();
    });
    $('labPath').addEventListener('input', e => { state.path = e.target.value; renderControls(); });
    $('labPath').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    $('labBody').addEventListener('input', e => { state.body = e.target.value; renderControls(); });
    $('labSend').addEventListener('click', () => send());
  }

  window.__httpLab = {
    show() {
      if (!$('labMethods')) return;
      if (!wired) { wire(); wired = true; renderControls(); renderHistory(); }
    },
    hide() {},
    state: publicState,
    onChange(fn) { listeners.push(fn); }
  };
})();
