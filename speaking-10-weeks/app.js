'use strict';
/* ================= SETTINGS (teacher) ================= */
// Web app URL of the Speaking Apps Script (apps-script/Speaking.gs). See HUONG-DAN-CAI-DAT.md, part C.
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwsg0ydZ2Cduf2XFyuJ6quo4lshGgTwOEVIErZMZVL08dpyBVpkLhD1kdf-pAnGY-a2/exec';
// Tuesday of Week 1. Change this one date to move the whole schedule.
const START_DATE = '2026-11-10';
// Max recording length (seconds)
const LIM = { p1: 90, p2: 180, p3: 150, opt: 150, mock13: 480, mock2: 120 };
const P2_GOAL = 120, PREP_SEC = 60;
const BATCH_BYTES = 12 * 1024 * 1024; // split big sends into several emails

/* ================= helpers ================= */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = n => String(n).padStart(2, '0');
const clock = s => { s = Math.max(0, Math.round(s || 0)); return Math.floor(s / 60) + ':' + pad2(s % 60); };
const sid = k => 'r_' + k.replace(/[^A-Za-z0-9]/g, '_');
const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');

function dayAt(offset) {
  const [y, m, d] = START_DATE.split('-').map(Number);
  return new Date(y, m - 1, d + offset);
}
const weekStart = n => dayAt(7 * (n - 1));
const weekDue = n => dayAt(7 * (n - 1) + 6);
const today0 = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
const fmtDate = d => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fmtShort = iso => { const d = new Date(iso); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()); };
const UNLOCK = /[?&]unlock(=|&|$)/.test(location.search);
const isOpen = n => UNLOCK || today0() >= weekStart(n);
const daysLeft = n => Math.round((weekDue(n) - today0()) / 864e5);
function currentWeek() {
  const t = today0();
  for (const w of WEEKS) if (t >= weekStart(w.n) && t <= weekDue(w.n)) return w.n;
  return t < weekStart(1) ? 1 : 0;
}

/* ================= storage ================= */
const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (_) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) {} },
};
let ME = LS.get('spk10.me', { name: '', cls: '' });
const META = LS.get('spk10.meta', {});     // key -> {dur, mime, ext, at, size, sent, sentAt, marks}
const NOTES = LS.get('spk10.notes', {});   // key -> text (P2 keywords, reflections, new topics)
const XSENT = LS.get('spk10.xsent', {});   // week -> signature of notes already sent
const saveMeta = () => LS.set('spk10.meta', META);
let noteTimer = 0;
const saveNotes = () => { clearTimeout(noteTimer); noteTimer = setTimeout(() => LS.set('spk10.notes', NOTES), 300); };

const IDB = {
  db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      if (!window.indexedDB) return rej(new Error('no IndexedDB'));
      const r = indexedDB.open('speaking10', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('rec');
      r.onsuccess = () => { this.db = r.result; res(this.db); };
      r.onerror = () => rej(r.error);
    });
  },
  async run(mode, fn) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const tx = db.transaction('rec', mode);
      const rq = fn(tx.objectStore('rec'));
      tx.oncomplete = () => res(rq && rq.result);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error);
    });
  },
  put(k, v) { return this.run('readwrite', st => st.put(v, k)); },
  get(k) { return this.run('readonly', st => st.get(k)); },
};
const BLOBS = {}, URLS = {};
function setBlob(k, b) {
  if (URLS[k]) { URL.revokeObjectURL(URLS[k]); delete URLS[k]; }
  BLOBS[k] = b;
}
function urlOf(k) {
  if (!BLOBS[k]) return '';
  if (!URLS[k]) URLS[k] = URL.createObjectURL(BLOBS[k]);
  return URLS[k];
}
async function loadBlobs(keys) {
  await Promise.all(keys.filter(k => META[k] && !BLOBS[k]).map(async k => {
    try { const b = await IDB.get(k); if (b) BLOBS[k] = b; } catch (_) {}
  }));
}

/* ================= model ================= */
const ITEMS = {}; // key -> item
const findGroup = id => { for (const w of WEEKS) for (const g of w.p1) if (g.id === id) return g; return null; };
const storyTitle = id => { for (const w of WEEKS) for (const s of w.stories) if (s.id === id) return s.title; return ''; };

