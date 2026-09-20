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

  const HOST = 'bakery.flowpad.test';  // the Host header; the API itself is window.__bakery
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const listeners = [];
  const emit = () => listeners.forEach(fn => { try { fn(publicState()); } catch (e) {} });

  /* The bakery is `bakery-api.js`, shared with the exercise module on the next
   * step — same address, same menu, same answers. */
  const bakery = req => window.__bakery.handle(req);

  /* ── Three routes the lab adds on top of the bakery: a picture of the cake you
   * want, the order form, and a voice note. They keep what they receive, so the
   * student can see the file the server saved and read the details it answered. */
  const saved = { uploads: [], messages: [], notes: [] };
  const rid = () => { const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let o = ''; for (let n = 0; n < 5; n++) o += abc[Math.floor(Math.random() * abc.length)]; return o; };
  const two = n => String(n).padStart(2, '0');

  function labRoutes({ method, path, body, file }) {
    const json = (status, b, extra) => ({ status, headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, extra || {}), body: b });
    if (path === '/uploads') {
      if (method !== 'POST') return json(405, { error: 'Send the picture with POST' }, { Allow: 'POST' });
      if (!file) return json(400, { error: 'no file in the request', field: 'file' });
      const d = new Date();
      const ext = (file.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
      const saved_as = `cake-${d.getFullYear()}${two(d.getMonth() + 1)}${two(d.getDate())}-${rid()}.${ext}`;
      const rec = { file_id: 'IMG-' + rid(), saved_as, original_name: file.name, content_type: file.type, size_bytes: file.size, url: '/files/' + saved_as, src: file.src };
      saved.uploads.push(rec);
      return json(201, { file_id: rec.file_id, saved_as, original_name: rec.original_name, content_type: rec.content_type, size_bytes: rec.size_bytes, url: rec.url }, { Location: rec.url });
    }
    if (path === '/messages') {
      if (method !== 'POST') return json(405, { error: 'Send the form with POST' }, { Allow: 'POST' });
      if (!body || typeof body !== 'object') return json(400, { error: 'the form must arrive as JSON' });
      for (const f of ['name', 'pickup_time']) if (!body[f]) return json(400, { error: 'missing field', field: f });
      const d = new Date();
      const rec = { message_id: 'MSG-' + rid(), name: body.name, phone: body.phone || null, pickup_time: body.pickup_time, note: body.note || null,
        submitted_at: `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}T${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`, status: 'received' };
      saved.messages.push(rec);
      return json(201, rec, { Location: '/messages/' + rec.message_id });
    }
    if (path === '/voice-notes') {
      if (method !== 'POST') return json(405, { error: 'Send the recording with POST' }, { Allow: 'POST' });
      if (!file) return json(400, { error: 'no recording in the request', field: 'audio' });
      const rec = { note_id: 'SND-' + rid(), saved_as: `note-${rid()}.webm`, content_type: file.type || 'audio/webm',
        seconds: file.seconds, size_bytes: file.size, url: '/files/note-' + rid() + '.webm', src: file.src };
      saved.notes.push(rec);
      return json(201, { note_id: rec.note_id, saved_as: rec.saved_as, content_type: rec.content_type, seconds: rec.seconds, size_bytes: rec.size_bytes, url: rec.url });
    }
    return null;
  }

  /* ── What the student can try ────────────────────────────────────────────── */
  const QUICK = [
    { label: 'התפריט', method: 'GET', path: '/menu', why: 'הבקשה הכי פשוטה: תנו לי את התפריט.' },
    { label: 'רק לחמים', method: 'GET', path: '/menu?type=bread', why: 'הסימן ? בכתובת מוסיף פרטים לבקשה: רק type=bread.' },
    { label: 'להזמין לחם', method: 'POST', path: '/orders', body: '{\n  "item_id": 1,\n  "quantity": 2\n}', why: 'POST שולח מידע חדש בגוף הבקשה.' },
    { label: 'ההזמנות שלי', method: 'GET', path: '/orders', why: 'אותה כתובת, פעולה אחרת — וקוראים במקום ליצור.' },
    { label: 'לבטל הזמנה', method: 'DELETE', path: '/orders/BK-7K2QM', why: 'מספר ההזמנה הוא חלק מהכתובת.' },
    { label: 'כתובת שלא קיימת', method: 'GET', path: '/pizza', why: 'אין כזה דבר במאפייה.' },
    { label: 'הזמנה בלי מוצר', method: 'POST', path: '/orders', body: '{\n  "quantity": 2\n}', why: 'שכחנו שדה — והשרת מסביר מה חסר.' }
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

  /* ── Exercises: every answer is read off the server's own reply ──────────── */
  const norm = t => String(t).trim().toLowerCase().replace(/["'.,]/g, ' ').replace(/\s+/g, ' ');
  const has = (t, w) => norm(t).includes(norm(w));
  const TASKS = [
    {
      q: 'אילו <b>מאפים</b> (pastry) יש בתפריט של המאפייה? כתבו את שניהם.',
      how: 'שלחו <code dir="ltr">GET /menu</code> וחפשו בתשובה את השדה <code dir="ltr">type</code> — או בקשו ישר <code dir="ltr">/menu?type=pastry</code>.',
      todo: 'לשלוח בקשה לתפריט ולמצוא את שני המאפים',
      check: a => (has(a, 'croissant') || has(a, 'קרואסון')) && (has(a, 'cinnamon') || has(a, 'קינמון')),
      nudge: 'שני מוצרים בתפריט מסומנים <code dir="ltr">"type": "pastry"</code>. מה ה-<code dir="ltr">name</code> שלהם?'
    },
    {
      q: 'כמה עולה <code dir="ltr">Sourdough</code>?',
      how: 'אותה תשובה של השרת, שדה אחר: <code dir="ltr">price</code>.',
      todo: 'לקרוא את המחיר מתוך התשובה',
      check: a => /(^|\D)18(\D|$)/.test(a),
      nudge: 'מצאו בתשובה את השורה של <code dir="ltr">Sourdough</code>, ובתוכה את <code dir="ltr">price</code>.'
    },
    {
      q: 'איזה קוד תשובה מחזיר השרת לכתובת שלא קיימת, למשל <code dir="ltr">/pizza</code>?',
      how: 'שנו את הכתובת בשורה למעלה ושלחו. הקוד הוא המספר בשורה הראשונה של התשובה.',
      todo: 'לשלוח בקשה לכתובת שלא קיימת ולקרוא את הקוד',
      check: a => /404/.test(a),
      nudge: 'הסתכלו בשורה <code dir="ltr">HTTP/1.1 …</code> בתשובה של השרת.'
    },
    {
      q: 'הזמינו <b>3 קרואסונים</b> — ורשמו את מספר ההזמנה שהשרת יצר.',
      how: 'בחרו <code dir="ltr">POST</code>, כתובת <code dir="ltr">/orders</code>, ובגוף הבקשה <code dir="ltr">item_id</code> ו-<code dir="ltr">quantity</code>. את ה-<code dir="ltr">item_id</code> תמצאו בתפריט.',
      todo: 'לשלוח הזמנה אמיתית ולרשום את מספר ההזמנה',
      check: a => orders().some(o => has(o.item, 'croissant') && o.quantity === 3 && norm(o.order_id) === norm(a)),
      nudge: 'צריך גם לשלוח את ההזמנה באמת (3 יחידות של הקרואסון), וגם להעתיק את <code dir="ltr">order_id</code> מהתשובה.'
    },
    {
      q: 'העלו תמונה של העוגה שאתם רוצים. <b>באיזה שם השרת שמר אותה?</b>',
      how: 'לחצו על <b>🖼️ העלאת תמונה</b>, בחרו תמונה מהמחשב ושלחו. השם נמצא בתשובה, בשדה <code dir="ltr">saved_as</code>.',
      todo: 'להעלות תמונה ולקרוא את השם שהשרת נתן לה',
      check: a => saved.uploads.some(u => norm(u.saved_as) === norm(a)),
      nudge: 'השרת לא שומר את השם שלכם — הוא נותן שם משלו. העתיקו בדיוק את מה שכתוב ב-<code dir="ltr">saved_as</code>.'
    },
    {
      q: 'מלאו ושלחו את טופס ההזמנה. <b>באיזו שעה השרת קיבל אותו?</b> (שעה:דקה)',
      how: 'לחצו על <b>📝 טופס הזמנה</b>, מלאו לפחות שם ושעת איסוף, ושלחו. חפשו בתשובה את <code dir="ltr">submitted_at</code>.',
      todo: 'לשלוח את הטופס ולקרוא את שעת הקבלה',
      check: a => saved.messages.some(m => { const hm = m.submitted_at.slice(11, 16); return norm(a).includes(norm(hm)); }),
      nudge: 'ב-<code dir="ltr">submitted_at</code> יש תאריך ואחריו האות T. השעה היא מה שבא אחריה — שעה:דקה.'
    },
    {
      q: 'הקליטו הודעה קולית ושלחו. <b>כמה שניות היא אורכת</b> לפי השרת?',
      how: 'לחצו על <b>🎤 הקלטה</b>, הקליטו, שלחו — ואפשר גם להאזין למה שנשמר. המספר נמצא בשדה <code dir="ltr">seconds</code>.',
      todo: 'להקליט, לשלוח, ולקרוא את אורך ההקלטה',
      check: a => { const n = parseFloat(String(a).replace(',', '.')); return !isNaN(n) && saved.notes.some(v => Math.abs(v.seconds - n) <= 0.6); },
      nudge: 'קראו את <code dir="ltr">seconds</code> בתשובה של השרת — הוא מודד את מה שבאמת הגיע אליו.'
    }
  ];
  // What the bakery holds right now — the same server the student is talking to.
  const orders = () => (bakery({ method: 'GET', path: '/orders' }).body) || [];

  /* Four ways to build a request: by hand, or the three that carry something with
   * them — a picture, a filled form, a recording. */
  const ACTIONS = [
    { id: 'free', label: 'בקשה חופשית', hint: 'בחרו שיטה וכתובת, ושלחו.' },
    { id: 'image', label: '🖼️ העלאת תמונה', method: 'POST', path: '/uploads', hint: 'בחרו תמונה מהמחשב — היא נשלחת לשרת, והשרת שומר אותה בשם משלו.' },
    { id: 'form', label: '📝 טופס הזמנה', method: 'POST', path: '/messages', hint: 'מלאו את הטופס. מה שכתבתם הופך ל-JSON — וזה מה שנשלח.' },
    { id: 'audio', label: '🎤 הקלטה', method: 'POST', path: '/voice-notes', hint: 'הקליטו הודעה קולית קצרה, שלחו — ואפשר להאזין למה שהשרת שמר.' }
  ];
  /** What a status code means, and when you get it — shown under a clicked row. */
  const STATUS_WHY = {
    200: 'הבקשה הצליחה, והתשובה מכילה את מה שביקשתם.',
    201: 'השרת יצר משהו חדש בעקבות הבקשה — הזמנה, תמונה, הודעה — ומחזיר את הפרטים שלו.',
    204: 'הצליח, ואין מה להחזיר. קורה בדרך כלל אחרי מחיקה.',
    400: 'הבקשה עצמה לא תקינה: חסר שדה, או שהערך לא מתאים. הגוף של התשובה מסביר מה בדיוק.',
    404: 'השרת לא מצא כלום בכתובת הזאת. או שהכתובת שגויה, או שהדבר שביקשתם לא קיים.',
    405: 'הכתובת קיימת, אבל לא בשיטה הזאת — למשל ניסיתם למחוק משהו שאפשר רק לקרוא.'
  };

  const state = { method: 'GET', path: '/menu', body: '', sending: false, last: null, count: 0, task: 0, solved: [],
                  action: 'free', file: null, form: { name: '', phone: '', pickup_time: '', note: '' }, recording: false };

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
    if (state.file) h.push(['Content-Type', 'multipart/form-data; boundary=boundary'], ['Content-Length', String(state.file.size)]);
    else if (hasBody()) h.push(['Content-Type', 'application/json'], ['Content-Length', String(new Blob([state.body]).size)]);
    return h;
  }
  const hasBody = () => METHODS.find(m => m.m === state.method).body && state.body.trim();
  function requestText() {
    const lines = [`${state.method} ${state.path} HTTP/1.1`].concat(headers().map(([k, v]) => `${k}: ${v}`));
    if (state.file) {
      return lines.join('\n') + `\n\n--boundary\nContent-Disposition: form-data; name="file"; filename="${state.file.name}"\n` +
        `Content-Type: ${state.file.type}\n\n<${Math.round(state.file.size / 1024)} KB של בתים — לא טקסט>\n--boundary--`;
    }
    return lines.join('\n') + (hasBody() ? '\n\n' + state.body : '');
  }
  function responseText(res) {
    const lines = [`HTTP/1.1 ${res.status} ${statusName(res.status)}`]
      .concat(Object.entries(res.headers).map(([k, v]) => `${k}: ${v}`));
    return lines.join('\n') + (res.body === null ? '' : '\n\n' + JSON.stringify(res.body, null, 2));
  }
  const statusName = s => ({ 200: 'OK', 201: 'Created', 204: 'No Content', 400: 'Bad Request', 404: 'Not Found', 405: 'Method Not Allowed' })[s] || '';
  const statusClass = s => s < 300 ? 'ok' : s < 400 ? 'redirect' : 'bad';

  /* ── The three carrying actions ──────────────────────────────────────────── */
  function pickAction(id) {
    const a = ACTIONS.find(x => x.id === id);
    state.action = id;
    state.file = null;
    if (a.method) { state.method = a.method; state.path = a.path; }
    if (id === 'form') syncForm(); else if (id !== 'free') state.body = '';
    $('labHint').textContent = a.hint;
    renderControls();
    renderAction();
  }
  function syncForm() {
    const f = state.form;
    const body = { name: f.name, phone: f.phone, pickup_time: f.pickup_time, note: f.note };
    Object.keys(body).forEach(k => { if (!body[k]) delete body[k]; });
    state.body = JSON.stringify(body, null, 2);
  }

  function renderAction() {
    const box = $('labAction');
    if (state.action === 'image') {
      box.innerHTML = `<label class="lab-file"><input type="file" id="labImage" accept="image/*"><span>בחרו תמונה…</span></label><div id="labPreview" class="lab-preview"></div>`;
      $('labImage').addEventListener('change', e => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = () => {
          state.file = { name: f.name, type: f.type, size: f.size, src: reader.result };
          $('labPreview').innerHTML = `<img src="${reader.result}" alt="התמונה שבחרתם"><span>${esc(f.name)} · ${Math.round(f.size / 1024)} KB</span>`;
          renderControls();
        };
        reader.readAsDataURL(f);
      });
    } else if (state.action === 'form') {
      const f = state.form;
      box.innerHTML = `<div class="lab-form">
        <label>שם<input data-f="name" value="${esc(f.name)}" placeholder="נועה"></label>
        <label>טלפון<input data-f="phone" value="${esc(f.phone)}" placeholder="050…"></label>
        <label>שעת איסוף<input data-f="pickup_time" value="${esc(f.pickup_time)}" placeholder="17:30"></label>
        <label>הערה<input data-f="note" value="${esc(f.note)}" placeholder="בלי אגוזים"></label>
      </div>`;
      box.querySelectorAll('[data-f]').forEach(inp => inp.addEventListener('input', e => {
        state.form[e.target.dataset.f] = e.target.value;
        syncForm();
        renderControls();
      }));
    } else if (state.action === 'audio') {
      box.innerHTML = `<div class="lab-rec"><button id="labRec">● הקלטה</button><span id="labRecMsg">עד 10 שניות</span></div><div id="labRecPlay"></div>`;
      $('labRec').addEventListener('click', toggleRecord);
    } else {
      box.innerHTML = '';
    }
  }

  /* Records from the microphone; if there is none (or permission is refused) it
   * records a short beep instead, so the lesson still works. */
  let recorder = null, chunks = [], recStart = 0, recTimer = null;
  async function toggleRecord() {
    if (state.recording) return stopRecord();
    let stream, synthetic = false;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (e) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const dest = ctx.createMediaStreamDestination();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440; gain.gain.value = 0.15;
      osc.connect(gain).connect(dest); osc.start();
      stream = dest.stream; synthetic = true;
    }
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = e => chunks.push(e.data);
    recorder.onstop = () => {
      const seconds = Math.max(0.1, Math.round(((Date.now() - recStart) / 1000) * 10) / 10);
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      const src = URL.createObjectURL(blob);
      state.file = { name: 'recording.webm', type: blob.type, size: blob.size, seconds, src };
      $('labRecPlay').innerHTML = `<audio controls src="${src}"></audio><span>${seconds} שניות</span>`;
      stream.getTracks().forEach(t => t.stop());
      renderControls();
    };
    recStart = Date.now();
    recorder.start();
    state.recording = true;
    $('labRec').textContent = '■ עצירה';
    $('labRec').classList.add('on');
    $('labRecMsg').textContent = synthetic ? 'אין מיקרופון — מקליטים צליל לדוגמה' : 'מקליט…';
    recTimer = setTimeout(stopRecord, 10000);
  }
  function stopRecord() {
    clearTimeout(recTimer);
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    state.recording = false;
    const b = $('labRec');
    if (b) { b.textContent = '● הקלטה מחדש'; b.classList.remove('on'); }
    const m = $('labRecMsg');
    if (m) m.textContent = 'אפשר לשלוח';
  }

  /* ── Rendering ───────────────────────────────────────────────────────────── */
  function renderControls() {
    $('labMethods').innerHTML = METHODS.map(x =>
      `<button class="lab-method m-${x.m}${state.method === x.m ? ' on' : ''}" data-method="${x.m}" title="${x.tip}"><code>${x.m}</code><span>${x.tip}</span></button>`).join('');
    $('labQuick').innerHTML = QUICK.map((q, i) => `<button data-quick="${i}">${q.label}</button>`).join('');
    const withBody = METHODS.find(m => m.m === state.method).body && state.action === 'free';
    $('labBodyBox').hidden = !withBody;
    if ($('labPath').value !== state.path) $('labPath').value = state.path;
    if ($('labBody').value !== state.body) $('labBody').value = state.body;
    $('labSend').disabled = state.sending;
    $('labActions').innerHTML = ACTIONS.map(a =>
      `<button class="lab-act${state.action === a.id ? ' on' : ''}" data-act="${a.id}">${a.label}</button>`).join('');
    const needsFile = state.action === 'image' || state.action === 'audio';
    $('labSend').disabled = state.sending || (needsFile && !state.file);
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
    const rows = state.history.map((h, i) =>
      `<button class="lab-hist${state.explain === i ? ' open' : ''}" data-hist="${i}">` +
      `<span class="m m-${h.method}">${h.method}</span><span class="p" dir="ltr">${esc(h.path)}</span>` +
      `<span class="s s-${statusClass(h.status)}">${h.status}</span>` +
      `<span class="why">${STATUS_HE[h.status] || ''}</span></button>` +
      (state.explain === i
        ? `<p class="lab-hist-why"><b class="s-${statusClass(h.status)}">${h.status} — ${STATUS_HE[h.status] || ''}</b> ${STATUS_WHY[h.status] || ''}</p>`
        : '')).join('');
    $('labHistory').innerHTML = rows || '<span class="lab-empty">הבקשות ששלחתם יופיעו כאן.</span>';
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
      pill.animate([{ left: a, opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.92 }, { left: b, opacity: 0 }],
        // Same flight as the HTTP demo on the previous step: one packet, one
        // speed, so the two screens read as one idea — slow enough to read the
        // label while it crosses.
        { duration: 3200, easing: 'cubic-bezier(.35,.05,.25,1)' }).finished.then(done, done);
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
      : (labRoutes({ method: state.method, path, body, file: state.file }) || bakery({ method: state.method, path, query, body }));
    await new Promise(r => setTimeout(r, REDUCED ? 100 : 450));
    $('labServerOut').innerHTML = highlight(responseText(res));
    $('labServerKept').innerHTML = keptHtml(res);
    await fly('res', res.status + ' ' + statusName(res.status));
    state.last = { method: state.method, path: state.path, status: res.status };
    state.count++;
    state.history.unshift(state.last);
    state.explain = null;
    state.history = state.history.slice(0, 4);
    renderHistory();
    $('labHint').innerHTML = (why ? why + ' ' : '') +
      `<b class="s-${statusClass(res.status)}">${res.status} — ${STATUS_HE[res.status] || ''}</b>`;
    state.sending = false;
    renderControls();
    emit();
  }

  // Same furniture a module lesson has: kicker, title, a To-do row, Check my work.
  function renderTasks() {
    const t = TASKS[state.task], solved = state.solved.includes(state.task);
    $('labKicker').textContent = `Exercise ${String(state.task + 1).padStart(2, '0')} · Reading answers`;
    $('labTaskNav').innerHTML = TASKS.map((_, i) =>
      `<button class="lab-task-n${i === state.task ? ' on' : ''}${state.solved.includes(i) ? ' done' : ''}" data-task="${i}">${state.solved.includes(i) ? '✓' : i + 1}</button>`).join('');
    $('labTaskQ').innerHTML = t.q;
    $('labTaskHow').innerHTML = '<b>איך מוצאים:</b> ' + t.how;
    $('labTaskRow').className = 'lab-task-row' + (solved ? ' pass' : '');
    $('labTaskRow').innerHTML = `<span class="lab-mark${solved ? ' pass' : ''}">${solved ? '✓' : ''}</span><span>${t.todo}</span>`;
    $('labAnswer').value = solved ? (state.answers[state.task] || '') : '';
    $('labAnswer').disabled = solved;
    $('labCheck').textContent = solved ? 'Passed ✓' : 'Check my work';
    $('labCheck').disabled = solved;
    $('labTaskMsg').innerHTML = solved ? '<b class="ok">יפה! תשובה מתוך מה שהשרת החזיר.</b>' : '';
    const count = $('labTaskCount');
    count.textContent = `${state.solved.length}/${TASKS.length}`;
    count.classList.toggle('all', state.solved.length === TASKS.length);
  }
  state.answers = {};

  function checkTask() {
    const t = TASKS[state.task], a = $('labAnswer').value;
    if (!a.trim()) { $('labTaskMsg').innerHTML = 'כתבו תשובה קודם 🙂'; return; }
    const good = t.check(a, { history: state.history, last: state.last });
    if (good) {
      if (!state.solved.includes(state.task)) state.solved.push(state.task);
      state.answers[state.task] = a;
      renderTasks();
      save();
      const next = TASKS.findIndex((_, i) => !state.solved.includes(i));
      if (next >= 0) setTimeout(() => { state.task = next; renderTasks(); }, 1400);
    } else {
      $('labTaskMsg').innerHTML = '<b class="bad">עוד לא.</b> ' + t.nudge;
    }
    emit();
  }

  const STORE = 'http-lab-v1';
  function save() { try { localStorage.setItem(STORE, JSON.stringify({ solved: state.solved, answers: state.answers })); } catch (e) {} }
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (d) { state.solved = d.solved || []; state.answers = d.answers || {}; state.task = Math.max(0, TASKS.findIndex((_, i) => !state.solved.includes(i))); }
    } catch (e) {}
  }

  /* The file the server just stored, shown the way a browser would show it. */
  function keptHtml(res) {
    const b = res && res.body;
    if (!b || res.status >= 300) return '';
    const up = saved.uploads.find(u => u.file_id === b.file_id);
    if (up) return `<div class="lab-kept"><span>מה שמור אצל השרת · <code dir="ltr">${esc(up.saved_as)}</code></span><img src="${up.src}" alt="התמונה שהעליתם"></div>`;
    const note = saved.notes.find(n => n.note_id === b.note_id);
    if (note) return `<div class="lab-kept"><span>מה שמור אצל השרת · <code dir="ltr">${esc(note.saved_as)}</code></span><audio controls src="${note.src}"></audio></div>`;
    return '';
  }

  function publicState() {
    return {
      sent: state.count, building: { method: state.method, path: state.path }, last: state.last,
      action: state.action,
      tasks: { current: state.task + 1, total: TASKS.length, solved: state.solved.length, question: TASKS[state.task].q.replace(/<[^>]+>/g, '') }
    };
  }

  let wired = false;
  function wire() {
    $('labActions').addEventListener('click', e => {
      const b = e.target.closest('[data-act]');
      if (b) pickAction(b.dataset.act);
    });
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
      const i = Number(b.dataset.hist);
      // A click EXPLAINS the code (that is what a student wonders about);
      // the same click also loads the request back into the builder, so
      // "try it again" costs nothing.
      state.explain = state.explain === i ? null : i;
      const h = state.history[i];
      state.method = h.method; state.path = h.path;
      renderControls();
      renderHistory();
    });
    $('labPath').addEventListener('input', e => { state.path = e.target.value; renderControls(); });
    $('labPath').addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
    $('labBody').addEventListener('input', e => { state.body = e.target.value; renderControls(); });
    $('labSend').addEventListener('click', () => send());
    $('labTaskNav').addEventListener('click', e => {
      const b = e.target.closest('[data-task]');
      if (!b) return;
      state.task = Number(b.dataset.task);
      renderTasks();
    });
    $('labCheck').addEventListener('click', checkTask);
    $('labExplain').addEventListener('click', () => {
      const t = TASKS[state.task];
      const plain = t.q.replace(/<[^>]+>/g, '');
      $('labTaskMsg').innerHTML = '<b>נטי מכינה הסבר… הוא מגיע בצ\'אט שליד השיעור.</b>';
      const b = window.__lessonBridge;
      if (!b || !b.notify) { $('labTaskMsg').innerHTML = 'ההסבר של נטי זמין כשהשיעור פתוח ליד הצ\'אט ב-Flowpad.'; return; }
      b.notify('explain_requested', '🧑‍🏫 נטי, תסבירי לי על מה התרגיל הזה: תרגיל ' + (state.task + 1) + ' בסימולטור HTTP — ' + plain);
    });
    $('labAnswer').addEventListener('keydown', e => { if (e.key === 'Enter') checkTask(); });
  }

  window.__httpLab = {
    show() {
      if (!$('labMethods')) return;
      if (!wired) { load(); wire(); wired = true; renderControls(); renderAction(); renderHistory(); renderTasks(); }
    },
    hide() {},
    state: publicState,
    onChange(fn) { listeners.push(fn); }
  };
})();
