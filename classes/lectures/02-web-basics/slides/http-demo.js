/* "HTTP — what makes it all happen": two animations on one slide.
 *
 * 1. The anatomy demo: a client and a server exchange three kinds of HTTP
 *    traffic one after the other — GET (a page), POST (saving data) and a
 *    WebSocket (messages both ways) — while the inspector shows every part of
 *    each message, with a tooltip on each part.
 * 2. Live traffic: a real YouTube player. The page cannot read another site's
 *    requests (the browser forbids it), so it listens to the player itself:
 *    whenever the player reports that it downloaded more video, a real chunk
 *    arrived, and it is drawn on the same wire. The requests this page itself
 *    made to load the player come from the browser's Resource Timing list.
 *
 * Needs #httpWire, #httpInspect, #httpModes, #httpPlay, #liveLog,
 * #liveStats, #liveState, #ytPlayer. Call window.__httpDemo.show(stepId) /
 * hide(stepId) — 'http-live' drives the player, 'http' the anatomy demo.
 */
(function () {
  'use strict';

  const VIDEO_ID = 'XqZsoesa55w';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const listeners = [];
  const emit = () => listeners.forEach(fn => { try { fn(publicState()); } catch (e) {} });

  /* ── What each part of a message means (tooltips) ────────────────────────── */
  const TIP = {
    method: 'Method — מה רוצים לעשות. GET = תנו לי. POST = הנה מידע חדש, תשמרו אותו.',
    path: 'Path — איזה דבר בשרת רוצים. כמו כתובת של חדר בתוך בניין.',
    version: 'גרסת השפה. HTTP/1.1 היא הגרסה הכי קלה לקריאה — החדשות שולחות את אותו תוכן בצורה דחוסה.',
    status: 'Status — איך הלך: 200 הצליח, 201 נוצר משהו חדש, 404 לא נמצא, 101 עוברים לחיבור פתוח.',
    body: 'Body — התוכן עצמו: הדף, הנתונים, ההודעה.',
    frame: 'Frame — הודעה בחיבור הפתוח. אין Method, אין Status, אין Headers — רק התוכן. לכן זה מהיר.',
    Host: 'לאיזה אתר הבקשה. שרת אחד יכול לארח הרבה אתרים.',
    'User-Agent': 'מי שואל: איזה דפדפן ואיזו מערכת הפעלה.',
    Accept: 'איזה סוג תוכן הלקוח יודע לקרוא.',
    'Accept-Language': 'באיזו שפה הלקוח מעדיף את התשובה.',
    Cookie: 'כרטיס כניסה שהשרת נתן קודם. ככה הוא יודע שזה אתם.',
    'Content-Type': 'באיזה פורמט כתוב הגוף: HTML, JSON…',
    'Content-Length': 'כמה בתים יש בגוף — כדי לדעת מתי ההודעה נגמרה.',
    'Content-Encoding': 'הגוף נשלח דחוס, כדי שיעבור מהר יותר.',
    'Cache-Control': 'האם מותר לשמור עותק של התשובה, ולכמה זמן.',
    Location: 'איפה נמצא הדבר החדש שנוצר.',
    Upgrade: 'בקשה לעבור מ-HTTP רגיל לחיבור שנשאר פתוח.',
    Connection: 'מה לעשות עם החיבור אחרי התשובה.',
    'Sec-WebSocket-Key': 'מספר אקראי. השרת מחשב ממנו תשובה, כדי להוכיח שהוא באמת מבין WebSocket.',
    'Sec-WebSocket-Accept': 'התשובה שהשרת חישב מה-Key של הלקוח.'
  };

  /* ── The three demo exchanges ────────────────────────────────────────────── */
  const MODES = [
    {
      id: 'get', chip: 'GET', title: 'לקבל דף', color: '#E4572E',
      say: 'הלקוח מבקש דף. אין לו מה לשלוח חוץ מהבקשה עצמה — לכן אין גוף.',
      server: 'www.youtube.com',
      messages: [
        { dir: 'req', pill: 'GET /watch', start: ['GET', '/watch?v=' + VIDEO_ID, 'HTTP/1.1'],
          headers: [['Host', 'www.youtube.com'], ['User-Agent', 'Chrome/140 (Android 15)'], ['Accept', 'text/html'], ['Accept-Language', 'he-IL'], ['Cookie', 'PREF=f6=40000']] },
        { dir: 'res', pill: '200 OK · HTML', start: ['HTTP/1.1', '200 OK'],
          headers: [['Content-Type', 'text/html; charset=utf-8'], ['Content-Encoding', 'br'], ['Cache-Control', 'no-cache']],
          body: '<!DOCTYPE html>\n<html lang="he">\n  <head><title>Baby Shark Dance</title>…' }
      ]
    },
    {
      id: 'post', chip: 'POST', title: 'לשמור מידע', color: '#7A4FB8',
      say: 'הלקוח שולח מידע חדש — תגובה. המידע נמצא בגוף, בפורמט JSON, והשרת עונה 201: נוצר.',
      server: 'www.youtube.com',
      messages: [
        { dir: 'req', pill: 'POST /comments', start: ['POST', '/api/comments', 'HTTP/1.1'],
          headers: [['Host', 'www.youtube.com'], ['Content-Type', 'application/json'], ['Content-Length', '64'], ['Cookie', 'SID=a8Kd…']],
          body: '{\n  "videoId": "' + VIDEO_ID + '",\n  "text": "שיר מעולה! 🦈"\n}' },
        { dir: 'res', pill: '201 Created', start: ['HTTP/1.1', '201 Created'],
          headers: [['Content-Type', 'application/json'], ['Location', '/api/comments/1832']],
          body: '{\n  "id": 1832,\n  "likes": 0\n}' }
      ]
    },
    {
      id: 'ws', chip: 'WebSocket', title: 'הודעות בזמן אמת', color: '#1F8A83',
      say: 'בצ\'אט אי אפשר לחכות שהלקוח ישאל. אז מבקשים פעם אחת לפתוח חיבור שנשאר פתוח — ומשם שני הצדדים שולחים הודעות מתי שרוצים.',
      server: 'chat.example.com',
      messages: [
        { dir: 'req', pill: 'GET /chat · Upgrade', start: ['GET', '/chat', 'HTTP/1.1'],
          headers: [['Host', 'chat.example.com'], ['Upgrade', 'websocket'], ['Connection', 'Upgrade'], ['Sec-WebSocket-Key', 'dGhlIHNhbXBsZSBub25jZQ==']] },
        { dir: 'res', pill: '101 Switching', start: ['HTTP/1.1', '101 Switching Protocols'],
          headers: [['Upgrade', 'websocket'], ['Connection', 'Upgrade'], ['Sec-WebSocket-Accept', 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=']] },
        { dir: 'up', pill: '💬 היי!', frame: '{ "text": "היי! מי בא למגרש?" }' },
        { dir: 'down', pill: '💬 אני!', frame: '{ "from": "נועה", "text": "אני!" }' },
        { dir: 'down', pill: '💬 גם אני', frame: '{ "from": "דני", "text": "גם אני" }', push: true }
      ]
    }
  ];

  /* ── A wire: client on the right, server on the left, packets in between ─── */
  function wire(el) {
    const track = el.querySelector('.track');
    const ends = { client: el.querySelector('.end.client'), server: el.querySelector('.end.server') };
    return {
      async send({ from, text, kind }) {
        const pill = document.createElement('span');
        pill.className = 'pkt ' + kind;
        pill.textContent = text;
        track.appendChild(pill);
        const [a, b] = from === 'client' ? ['100%', '0%'] : ['0%', '100%'];
        ends[from].classList.add('pulse');
        if (REDUCED) {
          pill.style.left = b;
          await sleep(900);
        } else {
          const anim = pill.animate([{ left: a, opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.92 }, { left: b, opacity: 0 }],
            // Slow on purpose: the label IS the lesson, and it has to be readable
            // while it crosses.
            { duration: 3200, easing: 'cubic-bezier(.35,.05,.25,1)', fill: 'forwards' });
          await anim.finished.catch(() => {});
        }
        pill.remove();
        ends[from].classList.remove('pulse');
        const to = ends[from === 'client' ? 'server' : 'client'];
        to.classList.add('got');
        setTimeout(() => to.classList.remove('got'), 500);
      },
      clear() { track.querySelectorAll('.pkt').forEach(p => p.remove()); }
    };
  }

  /* ── The anatomy demo ────────────────────────────────────────────────────── */
  const demo = { mode: 0, playing: true, token: 0 };

  function renderModes() {
    $('httpModes').innerHTML = MODES.map((m, i) =>
      `<button class="http-mode${i === demo.mode ? ' on' : ''}" data-mode="${i}" style="--c:${m.color}"><code>${m.chip}</code><span>${m.title}</span></button>`).join('');
    $('httpPlay').textContent = demo.playing ? '⏸' : '▶';
    $('httpPlay').title = demo.playing ? 'עצירה' : 'הפעלה';
  }

  const tip = (key, html, cls) => `<span class="hp ${cls}" data-tip="${esc(TIP[key] || '')}">${html}</span>`;
  function messageHtml(m, active) {
    if (m.frame) {
      return `<div class="msg frame ${m.dir}${active ? ' on' : ''}${m.push ? ' push' : ''}">
        <div class="msg-cap">${m.dir === 'up' ? 'לקוח → שרת' : 'שרת → לקוח'}${m.push ? ' · <b>השרת שולח בלי שביקשו!</b>' : ''}</div>
        <pre dir="ltr">${tip('frame', esc(m.frame), 'body')}</pre></div>`;
    }
    const start = m.dir === 'req'
      ? `${tip('method', esc(m.start[0]), 'method')} ${tip('path', esc(m.start[1]), 'path')} ${tip('version', esc(m.start[2]), 'version')}`
      : `${tip('version', esc(m.start[0]), 'version')} ${tip('status', esc(m.start[1]), 'status')}`;
    const headers = m.headers.map(([k, v]) => `${tip(k, `<span class="hk">${esc(k)}:</span> ${esc(v)}`, 'header')}`).join('\n');
    const body = m.body ? `\n\n${tip('body', esc(m.body), 'body')}` : '';
    return `<div class="msg ${m.dir}${active ? ' on' : ''}">
      <div class="msg-cap">${m.dir === 'req' ? 'בקשה · לקוח → שרת' : 'תשובה · שרת → לקוח'}</div>
      <pre dir="ltr">${start}\n${headers}${body}</pre></div>`;
  }

  function renderInspect(upto) {
    const m = MODES[demo.mode];
    const msgs = m.messages.slice(0, upto + 1);
    $('httpSay').innerHTML = `<b style="color:${m.color}">${m.chip} · ${m.title}</b><br>${m.say}`;
    $('httpInspect').innerHTML = `<div class="msgs">${msgs.map((x, i) => messageHtml(x, i === upto)).join('')}</div>` +
      (msgs.length ? '' : '<p class="http-wait">ההודעות יופיעו כאן, אחת אחרי השנייה.</p>');
    $('httpWire').querySelector('.end.server small').textContent = m.server;
    const on = $('httpInspect').querySelector('.msg.on');
    if (on) on.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
  }

  async function runDemo() {
    const token = ++demo.token;
    const w = wire($('httpWire'));
    w.clear();
    while (token === demo.token && demo.playing) {
      const m = MODES[demo.mode];
      renderModes();
      renderInspect(-1);
      emit();
      await sleep(700);
      for (let i = 0; i < m.messages.length; i++) {
        if (token !== demo.token) return;
        const msg = m.messages[i];
        renderInspect(i);
        await sleep(REDUCED ? 300 : 600);
        const from = msg.dir === 'req' || msg.dir === 'up' ? 'client' : 'server';
        const kind = msg.frame ? 'ws' : msg.dir;
        await w.send({ from, text: msg.pill, kind });
        if (token !== demo.token) return;
        await sleep(msg.dir === 'req' ? 350 : 500);
      }
      await sleep(3200);
      if (token !== demo.token || !demo.playing) return;
      demo.mode = (demo.mode + 1) % MODES.length;
    }
  }

  /* ── Live traffic from the real player ───────────────────────────────────── */
  const live = { player: null, ready: false, state: 'idle', buffered: 0, chunks: 0, poll: null, queue: Promise.resolve(), apiLoading: false, seenResources: new Set() };
  const STATE_HE = { idle: 'מחכה שתלחצו Play', playing: 'מנגן', buffering: 'טוען', paused: 'בהשהיה', ended: 'נגמר' };

  function logRow({ what, req, res, kind }) {
    const row = document.createElement('div');
    row.className = 'row ' + (kind || '');
    const now = new Date();
    row.innerHTML = `<span class="t" dir="ltr">${now.toLocaleTimeString('he-IL', { hour12: false })}</span><span class="w">${esc(what)}</span>` +
      `<code dir="ltr" class="rq">${esc(req || '')}</code><code dir="ltr" class="rs">${esc(res || '')}</code>`;
    const log = $('liveLog');
    log.prepend(row);
    log.scrollTop = 0;
    while (log.children.length > 9) log.lastChild.remove();
  }
  function renderLive() {
    $('liveState').textContent = STATE_HE[live.state];
    $('liveState').dataset.state = live.state;
    $('liveStats').innerHTML = `חתיכות וידאו שהגיעו: <b>${live.chunks}</b> · שניות וידאו שכבר אצלכם: <b>${Math.round(live.buffered)}</b>`;
  }
  // Serialize live packets so they fly one after the other, like the demo.
  function livePacket(req, res) {
    const el = $('liveWire');
    if (!el) return;            // the video slide shows the log alone
    const w = wire(el);
    live.queue = live.queue.then(async () => {
      await w.send({ from: 'client', text: req, kind: 'req' });
      await w.send({ from: 'server', text: res, kind: 'res' });
    });
  }

  // The requests this page itself made to bring the player in are real and visible to us.
  function logPlayerResources() {
    const entries = performance.getEntriesByType('resource').filter(e => /youtube\.com|ytimg\.com/.test(e.name));
    entries.forEach(e => {
      if (live.seenResources.has(e.name)) return;
      live.seenResources.add(e.name);
      const u = new URL(e.name);
      const what = /\/embed\//.test(u.pathname) ? 'הנגן עצמו (דף HTML)' : /iframe_api|widgetapi/.test(u.pathname) ? 'הקוד שמפעיל את הנגן' : 'קובץ של הנגן';
      logRow({ what, req: 'GET ' + u.hostname + u.pathname.slice(0, 32), res: Math.round(e.duration) + 'ms', kind: 'boot' });
    });
  }

  function loadApi() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    if (live.apiLoading) return live.apiLoading;
    live.apiLoading = new Promise((resolve, reject) => {
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(); };
      const s = document.createElement('script');
      s.src = 'https://www.youtube.com/iframe_api';
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return live.apiLoading;
  }

  function startLive() {
    if (live.player) return;
    loadApi().then(() => {
      live.player = new YT.Player('ytPlayer', {
        videoId: VIDEO_ID,
        playerVars: { rel: 0, playsinline: 1, modestbranding: 1, origin: location.origin },
        events: {
          onReady: () => { live.ready = true; setTimeout(logPlayerResources, 300); logRow({ what: 'הנגן מוכן', kind: 'note' }); renderLive(); },
          onStateChange: e => onPlayerState(e.data),
          onPlaybackQualityChange: e => logRow({ what: 'הנגן החליף איכות', req: '', res: e.data, kind: 'note' })
        }
      });
    }).catch(() => {
      $('liveLog').innerHTML = '<div class="row note"><span class="w">אין חיבור ל-YouTube — הנגן לא נטען.</span></div>';
    });
  }

  function onPlayerState(s) {
    const S = YT.PlayerState;
    const prev = live.state;
    live.state = s === S.PLAYING ? 'playing' : s === S.BUFFERING ? 'buffering' : s === S.PAUSED ? 'paused' : s === S.ENDED ? 'ended' : live.state;
    if (live.state !== prev) {
      if (live.state === 'playing') logRow({ what: '▶ מנגן — הנגן מבקש עוד חתיכות כשצריך', kind: 'note' });
      if (live.state === 'buffering') logRow({ what: '⏳ מחכים לחתיכה הבאה', kind: 'note' });
      if (live.state === 'paused') logRow({ what: '⏸ בהשהיה — הנגן מפסיק לבקש חתיכות כשיש לו מספיק', kind: 'note' });
      if (live.state === 'ended') logRow({ what: 'הסרטון נגמר', kind: 'note' });
      emit();
    }
    renderLive();
    if (!live.poll) live.poll = setInterval(pollBuffer, 500);
  }

  // The player reports how much of the video it already downloaded; every increase means
  // more video arrived. Measured 2026-09-17: the player fetches it with POST /videoplayback
  // requests to googlevideo.com, about one every 3–6 s while buffering — one increase can
  // span one request or two.
  function pollBuffer() {
    const p = live.player;
    if (!p || !p.getVideoLoadedFraction) return;
    const total = p.getDuration() || 0;
    const buffered = (p.getVideoLoadedFraction() || 0) * total;
    if (buffered > live.buffered + 0.4) {
      const added = buffered - live.buffered;
      live.buffered = buffered;
      live.chunks++;
      const quality = p.getPlaybackQuality ? p.getPlaybackQuality() : '';
      const label = quality && quality !== 'unknown' ? ' · ' + quality : '';
      logRow({ what: 'עוד וידאו הגיע', req: 'POST /videoplayback', res: '+' + added.toFixed(1) + 's' + label, kind: 'chunk' });
      livePacket('POST /videoplayback', '▶ +' + Math.round(added) + 's' + label);
      renderLive();
    }
  }

  function wireTips() {
    const box = document.createElement('div');
    box.className = 'hp-tip';
    box.hidden = true;
    document.body.appendChild(box);
    $('httpInspect').addEventListener('mouseover', e => {
      const part = e.target.closest('.hp[data-tip]');
      if (!part || !part.dataset.tip) { box.hidden = true; return; }
      box.textContent = part.dataset.tip;
      box.hidden = false;
      const r = part.getBoundingClientRect();
      const top = r.bottom + 8 + box.offsetHeight > innerHeight ? r.top - box.offsetHeight - 8 : r.bottom + 8;
      box.style.top = top + 'px';
      box.style.left = Math.max(8, Math.min(r.left, innerWidth - box.offsetWidth - 8)) + 'px';
    });
    $('httpInspect').addEventListener('mouseleave', () => { box.hidden = true; });
  }

  function wireUi() {
    wireTips();
    $('httpModes').addEventListener('click', e => {
      const b = e.target.closest('[data-mode]');
      if (!b) return;
      demo.mode = Number(b.dataset.mode);
      demo.playing = true;
      runDemo();
    });
    $('httpPlay').addEventListener('click', () => {
      demo.playing = !demo.playing;
      renderModes();
      if (demo.playing) runDemo(); else demo.token++;
    });
  }

  function publicState() {
    return {
      demo: MODES[demo.mode].chip, demo_playing: demo.playing,
      video: { state: live.state, chunks_received: live.chunks, seconds_buffered: Math.round(live.buffered) }
    };
  }

  let wired = false;
  window.__httpDemo = {
    /** The two halves live on two slides now: `http-live` is the real player,
     *  `http` the anatomy demo. Starting the half nobody is looking at would
     *  animate an off-screen section and download video nobody watches. */
    show(which) {
      if (!$('httpWire')) return;
      if (!wired) { wireUi(); wired = true; renderModes(); renderLive(); }
      if (which === 'http-live') return startLive();
      if (demo.playing) runDemo();
    },
    hide(which) {
      demo.token++;
      // Leaving the anatomy slide: stop its loop, but the player belongs to the
      // other slide — pausing it here would stop a video the student is watching
      // after stepping back.
      if (which === 'http') return;
      // Everything this slide started has to stop here. The buffer poll is the
      // one that bites: a paused video keeps buffering, so a poll left running
      // goes on drawing packets onto an invisible wire — and queueing them —
      // for the rest of the lesson.
      clearInterval(live.poll);
      live.poll = null;
      live.queue = Promise.resolve();
      try { live.player && live.player.pauseVideo && live.player.pauseVideo(); } catch (e) {}
    },
    state: publicState,
    onChange(fn) { listeners.push(fn); }
  };
})();