function model(w) {
  const pre = 'W' + w.n + ':';
  const items = [];
  const add = it => { it.key = pre + it.code; it.week = w.n; ITEMS[it.key] = it; items.push(it); return it; };

  const groups = (w.review ? [findGroup(w.review)] : w.p1).map(g => ({
    g,
    qs: g.q.map((arr, i) => {
      const code = g.id + '-' + pad2(i + 1);
      return { main: add({ code, q: arr[0], part: 'Part 1', req: true, max: LIM.p1, type: 'std', cmp: w.review ? 'W1:' + code : null }) };
    }),
  }));

  const stories = w.stories.map(s => ({
    s,
    p2: add({ code: s.id + '-P2', q: s.p2[0], say: s.p2.slice(1), part: 'Part 2 ★', req: true, max: LIM.p2, type: 'p2' }),
    p3: s.p3.map((arr, i) => {
      const code = s.id + '-P3-' + pad2(i + 1);
      return { main: add({ code, q: arr[0], part: 'Part 3', req: true, max: LIM.p3, type: 'std', rescue: true }) };
    }),
  }));

  const mocks = (w.mocks || []).map(m => {
    let k = 0;
    const p1qs = [];
    m.p1.forEach(g => g.q.forEach(q => p1qs.push({ code: m.id + '-P1-' + pad2(++k), q, group: g.title })));
    const p3qs = m.p3.map((q, i) => ({ code: m.id + '-P3-' + (i + 1), q }));
    return {
      m,
      p1: add({ code: m.id + '-P1', q: 'Mock test ' + m.id + ' – Part 1 (' + p1qs.length + ' questions)', part: 'Mock Part 1', req: true, max: LIM.mock13, type: 'mock', mp: 1, qs: p1qs }),
      p2: add({ code: m.id + '-P2', q: m.p2[0], say: m.p2.slice(1), reuse: m.reuse, part: 'Mock Part 2', req: true, max: LIM.mock2, type: 'mock', mp: 2 }),
      p3: add({ code: m.id + '-P3', q: 'Mock test ' + m.id + ' – Part 3 (' + p3qs.length + ' questions)', part: 'Mock Part 3', req: true, max: LIM.mock13, type: 'mock', mp: 3, qs: p3qs }),
    };
  });

  const review = w.storyReview ? WEEKS.flatMap(x => x.stories.map(s => ({
    s, wk: x.n,
    it: add({ code: s.id + '-P2', q: s.p2[0], say: s.p2.slice(1), part: 'Story review', req: false, max: LIM.p2, type: 'p2', notesKey: 'W' + x.n + ':' + s.id + '-P2' }),
  }))) : [];

  return { w, items, groups, stories, mocks, review };
}
const MODELS = {};
const getModel = n => MODELS[n] || (MODELS[n] = model(WEEKS[n - 1]));
WEEKS.forEach(w => getModel(w.n));

function stats(n) {
  const its = getModel(n).items;
  const req = its.filter(i => i.req);
  return {
    total: req.length,
    done: req.filter(i => META[i.key]).length,
    unsent: its.filter(i => META[i.key] && !META[i.key].sent).length,
    any: its.filter(i => META[i.key]).length,
  };
}
// notes sent together with the recordings (reflections, new topics)
function extrasFor(n) {
  const md = getModel(n), out = [];
  if (md.w.newTopics && (NOTES['W' + n + ':newtopics'] || '').trim()) out.push({ label: 'New Q1/2027 topics → which story', text: NOTES['W' + n + ':newtopics'].trim() });
  md.mocks.forEach(({ m }) => {
    const g = (NOTES['W' + n + ':' + m.id + ':good'] || '').trim(), b = (NOTES['W' + n + ':' + m.id + ':improve'] || '').trim();
    if (g) out.push({ label: m.id + ' – One thing I did well', text: g });
    if (b) out.push({ label: m.id + ' – One thing I want to improve', text: b });
  });
  return out;
}
const extrasChanged = n => { const x = extrasFor(n); return x.length > 0 && JSON.stringify(x) !== (XSENT[n] || ''); };

/* ================= rendering: shared ================= */
const MSG = {};      // key -> {t, err}
const OPENOPT = {};  // optional recorders shown
let ROUTE = 0;       // 0 = overview, n = week
let editingMe = false;

function whoHtml() {
  if (ME.name && ME.cls && !editingMe) {
    return `<section class="card who" id="who"><div>👋 Hi <b>${esc(ME.name)}</b> · Class <b>${esc(ME.cls)}</b></div>
      <button class="linkbtn" type="button" data-act="editme">Change</button></section>`;
  }
  return `<section class="card" id="who"><h3 style="margin:0 0 2px">👋 Before you start</h3>
    <div class="muted small">Your name and class are sent to your teacher with your recordings.</div>
    <div class="form">
      <div class="field"><label for="meName">Full name</label><input type="text" id="meName" maxlength="60" value="${esc(ME.name)}" autocomplete="name"></div>
      <div class="field" style="flex:0 1 140px"><label for="meCls">Class</label><input type="text" id="meCls" maxlength="20" value="${esc(ME.cls)}"></div>
      <button class="btn" type="button" data-act="saveme">Save</button>
    </div><div class="msg err" id="meErr"></div></section>`;
}
function saveMe() {
  const name = $('#meName').value.trim().replace(/\s+/g, ' '), cls = $('#meCls').value.trim();
  if (!name || !cls) { $('#meErr').textContent = 'Please enter your name and class.'; return; }
  ME = { name, cls }; LS.set('spk10.me', ME); editingMe = false;
  $('#who').outerHTML = whoHtml();
  setStatus('', '');
}

// small rescue-phrase list shown under each Part 3 question
function rescueHtml() {
  return `<details class="resq"><summary>🛟 Rescue phrases</summary>
    <ul class="tight rescue">${PLAN.rescue.map(r => `<li>${esc(r)}</li>`).join('')}</ul></details>`;
}

/* ================= overview ================= */
function renderHome() {
  ROUTE = 0;
  $('#heroTitle').textContent = '🎙 ' + PLAN.title;
  $('#heroSub').textContent = PLAN.subtitle;
  $('#homeLink').hidden = true;
  $('#sendbar').hidden = true;
  document.title = PLAN.title;
  const cur = currentWeek();
  const cards = WEEKS.map(w => {
    const md = getModel(w.n), st = stats(w.n), open = isOpen(w.n);
    const p1 = md.groups.map(g => g.g.title).join(' · ');
    const p2 = md.stories.map(s => s.s.title).join(' · ');
    const topics = w.mocks ? `<span>${plural(w.mocks.length, 'mock test')}</span>`
      : `<span>Part 1:</span> ${esc(p1)}<br><span>Part 2:</span> ${esc(p2)}`;
    let tag = '';
    if (!open) tag = `<span class="tag lock">🔒 Opens ${esc(fmtDate(weekStart(w.n)))}</span>`;
    else if (st.total && st.done === st.total && !st.unsent) tag = '<span class="tag done">✓ Done</span>';
    else if (w.n === cur) tag = '<span class="tag now">This week</span>';
    const inner = `<span class="n">W${w.n}<small>${esc(weekStart(w.n).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }))}</small></span>
      <span class="body"><span class="t">${esc(w.title)}</span>${tag}<br>
      <span class="d">${esc(fmtDate(weekStart(w.n)))} – ${esc(fmtDate(weekDue(w.n)))} · Deadline <b>${esc(fmtDate(weekDue(w.n)))}</b></span>
      <div class="topics">${topics}</div>
      ${open && st.any ? `<div class="prog"><div style="width:${st.total ? Math.round(st.done / st.total * 100) : 0}%"></div></div>
      <div class="prog-l">${st.done}/${st.total} recorded${st.unsent ? ` · <b style="color:var(--wait)">${st.unsent} not sent yet</b>` : ''}</div>` : ''}</span>`;
    return open
      ? `<a class="wk${w.n === cur ? ' now' : ''}" href="#week-${w.n}">${inner}</a>`
      : `<div class="wk locked" aria-disabled="true">${inner}</div>`;
  }).join('');

  $('#app').innerHTML = whoHtml() + `
  <section class="card">
    <h2>🗓 Your 10 weeks</h2>
    <div class="weeks">${cards}</div>
  </section>
  ${howHtml()}`;
}

function howHtml() {
  return `<section class="card"><h3 style="margin:0 0 6px">📖 How it works</h3><ol class="tight" style="margin:0">
    <li>Open this week. Press <b>🎙 Record</b>, answer, then press <b>⏹ Stop</b>.</li>
    <li>Listen back. Not happy? Press <b>🔁 Record again</b>.</li>
    <li>Press <b>✉ Send to teacher</b> at the bottom of the page. You can send more later.</li>
    <li>Use Chrome or Safari and press <b>Allow</b> when asked for the microphone.</li>
  </ol></section>`;
}

/* ================= week page ================= */
async function renderWeek(n) {
  ROUTE = n;
  const md = getModel(n), w = md.w;
  document.title = 'Week ' + n + ' · ' + PLAN.title;
  $('#heroTitle').textContent = 'Week ' + n + ' – ' + w.title;
  $('#heroSub').textContent = fmtDate(weekStart(n)) + ' – ' + fmtDate(weekDue(n));
  $('#homeLink').hidden = false;
  $('#homeLink').textContent = '← 10-Week Plan';
  if (!isOpen(n)) {
    $('#sendbar').hidden = true;
    $('#app').innerHTML = `<section class="card lockbox"><div class="big">🔒</div><h2>Week ${n} isn’t open yet</h2>
      <p class="muted">It opens on <b>${esc(fmtDate(weekStart(n)))}</b>.</p><a class="btn" href="#">← Back to the plan</a></section>`;
    return;
  }
  $('#app').innerHTML = '<section class="card muted">Loading your recordings…</section>';
  const keys = md.items.map(i => i.key).concat(md.items.filter(i => i.cmp).map(i => i.cmp));
  await loadBlobs(keys);
  if (ROUTE !== n) return;

  const dl = daysLeft(n);
  const due = dl > 1 ? dl + ' days left' : dl === 1 ? 'tomorrow' : dl === 0 ? 'today' : 'past the deadline – you can still send';
  let h = whoHtml() + `<section class="card whead">
    <div class="kv">
      <div>Dates</div><div>${esc(fmtDate(weekStart(n)))} – ${esc(fmtDate(weekDue(n)))}</div>
      <div>Deadline</div><div><b>${esc(fmtDate(weekDue(n)))}</b> <span class="tag ${dl < 0 ? 'late' : 'now'}">${esc(due)}</span></div>
    </div>
  </section>`;

  if (md.groups.length) {
    h += `<h2 class="part-title">Part 1${w.review ? ' – review' : ''}</h2>`;
    if (w.review) h += `<p class="muted small" style="margin:-6px 4px 12px">Answer again and compare with your Week 1 answer.</p>`;
    h += md.groups.map(groupHtml).join('');
  }
  if (md.stories.length) h += `<h2 class="part-title">Part 2 &amp; 3</h2>` + md.stories.map(storyHtml).join('');
  if (w.newTopics) h += `<section class="card"><h3>🆕 New Q1/2027 topics (add later)</h3><p class="small">${esc(w.newTopics)}</p>
    <div class="kw"><label for="nt">New topics and which story you will use (e.g. “Describe a teacher… → my English teacher”)</label>
    <textarea id="nt" data-note="W${n}:newtopics" rows="4">${esc(NOTES['W' + n + ':newtopics'] || '')}</textarea></div>
    <div class="msg">This note is sent to your teacher with your next recordings.</div></section>`;
  if (md.mocks.length) h += md.mocks.map(mockHtml).join('');
  if (md.review.length) h += reviewHtml(md);

  $('#app').innerHTML = h;
  md.items.forEach(it => paint(it.key));
  $('#sendbar').hidden = false;
  setStatus('', '');
  updateBar();
}

function optHtml(it) {
  const has = !!META[it.key];
  const show = has || OPENOPT[it.key];
  return `<div class="opt"><div class="ot"><span class="txt">${esc(it.q)}</span>
    <button class="mic${has ? ' has' : ''}" type="button" data-opt="${esc(it.key)}">${has ? '✓ Recorded' : '🎙 Record'}</button></div>
    ${it.say ? `<div class="bul">${esc(it.say.join(' · '))}</div>` : ''}
    ${show ? `<div class="rec" id="${sid(it.key)}" data-key="${esc(it.key)}"></div>` : ''}</div>`;
}
function reqHtml(it, i) {
  return `<div class="q"><div class="qline"><span class="qn">${i + 1}</span><span class="qtext">${esc(it.q)}</span></div>
    ${it.rescue ? rescueHtml() : ''}
    <div class="rec" id="${sid(it.key)}" data-key="${esc(it.key)}"></div></div>`;
}
function groupHtml(G) {
  const g = G.g;
  return `<section class="card"><div class="ghead"><h3>${esc(g.title)}</h3></div>
    ${G.qs.map((x, i) => reqHtml(x.main, i)).join('')}</section>`;
}
function cueHtml(title, say, star) {
  return `<div class="cue"><div class="ct">${star ? '★ ' : ''}${esc(title)}</div><div class="ys">You should say:</div>
    <ul>${say.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`;
}
function kwHtml(key, label) {
  return `<div class="kw"><label for="kw_${sid(key)}">${esc(label || '📝 Your 4–5 keywords')}</label>
    <textarea id="kw_${sid(key)}" data-note="${esc(key)}" rows="2" placeholder="e.g. West Lake · weekends · with Mum · walk, bike · fresh air">${esc(NOTES[key] || '')}</textarea></div>`;
}
function storyHtml(S) {
  const s = S.s;
  return `<section class="card"><div class="ghead"><h3>${esc(s.title)}</h3></div>
    <div class="hint"><b>Tip:</b> ${esc(s.hint)}</div>
    <div class="subh">Part 2</div>
    ${cueHtml(s.p2[0], s.p2.slice(1))}
    ${kwHtml(S.p2.key)}
    <div class="rec" id="${sid(S.p2.key)}" data-key="${esc(S.p2.key)}"></div>
    <div class="subh blue">Part 3</div>
    ${S.p3.map((x, i) => reqHtml(x.main, i)).join('')}</section>`;
}
function mockHtml(M) {
  const m = M.m, n = M.p1.week;
  const all = `<details class="box" style="margin-top:12px"><summary style="font-size:15px">👀 Examiner only: show all questions</summary>
    <div class="small"><b>Part 1</b><ol class="tight">${M.p1.qs.map(q => `<li>${esc(q.q)}</li>`).join('')}</ol>
    <b>Part 2</b> ${cueHtml(m.p2[0], m.p2.slice(1))}<div class="muted">Use your story: ${esc(storyTitle(m.reuse))}.</div>
    <b>Part 3</b><ol class="tight">${M.p3.qs.map(q => `<li>${esc(q.q)}</li>`).join('')}</ol></div></details>`;
  return `<section class="card mock"><h3>🎤 Mock test ${esc(m.id.replace('MOCK-', ''))}</h3>
    <div class="muted small">About 12 minutes. The questions stay hidden until you start each part.</div>
    <div class="mpart"><h4>Part 1 <span class="muted small">(4–5 minutes · ${M.p1.qs.length} questions)</span></h4><div class="rec" id="${sid(M.p1.key)}" data-key="${esc(M.p1.key)}"></div></div>
    <div class="mpart"><h4>Part 2 <span class="muted small">(3–4 minutes · 1 minute to prepare, speak for up to 2 minutes)</span></h4><div class="rec" id="${sid(M.p2.key)}" data-key="${esc(M.p2.key)}"></div></div>
    <div class="mpart"><h4>Part 3 <span class="muted small">(4–5 minutes · ${M.p3.qs.length} questions)</span></h4><div class="rec" id="${sid(M.p3.key)}" data-key="${esc(M.p3.key)}"></div></div>
    <div class="refl">
      <div><label for="g_${m.id}">👍 One thing I did well</label><textarea id="g_${m.id}" data-note="W${n}:${m.id}:good" rows="2">${esc(NOTES['W' + n + ':' + m.id + ':good'] || '')}</textarea></div>
      <div><label for="i_${m.id}">🎯 One thing I want to improve</label><textarea id="i_${m.id}" data-note="W${n}:${m.id}:improve" rows="2">${esc(NOTES['W' + n + ':' + m.id + ':improve'] || '')}</textarea></div>
    </div>
    ${all}</section>`;
}
function reviewHtml(md) {
  return `<h2 class="part-title">Stories to review</h2>
  <p class="muted small" style="margin:-6px 4px 12px">Read your keywords and say each story once. Recording is optional.</p>
  ${md.review.map(r => {
    const s = r.s, notes = (NOTES[r.it.notesKey] || '').trim();
    return `<section class="card"><div class="ghead"><h3>${esc(s.title)}</h3></div>
      <div class="small"><b class="muted">Your keywords (Week ${r.wk}):</b> ${notes ? esc(notes) : '<i class="muted">none written</i>'}</div>
      ${optHtml(r.it).replace('<div class="opt">', '<div class="opt" style="margin-top:4px">')}</section>`;
  }).join('')}`;
}

/* ================= recorder widgets ================= */
function msgHtml(k) { const m = MSG[k]; return m ? `<div class="msg${m.err ? ' err' : ''}">${m.t}</div>` : ''; }
function setMsg(k, t, err) { if (t) MSG[k] = { t, err: !!err }; else delete MSG[k]; }
function sentChip(m) { return m.sent ? `<span class="chip sent">✉ Sent ${esc(fmtShort(m.sentAt))}</span>` : '<span class="chip new">Not sent yet</span>'; }
function playerHtml(k) {
  const m = META[k];
  return `<div class="done"><span class="okt">✅ Recorded · ${clock(m.dur)}</span>${sentChip(m)}</div>
    <audio class="player" controls preload="metadata" src="${urlOf(k)}"></audio>`;
}
function recordingHtml(it, goal) {
  const k = it.key;
  return `<div class="recing"><span class="dot"></span>Recording… <span class="tm" id="t_${sid(k)}">0:00</span>
      <span class="lim">/ ${clock(it.max)}${goal ? ' · aim for ' + clock(goal) : ''}</span></div>
    <div class="track"><div id="b_${sid(k)}"></div>${goal ? `<span class="goal" style="left:${goal / it.max * 100}%"></span>` : ''}</div>
    <button class="btn red sm" type="button" data-act="stop">⏹ Stop</button>`;
}

function paint(k) {
  const el = document.getElementById(sid(k)), it = ITEMS[k];
  if (!el || !it) return;
  if (it.type === 'mock') paintMock(it, el);
  else paintStd(it, el);
  const b = document.querySelector(`[data-opt="${CSS.escape(k)}"]`);
  if (b) { const has = !!META[k]; b.classList.toggle('has', has); b.textContent = has ? '✓ Recorded' : '🎙 Record'; }
}

function paintStd(it, el) {
  const k = it.key, m = META[k], p2 = it.type === 'p2';
  if (REC && REC.key === k) { el.innerHTML = recordingHtml(it, p2 ? P2_GOAL : 0) + msgHtml(k); tick(); return; }
  if (PREP && PREP.key === k) {
    el.innerHTML = `<div class="prep">⏱ Preparation time – ${it.notesKey || it.code.includes('-V') ? 'think of 4–5 keywords' : 'write your 4–5 keywords above'}</div><div class="big" id="p_${sid(k)}">1:00</div>
      <div class="row"><button class="btn blue sm" type="button" data-act="speaknow">▶ Start speaking now</button>
      <button class="linkbtn" type="button" data-act="cancelprep">Cancel</button></div>
      <div class="msg">Recording starts automatically when the minute is up.</div>`;
    prepTick(); return;
  }
  let h = '';
  if (it.cmp && META[it.cmp] && BLOBS[it.cmp]) {
    h += `<div class="cmp">🕰 Your Week 1 answer · ${clock(META[it.cmp].dur)}<audio class="player" controls preload="metadata" src="${urlOf(it.cmp)}"></audio></div>`;
  }
  if (m && BLOBS[k]) {
    h += playerHtml(k) + `<div class="row">${p2 ? '<button class="btn ghost sm" type="button" data-act="prep">⏱ Prepare 1 min &amp; record again</button>' : ''}
      <button class="btn ghost sm" type="button" data-act="rec">🔁 Record again</button></div>`;
  } else {
    if (m) h += '<div class="msg err" style="margin:0 0 6px">This recording isn’t saved on this device any more. Please record it again.</div>';
    h += `<div class="row">${p2 ? '<button class="btn blue sm" type="button" data-act="prep">⏱ Prepare 1 min, then record</button>' : ''}
      <button class="btn sm" type="button" data-act="rec">🎙 Record${p2 ? ' now' : ''}</button>
      <span class="lim">${p2 ? 'speak for about 2:00 (max ' + clock(it.max) + ')' : 'up to ' + clock(it.max)}</span></div>`;
  }
  el.innerHTML = h + msgHtml(k);
}

function paintMock(it, el) {
  const k = it.key, m = META[k];
  const partName = 'Part ' + it.mp;
  if (it.mp === 2 && PREP && PREP.key === k) {
    el.innerHTML = cueHtml(it.q, it.say) + kwHtml(k, '📝 Your notes (1 minute)') +
      `<div class="prep" style="margin-top:8px">⏱ Preparation time</div><div class="big" id="p_${sid(k)}">1:00</div>
      <div class="row"><button class="btn blue sm" type="button" data-act="speaknow">▶ Start speaking now</button></div>
      <div class="msg">Recording starts automatically when the minute is up. Speak for up to 2 minutes.</div>`;
    prepTick(); return;
  }
  if (REC && REC.key === k) {
    if (it.mp === 2) {
      el.innerHTML = cueHtml(it.q, it.say) + (NOTES[k] ? `<div class="small"><b class="muted">Your notes:</b> ${esc(NOTES[k])}</div>` : '') +
        `<div class="recing" style="margin-top:8px"><span class="dot"></span>Recording… time left <span class="tm" id="t_${sid(k)}">2:00</span></div>
        <div class="track"><div id="b_${sid(k)}"></div></div>
        <button class="btn red sm" type="button" data-act="stop">⏹ Finish Part 2</button>`;
    } else {
      const i = REC.qi, q = it.qs[i], last = i === it.qs.length - 1;
      el.innerHTML = `<div class="recing"><span class="dot"></span>Recording… <span class="tm" id="t_${sid(k)}">0:00</span></div>
        <div class="stage"><div class="qn">Question ${i + 1} of ${it.qs.length}${q.group ? ' · ' + esc(q.group) : ''}</div>
        <div class="qbig">${esc(q.q)}</div>${it.mp === 3 ? rescueHtml() : ''}</div>
        <div class="row">${last
          ? `<button class="btn red" type="button" data-act="stop">⏹ Finish ${partName}</button>`
          : `<button class="btn" type="button" data-act="mnext">Next question ›</button>
             <button class="linkbtn" type="button" data-act="stop">Stop early</button>`}</div>`;
    }
    tick(); return;
  }
  let h = '';
  if (m && BLOBS[k]) {
    h += playerHtml(k);
    if (it.qs && m.marks) {
      h += `<ol class="marks">${it.qs.map((q, i) => m.marks[i] == null ? '' : `<li><b>${clock(m.marks[i])}</b> ${esc(q.q)}</li>`).join('')}</ol>`;
    } else if (it.mp === 2) {
      h += `<div class="small" style="margin-top:6px"><b>Topic:</b> ${esc(it.q)} <span class="muted">· your story: ${esc(storyTitle(it.reuse))}</span></div>`;
    }
    h += `<div class="row"><button class="btn ghost sm" type="button" data-act="mstart">🔁 Redo ${partName}</button></div>`;
  } else {
    if (m) h += '<div class="msg err" style="margin:0 0 6px">This recording isn’t saved on this device any more. Please do this part again.</div>';
    h += `<div class="muted small">🙈 The questions are hidden. Recording starts when you press start${it.mp === 2 ? ' (after 1 minute of preparation)' : ' and runs until the last question'}.</div>
      <div class="row"><button class="btn" type="button" data-act="mstart">▶ Start ${partName}</button></div>`;
  }
  el.innerHTML = h + msgHtml(k);
}

/* ================= recording engine ================= */
let REC = null;  // {key, mr, stream, chunks, t0, timer, marks, qi}
let PREP = null; // {key, stream, t0, timer}

function pickMime() {
  const c = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus', 'audio/ogg'];
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
  return c.find(m => MediaRecorder.isTypeSupported(m)) || '';
}
const extOf = t => /mp4|aac|m4a/.test(t) ? 'm4a' : /ogg/.test(t) ? 'ogg' : /wav/.test(t) ? 'wav' : 'webm';

async function getMic(k) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) {
    setMsg(k, 'This browser can’t record audio. Please open this page in Chrome (Android, computer) or Safari (iPhone, iPad).', true);
    return null;
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  } catch (e) {
    const denied = e && (e.name === 'NotAllowedError' || e.name === 'SecurityError');
    setMsg(k, denied
      ? 'The microphone is blocked. Tap the 🔒 icon next to the web address, allow the microphone, then try again.'
      : 'No microphone found. Check your microphone or headset and try again.', true);
    return null;
  }
}
function busy() {
  if (REC) { alert('You are still recording. Press ⏹ Stop first.'); return true; }
  return false;
}

async function recordNow(k) {
  if (REC) return;
  let stream = null;
  if (PREP && PREP.key === k) { stream = PREP.stream; clearInterval(PREP.timer); PREP = null; }
  else {
    if (PREP) cancelPrep();
    stream = await getMic(k);
  }
  if (!stream) { paint(k); return; }
  if (REC) { stream.getTracks().forEach(t => t.stop()); return; }
  const mime = pickMime();
  let mr;
  try { mr = new MediaRecorder(stream, Object.assign({ audioBitsPerSecond: 40000 }, mime ? { mimeType: mime } : {})); }
  catch (e) { mr = new MediaRecorder(stream); }
  const r = { key: k, mr, stream, chunks: [], t0: Date.now(), marks: [0], qi: 0 };
  REC = r;
  mr.ondataavailable = e => { if (e.data && e.data.size) r.chunks.push(e.data); };
  mr.onstop = () => finish(r);
  mr.start(1000);
  r.timer = setInterval(tick, 250);
  setMsg(k, '');
  paint(k);
}
function stopRec() { if (REC && REC.mr.state !== 'inactive') REC.mr.stop(); }
function tick() {
  if (!REC) return;
  const it = ITEMS[REC.key], s = (Date.now() - REC.t0) / 1000, id = sid(REC.key);
  const tm = document.getElementById('t_' + id), bar = document.getElementById('b_' + id);
  const countdown = it.type === 'mock' && it.mp === 2;
  if (tm) tm.textContent = clock(countdown ? it.max - s : s);
  if (bar) bar.style.width = Math.min(100, s / it.max * 100) + '%';
  if (s >= it.max) stopRec();
}
async function finish(r) {
  clearInterval(r.timer);
  try { r.stream.getTracks().forEach(t => t.stop()); } catch (_) {}
  const it = ITEMS[r.key];
  const type = r.mr.mimeType || (r.chunks[0] && r.chunks[0].type) || 'audio/webm';
  const dur = Math.min(it.max, (Date.now() - r.t0) / 1000);
  const blob = new Blob(r.chunks, { type });
  if (REC === r) REC = null;
  if (blob.size < 500 || dur < 1) { setMsg(r.key, 'That recording was too short. Please try again.', true); paint(r.key); updateBar(); return; }
  setBlob(r.key, blob);
  META[r.key] = { dur: Math.round(dur), mime: type.split(';')[0], ext: extOf(type), at: new Date().toISOString(), size: blob.size, sent: false };
  if (it.qs) META[r.key].marks = r.marks.map(t => Math.round(t));
  saveMeta();
  setMsg(r.key, '');
  try { await IDB.put(r.key, blob); }
  catch (e) { setMsg(r.key, 'Note: this device couldn’t save the recording. Send it to your teacher before you close this page.', true); }
  paint(r.key); updateBar();
}

async function startPrep(k) {
  if (busy()) return;
  if (PREP) cancelPrep();
  const stream = await getMic(k);
  if (!stream) { paint(k); return; }
  if (REC || PREP) { stream.getTracks().forEach(t => t.stop()); return; }
  PREP = { key: k, stream, t0: Date.now() };
  PREP.timer = setInterval(prepTick, 250);
  setMsg(k, '');
  paint(k);
}
function prepTick() {
  if (!PREP) return;
  const left = PREP_SEC - (Date.now() - PREP.t0) / 1000;
  const el = document.getElementById('p_' + sid(PREP.key));
  if (el) el.textContent = clock(Math.ceil(Math.max(0, left)));
  if (left <= 0) { clearInterval(PREP.timer); recordNow(PREP.key); }
}
function cancelPrep() {
  if (!PREP) return;
  clearInterval(PREP.timer);
  try { PREP.stream.getTracks().forEach(t => t.stop()); } catch (_) {}
  const k = PREP.key; PREP = null; paint(k);
}

/* ================= actions ================= */
const confirmReplace = () => confirm('Record again? Your old recording will be replaced.');
document.addEventListener('click', e => {
  const opt = e.target.closest('[data-opt]');
  if (opt) {
    const k = opt.dataset.opt;
    if (!META[k]) {
      OPENOPT[k] = !OPENOPT[k];
      const wrap = opt.closest('.opt');
      const ex = wrap.querySelector('.rec');
      if (ex) { if (!(REC && REC.key === k) && !(PREP && PREP.key === k)) ex.remove(); else OPENOPT[k] = true; }
      else { wrap.insertAdjacentHTML('beforeend', `<div class="rec" id="${sid(k)}" data-key="${esc(k)}"></div>`); paint(k); }
    }
    return;
  }
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'editme') { editingMe = true; $('#who').outerHTML = whoHtml(); $('#meName').focus(); return; }
  if (act === 'saveme') { saveMe(); return; }
  const box = b.closest('.rec'); if (!box) return;
  const k = box.dataset.key, it = ITEMS[k];
  if (act === 'rec') { if (busy()) return; if (META[k] && !confirmReplace()) return; recordNow(k); }
  else if (act === 'prep') { if (busy()) return; if (META[k] && !confirmReplace()) return; startPrep(k); }
  else if (act === 'speaknow') recordNow(k);
  else if (act === 'cancelprep') cancelPrep();
  else if (act === 'stop') stopRec();
  else if (act === 'mstart') {
    if (busy()) return;
    if (META[k] && !confirm('Redo Part ' + it.mp + '? Your old recording of this part will be replaced.')) return;
    if (it.mp === 2) startPrep(k); else recordNow(k);
  }
  else if (act === 'mnext') {
    if (!REC || REC.key !== k) return;
    REC.qi = Math.min(it.qs.length - 1, REC.qi + 1);
    REC.marks.push((Date.now() - REC.t0) / 1000);
    paint(k);
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target && (e.target.id === 'meName' || e.target.id === 'meCls')) saveMe();
});
document.addEventListener('input', e => {
  const t = e.target;
  if (t && t.dataset && t.dataset.note) {
    NOTES[t.dataset.note] = t.value;
    saveNotes();
    if (ROUTE) updateBar();
  }
});
window.addEventListener('beforeunload', e => { if (REC) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('visibilitychange', () => { if (document.hidden) LS.set('spk10.notes', NOTES); });

/* ================= sending ================= */
let sending = false;
function setStatus(cls, html) { const el = $('#sendStatus'); el.className = 'status ' + cls; el.innerHTML = html; }
function updateBar() {
  if (!ROUTE) return;
  const st = stats(ROUTE), x = extrasChanged(ROUTE);
  const todo = st.unsent + (x ? 1 : 0);
  $('#sbInfo').innerHTML = `Recorded <b>${st.done}/${st.total}</b> · ` +
    (st.unsent ? `<b style="color:var(--wait)">${plural(st.unsent, 'recording')} not sent yet</b>` : x ? '<b style="color:var(--wait)">new notes not sent yet</b>' : st.any ? '<span style="color:var(--ok)">all sent ✓</span>' : 'nothing recorded yet');
  $('#sendBtn').disabled = sending || !todo;
}
function blobToB64(b) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1] || '');
    fr.onerror = () => rej(fr.error);
    fr.readAsDataURL(b);
  });
}
async function sendWeek() {
  const n = ROUTE;
  if (!n || sending) return;
  if (REC || PREP) { alert('Finish your recording first.'); return; }
  if (!ME.name || !ME.cls) {
    editingMe = true; $('#who').outerHTML = whoHtml();
    $('#who').scrollIntoView({ behavior: 'smooth', block: 'center' });
    setStatus('err', '⚠️ Please enter your name and class first (at the top of the page).');
    return;
  }
  if (!SCRIPT_URL || SCRIPT_URL.includes('PASTE_')) { setStatus('err', '⚠️ This page isn’t connected to your teacher’s email yet (SCRIPT_URL). Please tell your teacher.'); return; }
  const md = getModel(n), st = stats(n);
  const keys = md.items.filter(i => META[i.key] && !META[i.key].sent).map(i => i.key);
  const extras = extrasFor(n), xNew = extrasChanged(n);
  if (!keys.length && !xNew) { setStatus('ok', 'Nothing new to send. Everything is already with your teacher ✓'); return; }
  const missing = st.total - st.done;
  const ask = (keys.length ? `Send ${plural(keys.length, 'recording')} to your teacher?` : 'Send your notes to your teacher?') +
    (missing ? `\n\nYou still have ${plural(missing, 'question')} to record. That’s OK – you can send them later.` : '');
  if (!confirm(ask)) return;

  sending = true; updateBar();
  try {
    await loadBlobs(keys);
    const lost = keys.filter(k => !BLOBS[k]);
    const ready = keys.filter(k => BLOBS[k]);
    // batches by size
    const batches = [];
    let cur = [], size = 0;
    for (const k of ready) {
      const s = BLOBS[k].size;
      if (cur.length && size + s > BATCH_BYTES) { batches.push(cur); cur = []; size = 0; }
      cur.push(k); size += s;
    }
    if (cur.length || !batches.length) batches.push(cur);
    const late = daysLeft(n) < 0;
    for (let b = 0; b < batches.length; b++) {
      setStatus('wait', `⏳ Sending${batches.length > 1 ? ` (part ${b + 1} of ${batches.length})` : ''}… this can take up to a minute. Please keep this page open.`);
      const items = [];
      for (const k of batches[b]) {
        const it = ITEMS[k], m = META[k];
        items.push({
          code: it.code, part: it.part, q: it.q, req: !!it.req, dur: m.dur, at: m.at,
          notes: (NOTES[it.notesKey || k] || '').trim(),
          marks: it.qs && m.marks ? m.marks.map((t, i) => ({ t, q: it.qs[i] ? it.qs[i].q : '' })) : [],
          mime: m.mime, ext: m.ext, b64: await blobToB64(BLOBS[k]),
        });
      }
      const st2 = stats(n);
      const payload = {
        app: 'speaking10', name: ME.name, cls: ME.cls, week: n, weekTitle: WEEKS[n - 1].title,
        due: weekDue(n).toLocaleDateString('en-GB'), late, sentAt: new Date().toISOString(),
        progress: { done: st2.done, total: st2.total }, batch: b + 1, batches: batches.length,
        items, extras: b === 0 ? extras : [],
      };
      const r = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || 'server error');
      const now = new Date().toISOString();
      batches[b].forEach(k => { META[k].sent = true; META[k].sentAt = now; });
      saveMeta();
      if (b === 0) { XSENT[n] = JSON.stringify(extras); LS.set('spk10.xsent', XSENT); }
      batches[b].forEach(paint);
    }
    setStatus('ok', `✅ Sent! Your teacher has received ${ready.length ? plural(ready.length, 'recording') : 'your notes'}.` +
      (lost.length ? ` <span style="color:var(--bad)">${plural(lost.length, 'recording')} couldn’t be found on this device – please record ${lost.length === 1 ? 'it' : 'them'} again.</span>` : ''));
  } catch (err) {
    setStatus('err', `⚠️ Couldn’t send (${esc(err && err.message ? err.message : String(err))}). Check your internet connection and press <b>✉ Send to teacher</b> again – nothing is lost.`);
  } finally {
    sending = false; updateBar();
  }
}
$('#sendBtn').addEventListener('click', sendWeek);

/* ================= routing ================= */
function route() {
  if (REC) stopRec();
  if (PREP) cancelPrep();
  const m = location.hash.match(/^#week-(\d+)$/);
  const n = m ? Number(m[1]) : 0;
  if (n >= 1 && n <= WEEKS.length) renderWeek(n); else renderHome();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();
