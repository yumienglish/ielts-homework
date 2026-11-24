/**
 * Máy chủ nhận bài tập về nhà.
 * - Nhận bài nộp từ trang web (POST JSON)
 * - Gửi email kết quả cho giáo viên
 * - Ghi 1 dòng vào Google Sheet "BTVN – Bài nộp của học sinh" (tự tạo lần đầu)
 * - Nộp 2 lần: lần 1 thêm dòng mới + gửi mail; lần 2 (làm lại câu sai) điền vào CÙNG dòng
 *   (tìm theo "Mã lần nộp") + gửi mail có cả kết quả lần 1 và lần 2. Cột "Điểm" luôn là điểm lần 1.
 *
 * Cài đặt: xem HUONG-DAN-CAI-DAT.md
 */
const TEACHER_EMAIL = 'tqmai1996@gmail.com';
const SHEET_TITLE = 'BTVN – Bài nộp của học sinh';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
// Cột mới luôn thêm ở CUỐI để các dòng cũ không bị lệch
const HEAD = ['Thời gian nộp', 'Họ tên', 'Lớp', 'Bài', 'Điểm', 'Tổng', 'Phần 1', 'Phần 2', 'Phần 3', 'Phần 4', 'Phần 5', 'Câu sai', 'Chi tiết (JSON)',
              'Bắt đầu lúc', 'Thời gian làm bài', 'Số lần rời trang', 'Phần 6', 'Ghi âm',
              'Mã lần nộp', 'Điểm lần 2', 'Câu sai lần 2', 'Nộp lần 2 lúc', 'Thời gian làm lần 2', 'Rời trang lần 2', 'Tài khoản'];
// Tài khoản học sinh (đăng nhập tên + PIN). Cô tạo trong web quản lý lớp hoặc gõ thẳng vào tab này.
const ACC_SHEET = 'TaiKhoan';
// Em tự tạo tài khoản: Tên hiển thị = nickname (hiện trên trang + bảng xếp hạng), Tên đăng nhập = nickname bỏ dấu,
// Họ tên + Lớp = tên thật để cô đối chiếu. "Mã HS" = Tên gọi trong web quản lý lớp (để cô biết nickname là em nào). Mọi tài khoản đang hoạt động đều lên bảng xếp hạng.
const ACC_HEAD = ['Tên đăng nhập', 'PIN', 'Họ tên', 'Tên hiển thị', 'Lớp', 'Avatar', 'Hoạt động', 'Mã HS', 'Ngày tạo', 'Nhân vật'];
// Danh sách học sinh do web quản lý lớp chép sang (để tự ghép tài khoản lúc em đăng ký)
const ROSTER_SHEET = 'DSHocSinh';
const MAX_REG_PER_HOUR = 40;
const TOKEN_DAYS = 180;
const MAX_FAILS = 5, LOCK_SEC = 15 * 60, BOARD_CACHE_SEC = 600;
const MAX_AUDIO_B64 = 20 * 1024 * 1024; // ~15MB file ghi âm, tính tổng mọi file (giới hạn đính kèm Gmail là 25MB)

function fmtTime_(iso) {
  return iso ? Utilities.formatDate(new Date(iso), TIMEZONE, 'HH:mm:ss dd/MM/yyyy') : '—';
}
function fmtDur_(sec) {
  if (sec == null || isNaN(sec)) return '—';
  sec = Math.round(sec);
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
  return (h ? h + ' giờ ' : '') + (h || m ? m + ' phút ' : '') + s + ' giây';
}

/** Chạy hàm này 1 lần trong trình soạn thảo để cấp quyền + tạo Sheet + gửi email thử. */
function setup() {
  const { ss } = getSheet_();
  MailApp.sendEmail(TEACHER_EMAIL, 'BTVN: cài đặt thành công ✅',
    'Máy chủ nhận bài đã sẵn sàng.\nBảng tổng hợp bài nộp: ' + ss.getUrl());
  Logger.log('Sheet: ' + ss.getUrl());
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'board') {
    try { return json_(board_(p.token)); }
    catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  }
  if (p.action === 'profile') {
    try { return json_(homeProfile_(p.token, p.pid)); }
    catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  }
  if (p.action === 'progress') {
    try { return json_(progGet_(p.token)); }
    catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  }
  if (p.action === 'wallet') {
    try { const acc = verifyToken_(p.token); return json_(acc ? wallet_(acc, p.style, p.g) : { ok: false, auth: true, error: 'Please log in again' }); }
    catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  }
  return ContentService.createTextOutput('BTVN: máy chủ nhận bài đang hoạt động ✅');
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (_) { return json_({ ok: false, error: 'Dữ liệu không hợp lệ' }); }
  if (d && d.app === 'a1pet') { // A1 KID: trứng thú cưng đã nở → mail báo cô (hàm petHatched_ ở cuối file)
    try { petHatched_(d); return json_({ ok: true }); }
    catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  }
  if (d && d.action === 'login') {
    try { return json_(login_(d.user, d.pin)); }
    catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
  }
  if (d && d.action === 'register') {
    const lk = LockService.getScriptLock();
    try { lk.waitLock(20000); return json_(register_(d)); }
    catch (err) { return json_({ ok: false, error: String(err && err.message || err) }); }
    finally { try { lk.releaseLock(); } catch (_) {} }
  }
  if (d && d.action === 'progress') return json_(SHOP_ACTIONS.progress(d)); // tiến độ: mỗi em 1 dòng riêng → không chờ khoá chung (không làm chậm nộp bài)
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    if (d && d.action === 'avatar') return json_(setAvatar_(d.token, d.avatar));
    if (d && SHOP_ACTIONS[d.action]) return json_(SHOP_ACTIONS[d.action](d)); // ví 🪙: mua đồ, mở rương, mặc đồ, mini game
    validate_(d);
    if (d.token) { // đã đăng nhập → tên/lớp lấy từ tài khoản, không lấy chữ em gõ
      const acc = verifyToken_(d.token);
      if (!acc) return json_({ ok: false, auth: true, error: 'Your session has expired, please log in again' });
      d.name = acc.fullName || acc.name;
      d.cls = acc.cls || d.cls;
      d.account = acc.user;
    }
    const sheetUrl = logToSheet_(d);
    if (d.account) CacheService.getScriptCache().removeAll(['board', 'stats']);
    if (d.attempt === 2) sendMail2_(d, sheetUrl); else sendMail_(d, sheetUrl);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function validate_(d) {
  if (!d || d.app !== 'btvn') throw new Error('Dữ liệu không hợp lệ');
  if (!Array.isArray(d.items) || d.items.length > 200) throw new Error('Danh sách câu không hợp lệ');
  d.name = String(d.name || '').slice(0, 80);
  d.cls = String(d.cls || '').slice(0, 30);
  d.unit = String(d.unit || '').slice(0, 40);
  d.title = String(d.title || '').slice(0, 120);
  d.score = Number(d.score) || 0;
  d.total = Number(d.total) || 0;
  d.sections = Array.isArray(d.sections) ? d.sections.slice(0, 20) : [];
  d.leaves = Math.max(0, Number(d.leaves) || 0);
  d.timeTakenSec = d.timeTakenSec == null ? null : Number(d.timeTakenSec);
  d.wantsAudio = !!d.wantsAudio;
  d.sid = String(d.sid || '').replace(/[^\w-]/g, '').slice(0, 40);
  d.attempt = Number(d.attempt) === 2 ? 2 : 1;
  d.canRetry = !!d.canRetry;
  if (d.attempt === 2) {
    const f = d.first || {};
    if (!Array.isArray(f.items) || f.items.length > 200) throw new Error('Thiếu kết quả lần 1');
    d.first = { items: f.items, score: Number(f.score) || 0, total: Number(f.total) || 0,
      sections: Array.isArray(f.sections) ? f.sections.slice(0, 20) : [],
      startedAt: f.startedAt || null, submittedAt: f.submittedAt || null,
      timeTakenSec: f.timeTakenSec == null ? null : Number(f.timeTakenSec), leaves: Math.max(0, Number(f.leaves) || 0) };
    d.audio = null;
  }
  if (d.audio) {
    const a = d.audio;
    if (typeof a.b64 !== 'string' || !a.b64 || a.b64.length > MAX_AUDIO_B64) throw new Error('File ghi âm không hợp lệ hoặc quá lớn');
    a.mime = String(a.mime || 'audio/webm').split(';')[0].slice(0, 40);
    if (!/^audio\/[\w.+-]+$/.test(a.mime)) a.mime = 'audio/webm';
    a.ext = String(a.ext || 'webm').replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'webm';
    a.dur = Math.max(0, Number(a.dur) || 0);
    a.label = String(a.label || 'Ghi âm').slice(0, 80);
  } else {
    d.audio = null;
  }
  // Trang có nhiều câu ghi âm (VD: KET speaking) gửi "audios" = nhiều file, đính kèm hết vào mail lần 1;
  // "extras" = phần tự đánh giá không chấm điểm (hiện trong mail lần 1).
  const str = (v, n) => String(v == null ? '' : v).slice(0, n);
  d.extras = (Array.isArray(d.extras) ? d.extras.slice(0, 10) : []).map(x => ({ label: str(x && x.label, 120), text: str(x && x.text, 3000) }));
  if (d.attempt === 2) d.audios = [];
  let size = d.audio ? d.audio.b64.length : 0;
  d.audios = (Array.isArray(d.audios) ? d.audios.slice(0, 20) : []).map(a => {
    if (!a || typeof a.b64 !== 'string' || !a.b64) throw new Error('File ghi âm không hợp lệ');
    size += a.b64.length;
    let mime = str(a.mime || 'audio/webm', 40).split(';')[0];
    if (!/^audio\/[\w.+-]+$/.test(mime)) mime = 'audio/webm';
    return { b64: a.b64, mime: mime, ext: str(a.ext || 'webm', 5).replace(/[^a-z0-9]/gi, '') || 'webm',
      dur: Math.max(0, Number(a.dur) || 0), label: str(a.label || 'Ghi âm', 120), code: str(a.code, 20).replace(/[^A-Za-z0-9-]/g, '') || 'REC' };
  });
  if (size > MAX_AUDIO_B64) throw new Error('Các file ghi âm quá lớn');
}

function fmtClock_(sec) {
  sec = Math.round(sec || 0);
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
function secScore_(s) {
  return s.pending ? 'chờ chấm' : "'" + s.score + '/' + s.total;
}
function audioBlob_(d) {
  if (!d.audio) return null;
  const safe = s => String(s).replace(/[\\/:*?"<>|]+/g, '').trim();
  const fname = safe(d.unit) + ' - ' + safe(d.name) + ' - ' + safe(d.cls) + '.' + d.audio.ext;
  return Utilities.newBlob(Utilities.base64Decode(d.audio.b64), d.audio.mime, fname);
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function getSheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  let ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (_) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(SHEET_TITLE);
    props.setProperty('SHEET_ID', ss.getId());
  }
  let sh = ss.getSheetByName('Bài nộp');
  if (!sh) {
    sh = ss.getSheets()[0];
    sh.setName('Bài nộp');
    sh.setFrozenRows(1);
  }
  // tạo / bổ sung dòng tiêu đề (bảng cũ sẽ tự có thêm cột mới ở cuối)
  const cur = sh.getRange(1, 1, 1, HEAD.length).getValues()[0];
  if (cur.join('|') !== HEAD.join('|')) {
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#d9f2ee');
  }
  return { ss, sh };
}

function wrongList_(items) {
  return items.filter(i => i.ok === false).map(i => i.sec + '.' + i.n).join(', ') || '—';
}
function logToSheet_(d) {
  const { ss, sh } = getSheet_();
  if (d.attempt === 2) {
    const sidCol = HEAD.indexOf('Mã lần nộp') + 1;
    let row = 0;
    if (d.sid && sh.getLastRow() > 1) {
      const hit = sh.getRange(2, sidCol, sh.getLastRow() - 1, 1).createTextFinder(d.sid).matchEntireCell(true).findNext();
      if (hit) row = hit.getRow();
    }
    if (!row) { // lần 1 chưa tới được máy chủ → ghi lần 1 trước
      const f = d.first;
      appendFirst_(sh, Object.assign({}, d, { attempt: 1, canRetry: true, score: f.score, total: f.total, sections: f.sections, items: f.items,
        startedAt: f.startedAt, submittedAt: f.submittedAt, timeTakenSec: f.timeTakenSec, leaves: f.leaves, audio: null }));
      row = sh.getLastRow();
    }
    sh.getRange(row, sidCol + 1, 1, 5).setValues([["'" + d.score + '/' + d.total, wrongList_(d.items),
      d.submittedAt ? new Date(d.submittedAt) : new Date(), fmtDur_(d.timeTakenSec), d.leaves]]);
    return ss.getUrl();
  }
  appendFirst_(sh, d);
  return ss.getUrl();
}
function appendFirst_(sh, d) {
  // thêm dấu ' để Sheets không hiểu "6/6" là ngày tháng
  const secs = d.sections.map(secScore_);
  while (secs.length < 6) secs.push('');
  const when = d.submittedAt ? new Date(d.submittedAt) : new Date();
  const audios = d.audios || [];
  const rec = audios.length ? 'Có ' + audios.length + ' file (' + fmtClock_(audios.reduce((s, a) => s + a.dur, 0)) + ') – đính kèm trong email'
    : d.audio ? 'Có (' + fmtClock_(d.audio.dur) + ') – file đính kèm trong email' : (d.wantsAudio ? 'Không ghi âm' : '');
  const second = d.sid && !d.canRetry ? 'Không cần (đúng hết)' : '';
  sh.appendRow([when, d.name, d.cls, d.title, d.score, d.total].concat(secs.slice(0, 5), [wrongList_(d.items), JSON.stringify(d.items),
    d.startedAt ? new Date(d.startedAt) : '—', fmtDur_(d.timeTakenSec), d.leaves, secs[5], rec, d.sid || '', second, '', '', '', '', d.account || '']));
}

/* ================= TÀI KHOẢN + BẢNG XẾP HẠNG ================= */

/** Bỏ dấu, chữ thường, chỉ giữ chữ + số: "Phương 10" → "phuong10". */
function normUser_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
}
function normPin_(p) {
  const s = String(p == null ? '' : p).replace(/\D/g, '');
  return s ? s.padStart(4, '0') : '';
}
function accSheet_() {
  const { ss } = getSheet_();
  let sh = ss.getSheetByName(ACC_SHEET);
  if (!sh) {
    sh = ss.insertSheet(ACC_SHEET);
    sh.getRange(1, 1, 1, ACC_HEAD.length).setValues([ACC_HEAD]).setFontWeight('bold').setBackground('#ffe3ec');
    sh.setFrozenRows(1);
    sh.getRange('B:B').setNumberFormat('@'); // PIN giữ số 0 đầu
  } else if (sh.getRange(1, 1, 1, ACC_HEAD.length).getValues()[0].join('|') !== ACC_HEAD.join('|')) {
    sh.getRange(1, 1, 1, ACC_HEAD.length).setValues([ACC_HEAD]).setFontWeight('bold').setBackground('#ffe3ec'); // bảng cũ: thêm cột mới
  }
  return sh;
}
/** Đọc tab TaiKhoan → { user: {...} } */
function accounts_() {
  const sh = accSheet_();
  const n = sh.getLastRow() - 1;
  const out = {};
  if (n < 1) return out;
  sh.getRange(2, 1, n, ACC_HEAD.length).getValues().forEach((r, i) => {
    const user = normUser_(r[0]);
    if (!user) return;
    const act = r[6];
    out[user] = {
      user: user, pin: normPin_(r[1]), fullName: String(r[2] || '').trim(),
      name: String(r[3] || r[2] || r[0]).trim(), cls: String(r[4] || '').trim(), avatar: String(r[5] || ''),
      active: !(act === false || /^(false|không|khong|0|tắt|tat)$/i.test(String(act).trim())), row: i + 2,
      hs: String(r[7] || '').trim().replace(/^-$/, ''), // "-" = cô đã bỏ ghép → chưa lên bảng
      outfits: outfitsOf_(r[9], r[5]) // nhân vật từng bộ {teen: 'teen:{..}', ket: 'ket:{..}'}
    };
  });
  return out;
}

/* ---- tự ghép tài khoản mới với học sinh (theo họ tên thật + lớp), giống cách web quản lý ghép bài nộp ---- */
function normName_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function clsCode_(s) { const m = /([A-Za-z]{2,4})\s*-?\s*(\d{2,3})/.exec(String(s || '')); return m ? (m[1] + m[2]).toUpperCase() : ''; }
/** → Tên gọi của học sinh khớp DUY NHẤT, hoặc '' */
function rosterMatch_(full, cls) {
  const { ss } = getSheet_();
  const sh = ss.getSheetByName(ROSTER_SHEET);
  if (!sh || sh.getLastRow() < 2) return '';
  const n = normName_(full), c = clsCode_(cls);
  if (!n) return '';
  const list = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().filter(r => String(r[0]).trim()).map(r => {
    const name = String(r[0]).trim(), plain = name.replace(/\(.*?\)/g, ' ');
    const keys = [normName_(name), normName_(plain), normName_(r[1])].concat(String(r[3] || '').split(/[,;\n]/).map(normName_));
    return { name: name, keys: keys.filter(String), cls: clsCode_(r[2]), given: normName_(plain).split(' ')[0] };
  });
  let cand = list.filter(x => x.keys.indexOf(n) >= 0);
  if (cand.length > 1 && c) cand = cand.filter(x => x.cls === c);
  if (cand.length === 1) return cand[0].name;
  if (!cand.length && c) { // gõ họ tên đầy đủ nhưng danh sách chỉ có tên gọi → tìm tên riêng trong đúng lớp
    const toks = n.split(' ');
    const g = list.filter(x => x.cls === c && x.given && toks.indexOf(x.given) >= 0);
    if (g.length === 1) return g[0].name;
  }
  return '';
}

/** Em tự tạo tài khoản: nickname + PIN + họ tên thật + lớp. Khớp đúng 1 học sinh (chưa ai dùng) → tự ghép; không thì chờ cô ghép (vẫn lên bảng bằng nickname). */
function register_(d) {
  const nick = String(d.nick || '').replace(/\s+/g, ' ').trim();
  const user = normUser_(nick), pin = normPin_(d.pin);
  const full = String(d.full || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const cls = clsCode_(d.cls) || String(d.cls || '').trim().toUpperCase().slice(0, 30); // "ket 01" → KET01
  if (nick.length < 3 || nick.length > 20 || !/^[\p{L}\p{N} ._-]+$/u.test(nick) || user.length < 3)
    return { ok: false, field: 'nick', error: 'Nickname: 3–20 characters, letters, numbers and spaces only' };
  if (full.split(' ').length < 2 || !/^[\p{L} .'-]+$/u.test(full)) return { ok: false, field: 'full', error: 'Please enter your full real name (e.g. Nguyễn Minh Anh)' };
  if (!cls) return { ok: false, field: 'cls', error: 'Please enter your class (e.g. KET01)' };
  if (pin.length !== 4 || String(d.pin).replace(/\D/g, '').length !== 4) return { ok: false, field: 'pin', error: 'Your PIN must have exactly 4 digits' };
  const cache = CacheService.getScriptCache();
  const hk = 'reg:' + Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMddHH');
  const cnt = Number(cache.get(hk) || 0);
  if (cnt >= MAX_REG_PER_HOUR) return { ok: false, error: 'Too many sign-ups right now, please try again in a few minutes' };
  const accs = accounts_();
  if (accs[user] || Object.keys(accs).some(u => normUser_(accs[u].name) === user)) return { ok: false, field: 'nick', error: 'That nickname is taken, please choose another one' };
  let hs = rosterMatch_(full, cls);
  if (hs && Object.keys(accs).some(u => accs[u].active && accs[u].hs === hs)) hs = ''; // em đó đã có tài khoản → chờ cô xem
  const sh = accSheet_();
  const r = sh.getLastRow() + 1;
  sh.getRange(r, 2).setNumberFormat('@');
  sh.getRange(r, 1, 1, ACC_HEAD.length).setValues([[user, pin, full, nick, cls, '', true, hs, new Date(), '']]);
  cache.put(hk, String(cnt + 1), 3600);
  if (hs) cache.remove('board');
  const acc = { user: user, pin: pin, fullName: full, name: nick, cls: cls, avatar: '', outfits: {}, active: true, hs: hs, row: r };
  return { ok: true, token: makeToken_(acc), me: profile_(acc) };
}
function secret_() {
  const props = PropertiesService.getScriptProperties();
  let s = props.getProperty('AUTH_SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); props.setProperty('AUTH_SECRET', s); }
  return s;
}
function sign_(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, secret_())).replace(/=+$/, '').slice(0, 32);
}
/** Token = user.hạn.chữ-ký. Chữ ký gồm cả PIN → cô đổi PIN thì phiên cũ tự hết hiệu lực. */
function makeToken_(acc) {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_DAYS * 86400;
  return acc.user + '.' + exp + '.' + sign_(acc.user + '.' + exp + '.' + acc.pin);
}
function verifyToken_(tok) {
  const m = /^([a-z0-9]{1,30})\.(\d{9,11})\.([\w-]{20,40})$/.exec(String(tok || ''));
  if (!m || Number(m[2]) * 1000 < Date.now()) return null;
  const acc = accounts_()[m[1]];
  if (!acc || !acc.active || !acc.pin) return null;
  return sign_(m[1] + '.' + m[2] + '.' + acc.pin) === m[3] ? acc : null;
}
/** Thông tin trả về trang: CHỈ nickname (tên thật chỉ cô thấy). approved = đã ghép với học sinh → có trên bảng. */
function profile_(acc) {
  return { user: acc.user, name: acc.name, cls: acc.cls, avatar: acc.avatar, outfits: acc.outfits || {}, approved: !!acc.hs };
}
/** Cột "Nhân vật" (JSON {bộ: chuỗi}) + avatar hiện tại nếu là nhân vật tủ đồ → mỗi bộ giữ nhân vật riêng. */
function outfitsOf_(cell, avatar) {
  let m = {}; try { m = JSON.parse(String(cell || '') || '{}') || {}; } catch (_) { m = {}; }
  const out = {};
  Object.keys(m).forEach(k => { if (/^[a-z0-9]+$/.test(k) && typeof m[k] === 'string' && m[k].indexOf(k + ':{') === 0) out[k] = m[k]; });
  const cur = /^([a-z0-9]+):\{/.exec(String(avatar || ''));
  if (cur && !out[cur[1]]) out[cur[1]] = String(avatar);
  return out;
}

function login_(user, pin) {
  user = normUser_(user); pin = normPin_(pin);
  if (!user || pin.length !== 4) return { ok: false, error: 'Please enter your nickname and 4-digit PIN' };
  const cache = CacheService.getScriptCache();
  const key = 'fail:' + user;
  const fails = Number(cache.get(key) || 0);
  if (fails >= MAX_FAILS) return { ok: false, locked: true, error: 'Too many wrong tries. Please wait 15 minutes and try again' };
  const accsL = accounts_();
  let acc = accsL[user];
  if (!acc) { const u2 = Object.keys(accsL).filter(u => normUser_(accsL[u].name) === user)[0]; if (u2) acc = accsL[u2]; } // nickname mới sau khi đổi tên
  if (!acc || !acc.active || acc.pin !== pin) {
    cache.put(key, String(fails + 1), LOCK_SEC);
    return { ok: false, error: acc && acc.active ? 'Wrong PIN. Forgot it? Message your teacher' : 'Nickname not found. Check it, or tap "Sign up"' };
  }
  cache.remove(key);
  return { ok: true, token: makeToken_(acc), me: profile_(acc) };
}

/** Avatar để hiện trên bảng: emoji ngắn, hoặc đường dẫn ảnh trong yumienglish.github.io (VD /KET/img/ui/av-3.webp). */
function setAvatar_(tok, av) {
  const acc = verifyToken_(tok);
  if (!acc) return { ok: false, auth: true, error: 'Your session has expired' };
  av = String(av || '').trim();
  const ok = /^\/[\w-]+(\/[\w.-]+)+\.(webp|png|jpe?g|svg)$/i.test(av) || (av.length > 0 && av.length <= 12 && !/[<>"'&\s]/.test(av));
  if (!ok) return { ok: false, error: 'Invalid avatar' };
  if (/^[a-z0-9]+:{/.test(acc.avatar)) return { ok: true, kept: true }; // đã có nhân vật (tủ đồ) → không ghi đè bằng avatar cũ của trang
  accSheet_().getRange(acc.row, 6).setValue(av);
  CacheService.getScriptCache().remove('board');
  return { ok: true };
}

/** XP 1 bài (giống PET Arena): % đúng lần 1 + sửa đúng lần 2 (≤50) + 20 không rời trang + 50 đúng hết lần 1. */
function rowXp_(score, total, second, leaves) {
  score = Number(score) || 0; total = Number(total) || 0;
  if (total <= 0) return 0;
  let xp = Math.round(score / total * 100);
  const m = /(\d+)\s*\/\s*(\d+)/.exec(String(second || ''));
  if (m && total > score) {
    const s2 = Math.min(Number(m[1]), total);
    if (s2 > score) xp += Math.round((s2 - score) / (total - score) * 50);
  }
  if (leaves === 0 || leaves === '0') xp += 20;
  if (score >= total) xp += 50;
  return xp;
}

/** Tính bảng (cache 10 phút, xoá khi có bài nộp mới). Trả về danh sách có user — chỉ dùng nội bộ. */
function boardData_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('board');
  if (hit) return JSON.parse(hit);
  const accs = accounts_();
  const { sh } = getSheet_();
  const now = new Date();
  const today = Utilities.formatDate(now, TIMEZONE, 'yyyy-MM-dd');
  const dow = Number(Utilities.formatDate(now, TIMEZONE, 'u')); // 1 = thứ Hai
  const monday = Utilities.formatDate(new Date(now.getTime() - (dow - 1) * 86400000), TIMEZONE, 'yyyy-MM-dd');
  const month = today.slice(0, 7);
  const tally = { week: {}, month: {}, all: {} };
  const col = name => HEAD.indexOf(name);
  const C = { when: col('Thời gian nộp'), title: col('Bài'), score: col('Điểm'), total: col('Tổng'), leaves: col('Số lần rời trang'),
    second: col('Điểm lần 2'), acc: col('Tài khoản') };
  const n = sh.getLastRow() - 1;
  const rows = n > 0 ? sh.getRange(2, 1, n, HEAD.length).getValues() : [];
  const seen = {};
  rows.forEach(r => {
    const user = normUser_(r[C.acc]);
    if (!user || !accs[user] || !accs[user].active) return; // chờ ghép vẫn lên bảng (chỉ hiện nickname)
    const title = String(r[C.title] || '');
    if (/LÀM LẠI/i.test(title)) return; // làm lại không cộng thêm
    const k = user + '|' + title;
    if (seen[k]) return; // mỗi bài chỉ tính lần nộp đầu
    seen[k] = 1;
    const xp = rowXp_(r[C.score], r[C.total], r[C.second], r[C.leaves]);
    const when = r[C.when] instanceof Date ? r[C.when] : new Date(r[C.when]);
    const ymd = isNaN(when) ? '' : Utilities.formatDate(when, TIMEZONE, 'yyyy-MM-dd');
    const add = t => { const o = t[user] || (t[user] = { xp: 0, n: 0 }); o.xp += xp; o.n += 1; };
    add(tally.all);
    if (ymd.slice(0, 7) === month) add(tally.month);
    if (ymd >= monday) add(tally.week);
  });
  const list = t => Object.keys(accs).filter(u => accs[u].active).map(u => ({
    user: u, name: accs[u].name, cls: accs[u].cls, avatar: accs[u].avatar, xp: (t[u] || {}).xp || 0, n: (t[u] || {}).n || 0
  })).sort((a, b) => b.xp - a.xp || b.n - a.n || a.name.localeCompare(b.name, 'vi'))
    .map((o, i, arr) => Object.assign(o, { rank: i && arr[i - 1].xp === o.xp ? arr[i - 1].rank : i + 1 }));
  const data = { updated: now.toISOString(), week: list(tally.week), month: list(tally.month), all: list(tally.all) };
  try { cache.put('board', JSON.stringify(data), BOARD_CACHE_SEC); } catch (_) {}
  return data;
}

/** Bảng xếp hạng cho học sinh đã đăng nhập: không lộ tên đăng nhập của bạn khác. */
/* ================= NHÀ BẠN: thả cảm xúc, sổ lưu bút, đổi nickname =================
 * Tab "NhaBan": Thời gian | Từ | Đến | Loại (like/haha/cay/comment) | Nội dung | Ẩn (cô gõ 1 để ẩn bình luận)
 */
const SOCIAL_SHEET = 'NhaBan';
const SOCIAL_HEAD = ['Thời gian', 'Từ', 'Đến', 'Loại', 'Nội dung', 'Ẩn'];
const REACTS = ['like', 'haha', 'cay'], COMMENT_MAX = 120, COMMENTS_PER_DAY = 10, RENAME_PRICE = 300;
// từ tục / chửi (so trên chữ thường; từ tiếng Việt có dấu so nguyên dạng, viết tắt so theo từ đứng riêng)
const BAD_WORDS = ['địt', 'đụ', 'đéo', 'lồn', 'cặc', 'buồi', 'đĩ', 'chó đẻ', 'óc chó', 'ngu như', 'thằng ngu', 'con ngu', 'mất dạy', 'đồ ngu', 'fuck', 'shit', 'bitch', 'dick', 'pussy', 'bastard', 'idiot', 'stupid', 'loser'];
const BAD_ABBR = ['dm', 'dmm', 'dcm', 'dkm', 'vcl', 'vkl', 'vl', 'clm', 'wtf', 'stfu', 'fk']; // viết tắt rõ nghĩa, đứng riêng
const BAD_PLAIN = ['lon', 'cac', 'ngu', 'deo', 'dit', 'dis', 'cl', 'cc']; // chỉ khi em gõ ĐÚNG chữ không dấu này (lớn/các/ngủ/đeo… không bị chặn)
function isRude_(text) {
  const low = String(text || '').toLowerCase();
  if (BAD_WORDS.some(w => low.indexOf(w) >= 0)) return true;
  const raw = low.split(/[^\p{L}\p{N}]+/u).filter(String); // từ gốc (giữ dấu)
  if (raw.some(t => BAD_PLAIN.indexOf(t) >= 0)) return true;
  const plain = low.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').split(/[^a-z0-9]+/);
  return plain.some(t => BAD_ABBR.indexOf(t) >= 0);
}
function socialSheet_() {
  const { ss } = getSheet_();
  let sh = ss.getSheetByName(SOCIAL_SHEET);
  if (!sh) { sh = ss.insertSheet(SOCIAL_SHEET); sh.getRange(1, 1, 1, SOCIAL_HEAD.length).setValues([SOCIAL_HEAD]).setFontWeight('bold').setBackground('#ffe3ec'); sh.setFrozenRows(1); }
  return sh;
}
function socialRows_() {
  const sh = socialSheet_(); const n = sh.getLastRow() - 1; if (n < 1) return [];
  return sh.getRange(2, 1, n, SOCIAL_HEAD.length).getValues().map((r, i) => ({ row: i + 2, at: r[0] instanceof Date ? r[0] : new Date(r[0]), from: normUser_(r[1]), to: normUser_(r[2]), type: String(r[3]), text: String(r[4] || ''), hidden: !!String(r[5] || '').trim() && String(r[5]).trim() !== '0' }));
}
/** Cảm xúc (đếm + mình đã thả chưa) và 30 bình luận mới nhất của 1 nhà. */
function socialOf_(owner, viewer, accs) {
  const rows = socialRows_().filter(r => r.to === owner && !r.hidden);
  const counts = {}, mine = {};
  REACTS.forEach(t => { const rs = rows.filter(r => r.type === t); counts[t] = rs.length; mine[t] = rs.some(r => r.from === viewer); });
  const comments = rows.filter(r => r.type === 'comment').slice(-30).reverse().map(r => ({
    cid: r.row, name: (accs[r.from] || {}).name || '?', pid: pid_(r.from), text: r.text,
    at: isNaN(r.at) ? '' : Utilities.formatDate(r.at, TIMEZONE, "yyyy-MM-dd'T'HH:mm"), mine: r.from === viewer, canDel: r.from === viewer || owner === viewer }));
  return { counts: counts, mine: mine, comments: comments, own: owner === viewer };
}
function ownerByPid_(pid, accs) { return Object.keys(accs).filter(u => accs[u].active && pid_(u) === String(pid || ''))[0] || ''; }

/* ================= TIẾN ĐỘ THEO TÀI KHOẢN =================
 * Tab "TienDo": Tài khoản | Trang | Cập nhật | Dữ liệu… (JSON {khoá localStorage: chuỗi}, dài thì cắt sang các ô bên phải)
 * → đổi máy / dùng chung máy vẫn giữ sao, màn đã qua, bài đang làm. Cô không cần sửa tab này.
 */
const PROG_SHEET = 'TienDo', PROG_CHUNK = 45000, PROG_MAXCH = 12;
const PROG_KEYS = { ket: /^ket-/, pet: /^pet-/, b2: /^b2-/, a1: /^(a1kid-|btvn-listening-trainer-a1-)/, ielts: /^(btvn-(?!listening-trainer-a1)|ielts-)/ };
function progSheet_() {
  const { ss } = getSheet_();
  let sh = ss.getSheetByName(PROG_SHEET);
  if (!sh) {
    sh = ss.insertSheet(PROG_SHEET);
    sh.getRange(1, 1, 1, 4).setValues([['Tài khoản', 'Trang', 'Cập nhật', 'Dữ liệu']]).setFontWeight('bold').setBackground('#e3f6ff');
    sh.setFrozenRows(1);
  }
  return sh;
}
/** Các dòng tiến độ của 1 em: {nhóm: {row, at, data}} */
function progRows_(user) {
  const sh = progSheet_(), last = sh.getLastRow(), out = {};
  if (last < 2 || !user) return out;
  sh.getRange(2, 1, last - 1, 1).createTextFinder(user).matchEntireCell(true).findAll().forEach(c => {
    const r = c.getRow(), v = sh.getRange(r, 1, 1, 3 + PROG_MAXCH).getValues()[0], g = String(v[1]);
    if (!PROG_KEYS[g] || out[g] || normUser_(v[0]) !== user) return;
    let data = {};
    try { data = JSON.parse(v.slice(3).map(x => String(x || '').replace(/^~/, '')).join('') || '{}') || {}; } catch (_) { data = {}; }
    out[g] = { row: r, at: v[2] instanceof Date ? v[2].getTime() : Number(v[2]) || 0, data: data };
  });
  return out;
}
function progWrite_(sh, user, g, row, data) {
  const s = JSON.stringify(data), ch = [];
  for (let i = 0; i < s.length; i += PROG_CHUNK) ch.push('~' + s.slice(i, i + PROG_CHUNK)); // "~" đầu ô: không bị hiểu thành số/ngày/công thức
  if (ch.length > PROG_MAXCH) throw new Error('Progress data too big');
  while (ch.length < PROG_MAXCH) ch.push('');
  const now = new Date(), vals = [user, g, now].concat(ch);
  if (row) sh.getRange(row, 1, 1, vals.length).setValues([vals]); else sh.appendRow(vals);
  return now.getTime();
}
function progGet_(tok) {
  const acc = verifyToken_(tok);
  if (!acc) return { ok: false, auth: true, error: 'Please log in again' };
  const rows = progRows_(acc.user), data = {}, at = {};
  Object.keys(rows).forEach(g => { data[g] = rows[g].data; at[g] = rows[g].at; });
  return { ok: true, data: data, at: at, me: profile_(acc) };
}

/** Mã ẩn của 1 tài khoản (không lộ tên đăng nhập): dùng để mở "nhà" của bạn trên bảng xếp hạng. */
function pid_(user) { return sign_('pid:' + user).slice(0, 14); }
/** "Nhà bạn": nickname, lớp, nhân vật đang mặc, hạng + XP tuần/tháng/tổng, số bài, chuỗi tuần, bộ sưu tập đồ. Không có tên thật. */
function homeProfile_(tok, pid) { // (tên riêng: profile_(acc) là hàm của đăng nhập)
  const acc = verifyToken_(tok);
  if (!acc) return { ok: false, auth: true, error: 'Please log in again' };
  const accs = accounts_();
  const user = Object.keys(accs).filter(u => accs[u].active && pid_(u) === String(pid || ''))[0];
  if (!user) return { ok: false, error: 'Player not found' };
  const a = accs[user], data = boardData_();
  const pick = list => { const o = list.filter(x => x.user === user)[0]; return o ? { rank: o.rank, xp: o.xp, n: o.n, of: list.length } : { rank: 0, xp: 0, n: 0, of: list.length }; };
  const st = statsAll_()[user] || { lessons: 0, perfect: 0, streak: 0 };
  const owned = ledger_(user).filter(r => r.item).map(r => r.item);
  return { ok: true, me: user === acc.user, name: a.name, cls: a.cls, avatar: a.avatar,
    week: pick(data.week), month: pick(data.month), all: pick(data.all),
    lessons: st.lessons, perfect: st.perfect, streak: st.streak, owned: owned.filter((x, i) => owned.indexOf(x) === i),
    social: socialOf_(user, acc.user, accs), renamePrice: RENAME_PRICE, coins: user === acc.user ? walletState_(acc).coins : undefined };
}

function board_(tok) {
  const acc = verifyToken_(tok);
  if (!acc) return { ok: false, auth: true, error: 'Please log in to see the leaderboard' };
  const data = boardData_();
  const strip = arr => arr.map(o => ({ pid: pid_(o.user), rank: o.rank, name: o.name, cls: o.cls, avatar: o.avatar, xp: o.xp, n: o.n, me: o.user === acc.user || undefined }));
  return { ok: true, updated: data.updated, me: profile_(acc), week: strip(data.week), month: strip(data.month), all: strip(data.all) };
}

/** Chạy tay trong trình soạn thảo để thử: tạo tab TaiKhoan + in bảng XP ra Log. */
function testBoard() {
  accSheet_();
  CacheService.getScriptCache().remove('board');
  Logger.log(JSON.stringify(boardData_()).slice(0, 3000));
}

function sendMail_(d, sheetUrl) {
  const subject = '[BTVN ' + d.unit + '] ' + d.name + ' – ' + d.cls + ' – ' + (d.canRetry ? 'Lần 1: ' : '') + d.score + '/' + d.total;
  const td = 'style="border:1px solid #e3dccf;padding:6px 8px;vertical-align:top"';
  const row = (k, v) => '<tr><td style="padding:3px 14px 3px 0;color:#666">' + k + '</td><td style="padding:3px 0"><b>' + v + '</b></td></tr>';
  let html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;max-width:760px">' +
    '<h2 style="margin:0 0 8px;color:#14866d">' + esc_(d.title) + '</h2>' +
    '<table style="border-collapse:collapse;margin-bottom:12px;font-size:14px">' +
    row('Học sinh', esc_(d.name) + ' – Lớp ' + esc_(d.cls)) +
    row(d.sid ? 'Điểm lần 1 (score)' : 'Điểm (score)', '<span style="font-size:20px;color:#14866d">' + d.score + '/' + d.total + '</span>') +
    row('Bắt đầu (started)', fmtTime_(d.startedAt)) +
    row('Nộp bài (submitted)', fmtTime_(d.submittedAt)) +
    row('Thời gian làm (time taken)', fmtDur_(d.timeTakenSec)) +
    row('Rời trang (left the page)', '<span style="color:' + (d.leaves ? '#d64045' : '#1f8a4c') + '">' + d.leaves + ' lần</span>') +
    '</table>';
  const nWrong = d.items.filter(i => i.ok === false).length;
  if (d.canRetry && nWrong) {
    html += '<p style="margin:0 0 10px;padding:8px 10px;background:#fff4e0;border-radius:6px">🔁 Học sinh được <b>làm lại ' + nWrong +
      ' câu sai</b>. Kết quả lần 2 sẽ gửi trong một email nữa (nếu học sinh làm lại).</p>';
  } else if (d.sid && !nWrong) {
    html += '<p style="margin:0 0 10px;padding:8px 10px;background:#eefaf3;border-radius:6px">🎉 Đúng hết ngay lần 1, không cần làm lại.</p>';
  }

  d.sections.forEach(s => {
    html += '<h3 style="margin:16px 0 6px">' + esc_(s.title) + ' — ' + (s.pending ? 'cô chấm' : s.score + '/' + s.total) + '</h3>' +
      '<table style="border-collapse:collapse;width:100%;font-size:13.5px">' +
      '<tr style="background:#f4efe6"><th ' + td + '>Câu</th><th ' + td + '>Đề</th><th ' + td + '>HS trả lời</th><th ' + td + '>Đáp án</th><th ' + td + '></th></tr>';
    d.items.filter(i => i.sec === s.id).forEach(i => {
      html += '<tr style="background:' + (i.ok == null ? '#fff8e6' : i.ok ? '#eefaf3' : '#fdecec') + '">' +
        '<td ' + td + '>' + esc_(i.n) + '</td>' +
        '<td ' + td + '>' + esc_(i.q) + '</td>' +
        '<td ' + td + '><b>' + (i.ans ? esc_(i.ans) : '<i style="color:#999">(bỏ trống)</i>') + '</b></td>' +
        '<td ' + td + '>' + esc_(i.correct) + '</td>' +
        '<td ' + td + '>' + (i.ok == null ? '⏳' : i.ok ? '✅' : '❌') + '</td></tr>';
    });
    html += '</table>';
  });
  (d.extras || []).forEach(x => {
    html += '<h3 style="margin:16px 0 6px">📝 ' + esc_(x.label) + '</h3>' +
      '<p style="margin:0;padding:8px 10px;background:#f6f3ff;border-radius:6px">' + esc_(x.text).replace(/\n/g, '<br>') + '</p>';
  });
  const audios = d.audios || [];
  if (audios.length) {
    html += '<h3 style="margin:16px 0 6px">🎙 ' + audios.length + ' file ghi âm – <b>đính kèm ở cuối email này</b></h3><ul style="margin:0;padding-left:20px">' +
      audios.map(a => '<li>' + esc_(a.label) + ' – ' + fmtClock_(a.dur) + '</li>').join('') + '</ul>';
  } else if (d.audio || d.wantsAudio) {
    html += '<h3 style="margin:16px 0 6px">🎙 ' + esc_(d.audio ? d.audio.label : 'Ghi âm') + '</h3>' +
      (d.audio
        ? '<p style="margin:0">File ghi âm dài <b>' + fmtClock_(d.audio.dur) + '</b>, <b>đính kèm ở cuối email này</b>. Bấm vào file để nghe.</p>'
        : '<p style="margin:0;color:#d64045"><b>Học sinh không nộp bài ghi âm.</b></p>');
  }
  html += '<p style="margin-top:16px"><a href="' + sheetUrl + '">📊 Mở bảng tổng hợp bài nộp (Google Sheet)</a></p></div>';

  const hasRec = !!(d.audio || audios.length);
  const msg = { to: TEACHER_EMAIL, subject: subject + (hasRec ? ' 🎙' : ''), htmlBody: html, name: 'Bài tập về nhà' };
  const safe = s => String(s).replace(/[\\/:*?"<>|]+/g, '').trim();
  const blobs = audios.map(a => Utilities.newBlob(Utilities.base64Decode(a.b64), a.mime,
    safe(d.unit) + ' - ' + safe(d.name) + ' - ' + a.code + '.' + a.ext));
  const blob = audioBlob_(d);
  if (blob) blobs.unshift(blob);
  if (blobs.length) msg.attachments = blobs;
  MailApp.sendEmail(msg);
}

/** Email lần 2: so sánh lần 1 và lần 2 cho từng câu. */
function sendMail2_(d, sheetUrl) {
  const f = d.first;
  const subject = '[BTVN ' + d.unit + '] ' + d.name + ' – ' + d.cls + ' – Lần 1: ' + f.score + '/' + f.total + ' → Lần 2: ' + d.score + '/' + d.total;
  const td = 'style="border:1px solid #e3dccf;padding:6px 8px;vertical-align:top"';
  const th = 'style="border:1px solid #e3dccf;padding:6px 8px;background:#f4efe6;text-align:left"';
  const leaves = n => '<span style="color:' + (n ? '#d64045' : '#1f8a4c') + '">' + n + ' lần</span>';
  const line = (k, a, b) => '<tr><td ' + td + '>' + k + '</td><td ' + td + '><b>' + a + '</b></td><td ' + td + '><b>' + b + '</b></td></tr>';
  let html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;max-width:760px">' +
    '<h2 style="margin:0 0 4px;color:#14866d">' + esc_(d.title) + '</h2>' +
    '<p style="margin:0 0 10px">Học sinh: <b>' + esc_(d.name) + '</b> – Lớp <b>' + esc_(d.cls) + '</b></p>' +
    '<table style="border-collapse:collapse;margin-bottom:12px;font-size:14px">' +
    '<tr><th ' + th + '></th><th ' + th + '>Lần 1 (làm cả bài)</th><th ' + th + '>Lần 2 (làm lại câu sai)</th></tr>' +
    line('Điểm', '<span style="font-size:18px">' + f.score + '/' + f.total + '</span>', '<span style="font-size:18px;color:#14866d">' + d.score + '/' + d.total + '</span>') +
    line('Bắt đầu', fmtTime_(f.startedAt), fmtTime_(d.startedAt)) +
    line('Nộp bài', fmtTime_(f.submittedAt), fmtTime_(d.submittedAt)) +
    line('Thời gian làm', fmtDur_(f.timeTakenSec), fmtDur_(d.timeTakenSec)) +
    line('Rời trang', leaves(f.leaves), leaves(d.leaves)) +
    '</table>';

  const firstBy = {};
  f.items.forEach(i => { firstBy[i.sec + '|' + i.n] = i; });
  const ansHtml = a => a ? esc_(a) : '<i style="color:#999">(bỏ trống)</i>';
  d.sections.forEach(s => {
    const fs = f.sections.filter(x => x.id === s.id)[0];
    html += '<h3 style="margin:16px 0 6px">' + esc_(s.title) + ' — ' +
      (s.pending ? 'cô chấm' : 'Lần 1: ' + (fs ? fs.score : '?') + '/' + s.total + ' → Lần 2: ' + s.score + '/' + s.total) + '</h3>' +
      '<table style="border-collapse:collapse;width:100%;font-size:13.5px">' +
      '<tr style="background:#f4efe6"><th ' + td + '>Câu</th><th ' + td + '>Đề</th><th ' + td + '>Lần 1</th><th ' + td + '>Lần 2</th><th ' + td + '>Đáp án</th><th ' + td + '></th></tr>';
    d.items.filter(i => i.sec === s.id).forEach(i => {
      const a = firstBy[i.sec + '|' + i.n] || { ok: i.ok === false ? false : i.ok, ans: i.ok === false ? '' : i.ans };
      const redo = a.ok === false;
      const mark = i.ok == null ? '⏳' : !redo ? '✅' : i.ok ? '❌→✅' : '❌❌';
      const bg = i.ok == null ? '#fff8e6' : !redo ? '#eefaf3' : i.ok ? '#eef4ff' : '#fdecec';
      html += '<tr style="background:' + bg + '">' +
        '<td ' + td + '>' + esc_(i.n) + '</td>' +
        '<td ' + td + '>' + esc_(i.q) + '</td>' +
        '<td ' + td + '>' + (redo ? '<s style="color:#b33">' + ansHtml(a.ans) + '</s>' : ansHtml(a.ans)) + '</td>' +
        '<td ' + td + '>' + (redo ? '<b>' + ansHtml(i.ans) + '</b>' : '<span style="color:#999">—</span>') + '</td>' +
        '<td ' + td + '>' + esc_(i.correct) + '</td>' +
        '<td ' + td + '>' + mark + '</td></tr>';
    });
    html += '</table>';
  });
  html += '<p style="margin-top:10px;color:#666;font-size:13px">✅ đúng ngay lần 1 · ❌→✅ sai lần 1, sửa đúng ở lần 2 · ❌❌ sai cả 2 lần · ⏳ cô chấm</p>' +
    '<p style="margin-top:16px"><a href="' + sheetUrl + '">📊 Mở bảng tổng hợp bài nộp (Google Sheet)</a></p></div>';
  MailApp.sendEmail({ to: TEACHER_EMAIL, subject: subject, htmlBody: html, name: 'Bài tập về nhà' });
}

/**
 * A1 KID (Listening Trainer A1): học sinh chơi các trò ôn bài để "cho thú cưng ăn".
 * Khi trứng nở, trang gửi { app:'a1pet', name, cls, pet, petName, food, fedDays, plays, startedAt, hatchedAt }
 * → ghi 1 dòng vào trang tính "Thú cưng A1" + gửi mail báo giáo viên.
 */
function petHatched_(d) {
  const str = (v, n) => String(v == null ? '' : v).slice(0, n);
  const name = str(d.name, 80), cls = str(d.cls, 30), pet = str(d.pet, 20), petName = str(d.petName, 30), unit = str(d.unit, 40);
  const food = Math.max(0, Number(d.food) || 0), days = Math.max(0, Number(d.fedDays) || 0);
  const GN = { listen: 'Listen & Tap', spell: 'Spelling Bee', gram: 'Sentence Lab', review: 'Quick review' };
  const plays = d.plays && typeof d.plays === 'object' ? Object.keys(d.plays).slice(0, 10)
    .map(k => (GN[k] || str(k, 20)) + ': ' + Math.max(0, Number(d.plays[k]) || 0) + ' lượt') : [];
  const vi = { Dragon: 'rồng', Unicorn: 'kỳ lân', Dino: 'khủng long' }[pet] || pet;
  const { ss } = getSheet_();
  let sh = ss.getSheetByName('Thú cưng A1');
  if (!sh) {
    sh = ss.insertSheet('Thú cưng A1');
    sh.appendRow(['Trứng nở lúc', 'Họ tên', 'Lớp', 'Thú cưng', 'Tên em đặt', 'Số ngày cho ăn', 'Tổng thức ăn', 'Các trò đã chơi', 'Bắt đầu nuôi']);
    sh.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#fff1c4');
    sh.setFrozenRows(1);
  }
  sh.appendRow([d.hatchedAt ? new Date(d.hatchedAt) : new Date(), name, cls, vi, petName, days, food, plays.join(', '),
    d.startedAt ? new Date(d.startedAt) : '—']);
  const row = (k, v) => '<tr><td style="padding:3px 14px 3px 0;color:#666">' + k + '</td><td style="padding:3px 0"><b>' + esc_(v) + '</b></td></tr>';
  const html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;max-width:640px">' +
    '<h2 style="margin:0 0 8px;color:#d0631a">🐣 Trứng của ' + esc_(name) + ' đã nở!</h2>' +
    '<p style="margin:0 0 10px">Em đã chăm chỉ chơi các trò ôn bài (ngoài bài cô giao) để ấp trứng. Cô khen em trên lớp nha! 🎉</p>' +
    '<table style="border-collapse:collapse;font-size:14px">' +
    row('Học sinh', name) + row('Lớp', cls) + row('Thú cưng', vi + (petName ? ' – tên "' + petName + '"' : '')) +
    row('Số ngày cho ăn', days + ' ngày') + row('Tổng thức ăn', food + ' 🍎') +
    row('Các trò đã chơi', plays.join(', ') || '—') +
    row('Bắt đầu nuôi', fmtTime_(d.startedAt)) + row('Trứng nở lúc', fmtTime_(d.hatchedAt)) + '</table>' +
    '<p style="margin:12px 0 0"><a href="' + ss.getUrl() + '">Xem bảng tổng hợp (trang tính "Thú cưng A1")</a></p></div>';
  MailApp.sendEmail({ to: TEACHER_EMAIL, subject: '[' + (unit || 'A1 KID') + '] 🐣 ' + name + ' – ' + cls + ' – trứng ' + vi + ' đã nở!',
    htmlBody: html, name: 'Bài tập về nhà' });
}

/* ================= VÍ 🪙 + SHOP + RƯƠNG EXQUISITE (nhân vật đại diện) =================
 * Xu do MÁY CHỦ tính từ bài nộp (không sửa được trên máy em) + sổ "Vi" (mua đồ, mở rương, mini game).
 * Mỗi bài (lần nộp đầu, bỏ "LÀM LẠI"): 30 nộp bài + đến 50 theo % đúng lần 1 + 20 sửa đúng hết lần 2 + 10 không rời trang + 20 đúng hết.
 * Chuỗi tuần (tuần liên tiếp có nộp bài): ×1 / ×1.2 / ×1.3 / ×1.4 / ×1.5. Mini game: +5/lượt, tối đa 3 lượt/ngày.
 * Rương: 600 xu, hoặc được tặng (cứ 5 bài → 1 rương, cứ 3 bài đúng hết lần 1 → 1 rương). Rương luôn ra món em CHƯA có.
 * AV_CATALOG = danh mục đồ từng bộ nhân vật (giữ khớp với yumi-portal/avatar/<bộ>/catalog.js): id → [ô, giá, nguồn free|shop|chest]
 */
const WALLET_SHEET = 'Vi';
const WALLET_HEAD = ['Thời gian', 'Tài khoản', 'Loại', 'Xu (+/−)', 'Món', 'Ghi chú'];
const CHEST_PRICE = 600, GAME_COINS = 5, GAME_PER_DAY = 3, SHOP_SLOTS = 8;
const AV_CATALOG = { teen: {
  'bm': ['body', 0, 'free', 'm', '', 0, '', ''],
  'bf': ['body', 0, 'free', 'f', '', 0, '', ''],
  'body': ['body', 0, 'free', '', '', 1, '', ''],
  'mh1': ['hair', 0, 'free', 'm', '', 0, '', ''],
  'mh2': ['hair', 0, 'free', 'm', '', 0, '', ''],
  'mh3': ['hair', 180, 'shop', 'm', '', 0, '', ''],
  'mh4': ['hair', 200, 'shop', 'm', '2026-11-23', 0, '', ''],
  'mt1': ['top', 0, 'free', 'm', '', 0, '', ''],
  'mt2': ['top', 260, 'shop', 'm', '', 0, '', ''],
  'mt3': ['top', 220, 'shop', 'm', '2026-11-23', 0, '', ''],
  'mb1': ['bottom', 0, 'free', 'm', '', 0, '', ''],
  'mb2': ['bottom', 200, 'shop', 'm', '', 0, '', ''],
  'ms1': ['shoes', 0, 'free', 'm', '', 0, '', ''],
  'ms2': ['shoes', 240, 'shop', 'm', '', 0, '', ''],
  'mset1': ['set', 450, 'shop', 'm', '', 0, '', ''],
  'mhat1': ['hat', 160, 'shop', 'm', '2026-11-30', 0, '', ''],
  'mset2': ['set', 0, 'chest', 'm', '', 0, '', ''],
  'fh1': ['hair', 0, 'free', 'f', '', 0, '', ''],
  'fh2': ['hair', 0, 'free', 'f', '', 0, '', ''],
  'fh3': ['hair', 200, 'shop', 'f', '', 0, '', ''],
  'ft1': ['top', 0, 'free', 'f', '', 0, '', ''],
  'ft2': ['top', 260, 'shop', 'f', '', 0, '', ''],
  'fb1': ['bottom', 0, 'free', 'f', '', 0, '', ''],
  'fd1': ['dress', 320, 'shop', 'f', '', 0, '', ''],
  'fset1': ['set', 450, 'shop', 'f', '', 0, '', ''],
  'fs1': ['shoes', 0, 'free', 'f', '', 0, '', ''],
  'fs2': ['shoes', 240, 'shop', 'f', '2026-11-30', 0, '', ''],
  'fhat1': ['hat', 160, 'shop', 'f', '2026-11-23', 0, '', ''],
  'fbag1': ['bag', 180, 'shop', 'f', '2026-11-23', 0, '', ''],
  'fhat2': ['hat', 0, 'chest', 'f', '', 0, '', ''],
  'fset2': ['set', 0, 'chest', 'f', '', 0, '', ''],
  'xmh': ['hat', 150, 'shop', 'm', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xmt': ['top', 220, 'shop', 'm', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xmb': ['bottom', 200, 'shop', 'm', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xms': ['shoes', 200, 'shop', 'm', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xmset': ['set', 0, 'chest', 'm', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xfh': ['hat', 150, 'shop', 'f', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xft': ['top', 220, 'shop', 'f', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xfb': ['bottom', 200, 'shop', 'f', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xfs': ['shoes', 200, 'shop', 'f', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xfset': ['set', 0, 'chest', 'f', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xp1': ['pet', 300, 'shop', '', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xp2': ['pet', 0, 'chest', '', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xw': ['wings', 0, 'chest', '', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xh1': ['hand', 100, 'shop', '', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xh2': ['hand', 120, 'shop', '', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'xpa': ['petacc', 120, 'shop', '', '2026-12-01', 0, '2026-12-31', 'xmas'],
  'f1': ['face', 0, 'free', '', '', 0, '', ''],
  'f2': ['face', 0, 'free', '', '', 0, '', ''],
  'f3': ['face', 150, 'shop', '', '', 0, '', ''],
  'h1': ['hair', 0, 'free', '', '', 1, '', ''],
  'h2': ['hair', 0, 'free', '', '', 1, '', ''],
  'h3': ['hair', 0, 'free', '', '', 1, '', ''],
  'h4': ['hair', 180, 'shop', '', '', 1, '', ''],
  'h5': ['hair', 200, 'shop', '', '', 1, '', ''],
  't1': ['top', 0, 'free', '', '', 1, '', ''],
  't2': ['top', 260, 'shop', '', '', 1, '', ''],
  't3': ['top', 220, 'shop', '', '', 1, '', ''],
  'b1': ['bottom', 0, 'free', '', '', 1, '', ''],
  'b2': ['bottom', 200, 'shop', '', '', 1, '', ''],
  'd1': ['dress', 320, 'shop', '', '', 1, '', ''],
  'st1': ['set', 450, 'shop', '', '', 1, '', ''],
  's1': ['shoes', 0, 'free', '', '', 1, '', ''],
  's2': ['shoes', 240, 'shop', '', '', 1, '', ''],
  'c1': ['hat', 160, 'shop', '', '', 1, '', ''],
  'g1': ['glasses', 140, 'shop', '', '', 0, '', ''],
  'bg1': ['bag', 180, 'shop', '', '', 1, '', ''],
  'hd1': ['hand', 120, 'shop', '', '', 0, '', ''],
  'p1': ['pet', 380, 'shop', '', '', 0, '', ''],
  'pa1': ['petacc', 150, 'shop', '', '', 0, '', ''],
  'w1': ['wings', 0, 'chest', '', '', 0, '', ''],
  'st2': ['set', 0, 'chest', '', '', 1, '', ''],
  'c2': ['hat', 0, 'chest', '', '', 1, '', ''],
  'p2': ['pet', 0, 'chest', '', '', 0, '', ''],
  'hd2': ['hand', 0, 'chest', '', '', 0, '', ''],
  'pa2': ['petacc', 0, 'chest', '', '', 0, '', '']
},
ket: {
  'kbm': ['body', 0, 'free', 'm', '', 0, '', ''],
  'kbf': ['body', 0, 'free', 'f', '', 0, '', ''],
  'kmh1': ['hair', 0, 'free', 'm', '', 0, '', ''],
  'kmh2': ['hair', 0, 'free', 'm', '', 0, '', ''],
  'kmh3': ['hair', 160, 'shop', 'm', '', 0, '', ''],
  'kmh4': ['hair', 180, 'shop', 'm', '2026-11-30', 0, '', ''],
  'kmt1': ['top', 0, 'free', 'm', '', 0, '', ''],
  'kmt2': ['top', 220, 'shop', 'm', '', 0, '', ''],
  'kmb1': ['bottom', 0, 'free', 'm', '', 0, '', ''],
  'kmb2': ['bottom', 180, 'shop', 'm', '', 0, '', ''],
  'kms1': ['shoes', 0, 'free', 'm', '', 0, '', ''],
  'kms2': ['shoes', 200, 'shop', 'm', '', 0, '', ''],
  'kmset1': ['set', 420, 'shop', 'm', '', 0, '', ''],
  'kmhat1': ['hat', 140, 'shop', 'm', '2026-12-07', 0, '', ''],
  'kmset2': ['set', 0, 'chest', 'm', '', 0, '', ''],
  'kfh1': ['hair', 0, 'free', 'f', '', 0, '', ''],
  'kfh2': ['hair', 0, 'free', 'f', '', 0, '', ''],
  'kfh3': ['hair', 180, 'shop', 'f', '', 0, '', ''],
  'kfh4': ['hair', 180, 'shop', 'f', '2026-11-30', 0, '', ''],
  'kft1': ['top', 0, 'free', 'f', '', 0, '', ''],
  'kft2': ['top', 220, 'shop', 'f', '', 0, '', ''],
  'kfb1': ['bottom', 0, 'free', 'f', '', 0, '', ''],
  'kfb2': ['bottom', 180, 'shop', 'f', '', 0, '', ''],
  'kfd1': ['dress', 300, 'shop', 'f', '', 0, '', ''],
  'kfs1': ['shoes', 0, 'free', 'f', '', 0, '', ''],
  'kfs2': ['shoes', 200, 'shop', 'f', '', 0, '', ''],
  'kfset1': ['set', 420, 'shop', 'f', '', 0, '', ''],
  'kfhat1': ['hat', 140, 'shop', 'f', '2026-12-07', 0, '', ''],
  'kfbag1': ['bag', 160, 'shop', 'f', '', 0, '', ''],
  'kfset2': ['set', 0, 'chest', 'f', '', 0, '', ''],
  'kp1': ['pet', 300, 'shop', '', '', 0, '', ''],
  'kp2': ['pet', 0, 'chest', '', '', 0, '', ''],
  'kpa1': ['petacc', 120, 'shop', '', '', 0, '', ''],
  'kw1': ['wings', 350, 'shop', '', '', 0, '', ''],
  'kw2': ['wings', 0, 'chest', '', '', 0, '', ''],
  'kh1': ['hand', 100, 'shop', '', '', 0, '', ''],
  'kh2': ['hand', 120, 'shop', '', '', 0, '', ''],
  'kg1': ['glasses', 120, 'shop', '', '', 0, '', ''],
  'kf1': ['face', 0, 'free', '', '', 0, '', ''],
  'kf2': ['face', 120, 'shop', '', '', 0, '', ''],
  'kf3': ['face', 120, 'shop', '', '', 0, '', '']
} };
const AV_SLOTS = ['body', 'hair', 'face', 'top', 'bottom', 'dress', 'set', 'shoes', 'wings', 'hat', 'glasses', 'bag', 'hand', 'pet', 'petacc'];

function lessonCoins_(score, total, second, leaves) {
  score = Number(score) || 0; total = Number(total) || 0;
  if (total <= 0) return 30;
  let c = 30 + Math.round(score / total * 50);
  const m = /(\d+)\s*\/\s*(\d+)/.exec(String(second || ''));
  if (m && total > score && Number(m[1]) >= total) c += 20;
  if (leaves === 0 || leaves === '0') c += 10;
  if (score >= total) c += 20;
  return c;
}
const streakMult_ = k => k <= 1 ? 1 : k === 2 ? 1.2 : k === 3 ? 1.3 : k === 4 ? 1.4 : 1.5;
function mondayKey_(dt) { // thứ Hai của tuần (giờ VN) → 'yyyy-MM-dd'
  const dow = Number(Utilities.formatDate(dt, TIMEZONE, 'u'));
  return Utilities.formatDate(new Date(dt.getTime() - (dow - 1) * 86400000), TIMEZONE, 'yyyy-MM-dd');
}
const prevWeek_ = k => Utilities.formatDate(new Date(new Date(k + 'T12:00:00+07:00').getTime() - 7 * 86400000), TIMEZONE, 'yyyy-MM-dd');

/** Thống kê từng tài khoản từ tab "Bài nộp": xu bài tập (đã nhân chuỗi), số bài, số bài đúng hết, chuỗi tuần hiện tại. Cache 10 phút. */
function statsAll_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('stats'); if (hit) return JSON.parse(hit);
  const { sh } = getSheet_();
  const col = n => HEAD.indexOf(n);
  const C = { when: col('Thời gian nộp'), title: col('Bài'), score: col('Điểm'), total: col('Tổng'), leaves: col('Số lần rời trang'), second: col('Điểm lần 2'), acc: col('Tài khoản') };
  const n = sh.getLastRow() - 1;
  const rows = n > 0 ? sh.getRange(2, 1, n, HEAD.length).getValues() : [];
  const per = {}, seen = {};
  rows.forEach(r => {
    const user = normUser_(r[C.acc]); if (!user) return;
    const title = String(r[C.title] || ''); if (/LÀM LẠI/i.test(title)) return;
    if (seen[user + '|' + title]) return; seen[user + '|' + title] = 1;
    const when = r[C.when] instanceof Date ? r[C.when] : new Date(r[C.when]); if (isNaN(when)) return;
    const u = per[user] || (per[user] = { lessons: [], weeks: {} });
    const wk = mondayKey_(when);
    u.weeks[wk] = 1;
    u.lessons.push({ wk: wk, c: lessonCoins_(r[C.score], r[C.total], r[C.second], r[C.leaves]), perfect: Number(r[C.score]) >= Number(r[C.total]) && Number(r[C.total]) > 0 });
  });
  const thisWk = mondayKey_(new Date());
  const out = {};
  Object.keys(per).forEach(user => {
    const u = per[user]; let coins = 0, perfect = 0;
    const run = wk => { let k = 0; while (u.weeks[wk]) { k++; wk = prevWeek_(wk); } return k; };
    u.lessons.forEach(l => { coins += Math.round(l.c * streakMult_(run(l.wk))); if (l.perfect) perfect++; });
    const streak = run(thisWk) || run(prevWeek_(thisWk)); // tuần này chưa nộp vẫn giữ chuỗi tới hết tuần
    out[user] = { coins: coins, lessons: u.lessons.length, perfect: perfect, streak: streak };
  });
  try { cache.put('stats', JSON.stringify(out), BOARD_CACHE_SEC); } catch (_) {}
  return out;
}

function walletSheet_() {
  const { ss } = getSheet_();
  let sh = ss.getSheetByName(WALLET_SHEET);
  if (!sh) {
    sh = ss.insertSheet(WALLET_SHEET);
    sh.getRange(1, 1, 1, WALLET_HEAD.length).setValues([WALLET_HEAD]).setFontWeight('bold').setBackground('#fff1c4');
    sh.setFrozenRows(1);
  }
  return sh;
}
function ledger_(user) {
  const sh = walletSheet_(); const n = sh.getLastRow() - 1; if (n < 1) return [];
  return sh.getRange(2, 1, n, WALLET_HEAD.length).getValues().filter(r => normUser_(r[1]) === user)
    .map(r => ({ at: r[0] instanceof Date ? r[0] : new Date(r[0]), type: String(r[2]), coins: Number(r[3]) || 0, item: String(r[4] || '') }));
}
function addLedger_(user, type, coins, item, note) {
  walletSheet_().appendRow([new Date(), user, type, coins, item || '', note || '']);
}
/* AV_CATALOG: id → [ô, giá, nguồn free|shop|chest, giới 'm'|'f'|'' (dùng chung), ngày mở bán 'yyyy-MM-dd' (trống = có ngay), ẩn 1/0] */
const itG_ = it => it[3] || '';
// [6] = ngày kết thúc bán (sự kiện), [7] = mã sự kiện
const itOn_ = it => { const t = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  return !it[5] && (!it[4] || it[4] <= t) && (!it[6] || it[6] >= t); }; // đã mở bán, chưa hết hạn, không ẩn
// Sự kiện: đồ giới hạn thời gian (mã ở cột [7] của AV_CATALOG). Hết hạn → ngừng bán + ra khỏi rương, đồ đã có vẫn giữ.
const AV_EVENTS = [{ id: 'xmas', name: 'Christmas Event', start: '2026-12-01', end: '2026-12-31' }];
const TUT_COINS = 50; // hoàn thành hướng dẫn tân thủ (1 lần)
function eventNow_() { const t = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd'); return AV_EVENTS.filter(e => e.start <= t && e.end >= t)[0] || null; }
const fitG_ = (it, g) => !itG_(it) || !g || itG_(it) === g; // hợp giới tính nhân vật
/** Shop cố định: mọi món "shop" đã tới ngày mở bán (hàng mới về mỗi thứ Hai), lọc theo giới tính. fresh = mở bán tuần này. */
function shopOf_(style, g) {
  const cat = AV_CATALOG[style] || {};
  const wk = mondayKey_(new Date());
  const items = Object.keys(cat).filter(id => cat[id][2] === 'shop' && itOn_(cat[id]) && fitG_(cat[id], g));
  return { week: wk, items: items, fresh: items.filter(id => cat[id][4] && cat[id][4] >= wk) };
}
/** Giới tính theo nhân vật đã lưu ("teen:{body:'bm'}") hoặc client gửi lên. */
function genderOf_(acc, style, g) {
  if (g === 'm' || g === 'f') return g;
  const m = /"body":"(\w+)"/.exec(String(acc.avatar || '')); const it = m && (AV_CATALOG[style] || {})[m[1]];
  return it ? itG_(it) : '';
}
function walletState_(acc) {
  const st = statsAll_()[acc.user] || { coins: 0, lessons: 0, perfect: 0, streak: 0 };
  const led = ledger_(acc.user);
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const extra = led.reduce((s, r) => s + r.coins, 0);
  const owned = led.filter(r => r.item).map(r => r.item);
  const chestsEarned = Math.floor(st.lessons / 5) + Math.floor(st.perfect / 3);
  const chestsUsed = led.filter(r => r.type === 'rương-tặng').length;
  return {
    coins: st.coins + extra, hwCoins: st.coins, streak: st.streak, mult: streakMult_(st.streak),
    lessons: st.lessons, perfect: st.perfect, owned: owned, freeChests: Math.max(0, chestsEarned - chestsUsed),
    gamesToday: led.filter(r => r.type === 'mini game' && Utilities.formatDate(r.at, TIMEZONE, 'yyyy-MM-dd') === today).length,
    tut: led.some(r => r.type === 'tân thủ')
  };
}
function wallet_(acc, style, g) {
  style = AV_CATALOG[style] ? style : 'teen';
  const sh = shopOf_(style, genderOf_(acc, style, g));
  return Object.assign({ ok: true, style: style, outfit: acc.avatar, shop: sh.items, fresh: sh.fresh, shopWeek: sh.week, chestPrice: CHEST_PRICE,
    gamesMax: GAME_PER_DAY, gameCoins: GAME_COINS, event: eventNow_(), tutCoins: TUT_COINS }, walletState_(acc));
}
function needAcc_(d) { const acc = verifyToken_(d.token); if (!acc) throw new Error('AUTH'); return acc; }
const shopWrap_ = fn => d => {
  try { return fn(d); }
  catch (e) { return String(e.message) === 'AUTH' ? { ok: false, auth: true, error: 'Please log in again' } : { ok: false, error: String(e && e.message || e) }; }
};
const SHOP_ACTIONS = {
  buy: shopWrap_(d => {
    const acc = needAcc_(d), style = String(d.style || 'teen'), cat = AV_CATALOG[style] || {}, id = String(d.item || '');
    const it = cat[id]; if (!it || it[2] !== 'shop') return { ok: false, error: 'This item isn’t sold in the shop' };
    if (!itOn_(it)) return { ok: false, error: it[6] && it[6] < Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd') ? 'This event is over, the item is no longer for sale' : 'This item isn’t in the shop yet. New items arrive every Monday!' };
    const w = walletState_(acc);
    if (w.owned.indexOf(id) >= 0) return { ok: false, error: 'You already have this item' };
    if (w.coins < it[1]) return { ok: false, error: 'Not enough coins yet. Do more homework to earn some! 💪' };
    addLedger_(acc.user, 'mua', -it[1], id, style);
    return Object.assign({ bought: id }, wallet_(acc, style, d.g));
  }),
  chest: shopWrap_(d => {
    const acc = needAcc_(d), style = String(d.style || 'teen'), cat = AV_CATALOG[style] || {};
    const w = walletState_(acc);
    const g = genderOf_(acc, style, d.g);
    const pool = Object.keys(cat).filter(id => cat[id][2] === 'chest' && itOn_(cat[id]) && fitG_(cat[id], g) && w.owned.indexOf(id) < 0);
    if (!pool.length) return { ok: false, error: 'You already have every Exquisite item! 👑' };
    const free = w.freeChests > 0 && d.pay !== 'coins';
    if (!free && w.coins < CHEST_PRICE) return { ok: false, error: 'You need ' + CHEST_PRICE + ' coins to open a chest' };
    const id = pool[Math.floor(Math.random() * pool.length)];
    addLedger_(acc.user, free ? 'rương-tặng' : 'rương', free ? 0 : -CHEST_PRICE, id, style);
    return Object.assign({ got: id }, wallet_(acc, style, d.g));
  }),
  outfit: shopWrap_(d => {
    const acc = needAcc_(d), style = String(d.style || 'teen'), cat = AV_CATALOG[style] || {};
    const o = d.outfit && typeof d.outfit === 'object' ? d.outfit : {};
    const owned = walletState_(acc).owned, clean = {};
    const body = cat[String(o.body || '')], g = body ? itG_(body) : ''; // giới tính theo thân nhân vật
    Object.keys(o).forEach(slot => {
      const id = String(o[slot] || ''); if (!id || AV_SLOTS.indexOf(slot) < 0) return;
      const it = cat[id]; if (!it || it[0] !== slot || !fitG_(it, g)) return; // không mặc đồ khác giới
      if (it[2] === 'free' || owned.indexOf(id) >= 0) clean[slot] = id;
    });
    const s = style + ':' + JSON.stringify(clean);
    if (s.length > 480) return { ok: false, error: 'Too many items' };
    const map = Object.assign({}, acc.outfits || {}); map[style] = s;
    accSheet_().getRange(acc.row, 6).setValue(s);
    accSheet_().getRange(acc.row, 10).setValue(JSON.stringify(map)); // giữ nhân vật của các bộ khác
    CacheService.getScriptCache().remove('board');
    return { ok: true, outfit: s, outfits: map };
  }),
  progress: shopWrap_(d => { // {groups: {ket: {set: {khoá: chuỗi}, del: [khoá]}}} → gộp vào dòng của em
    const acc = needAcc_(d), gs = d.groups && typeof d.groups === 'object' ? d.groups : {};
    {
      const sh = progSheet_(), rows = progRows_(acc.user), at = {};
      Object.keys(gs).forEach(g => {
        const re = PROG_KEYS[g]; if (!re) return;
        const ch = gs[g] || {}, cur = rows[g] ? rows[g].data : {};
        const set = ch.set && typeof ch.set === 'object' ? ch.set : {};
        Object.keys(set).forEach(k => { const v = set[k]; if (re.test(k) && k.length <= 100 && typeof v === 'string' && v.length <= 60000) cur[k] = v; });
        (Array.isArray(ch.del) ? ch.del : []).forEach(k => { delete cur[String(k)]; });
        at[g] = progWrite_(sh, acc.user, g, rows[g] && rows[g].row, cur);
      });
      return { ok: true, at: at };
    }
  }),
  react: shopWrap_(d => { // thả / gỡ ❤️ 😆 😤 ở nhà bạn (không thả cho nhà mình)
    const acc = needAcc_(d), accs = accounts_(), to = ownerByPid_(d.pid, accs), type = String(d.type || '');
    if (!to) return { ok: false, error: 'Player not found' };
    if (REACTS.indexOf(type) < 0) return { ok: false, error: 'Unknown reaction' };
    if (to === acc.user) return { ok: false, error: 'You can’t react to your own home 😉' };
    const sh = socialSheet_(), mineRow = socialRows_().filter(r => r.from === acc.user && r.to === to && r.type === type && !r.hidden)[0];
    if (mineRow) sh.getRange(mineRow.row, 6).setValue('gỡ'); else sh.appendRow([new Date(), acc.user, to, type, '', '']);
    return { ok: true, social: socialOf_(to, acc.user, accs) };
  }),
  comment: shopWrap_(d => { // sổ lưu bút: ≤120 ký tự, ≤10 bình luận/ngày, chặn từ tục
    const acc = needAcc_(d), accs = accounts_(), to = ownerByPid_(d.pid, accs);
    const text = String(d.text || '').replace(/\s+/g, ' ').trim().slice(0, COMMENT_MAX);
    if (!to) return { ok: false, error: 'Player not found' };
    if (!text) return { ok: false, error: 'Write something first ✏️' };
    if (isRude_(text)) return { ok: false, error: 'Please be kind 💛 That message has a rude word.' };
    const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
    const n = socialRows_().filter(r => r.from === acc.user && r.type === 'comment' && !isNaN(r.at) && Utilities.formatDate(r.at, TIMEZONE, 'yyyy-MM-dd') === today).length;
    if (n >= COMMENTS_PER_DAY) return { ok: false, error: 'You’ve written ' + COMMENTS_PER_DAY + ' messages today. Come back tomorrow! 🌙' };
    socialSheet_().appendRow([new Date(), acc.user, to, 'comment', text, '']);
    return { ok: true, social: socialOf_(to, acc.user, accs) };
  }),
  delcomment: shopWrap_(d => { // chủ nhà hoặc người viết xoá bình luận
    const acc = needAcc_(d), accs = accounts_(), r = socialRows_().filter(x => x.row === Number(d.cid) && x.type === 'comment')[0];
    if (!r || r.hidden) return { ok: false, error: 'Message not found' };
    if (r.from !== acc.user && r.to !== acc.user) return { ok: false, error: 'You can’t delete this message' };
    socialSheet_().getRange(r.row, 6).setValue('xoá');
    return { ok: true, social: socialOf_(r.to, acc.user, accs) };
  }),
  rename: shopWrap_(d => { // đổi nickname: 300 xu, không trùng ai; đăng nhập được bằng tên cũ hoặc mới
    const acc = needAcc_(d), accs = accounts_();
    const nick = String(d.nick || '').replace(/\s+/g, ' ').trim(), key = normUser_(nick);
    if (nick.length < 3 || nick.length > 20 || !/^[\p{L}\p{N} ._-]+$/u.test(nick) || key.length < 3) return { ok: false, error: 'Nickname: 3–20 characters, letters, numbers and spaces only' };
    if (isRude_(nick)) return { ok: false, error: 'Please choose a kind nickname 💛' };
    if (nick === acc.name) return { ok: false, error: 'That’s already your nickname' };
    if (Object.keys(accs).some(u => u !== acc.user && (u === key || normUser_(accs[u].name) === key))) return { ok: false, error: 'That nickname is taken, please choose another one' };
    const w = walletState_(acc);
    if (w.coins < RENAME_PRICE) return { ok: false, error: 'You need ' + RENAME_PRICE + ' coins to change your nickname' };
    addLedger_(acc.user, 'đổi tên', -RENAME_PRICE, '', acc.name + ' → ' + nick);
    accSheet_().getRange(acc.row, 4).setValue(nick);
    CacheService.getScriptCache().remove('board');
    return { ok: true, name: nick, coins: w.coins - RENAME_PRICE, me: profile_(Object.assign({}, acc, { name: nick })) };
  }),
  tut: shopWrap_(d => { // xong hướng dẫn tân thủ → +50 xu, chỉ 1 lần (máy chủ nhớ, đổi máy không phải xem lại)
    const acc = needAcc_(d), w = walletState_(acc);
    if (w.tut) return { ok: true, added: 0, coins: w.coins };
    addLedger_(acc.user, 'tân thủ', TUT_COINS, '', 'hướng dẫn tủ đồ');
    return { ok: true, added: TUT_COINS, coins: w.coins + TUT_COINS };
  }),
  game: shopWrap_(d => {
    const acc = needAcc_(d);
    const w = walletState_(acc);
    if (w.gamesToday >= GAME_PER_DAY) return { ok: true, coins: w.coins, added: 0, capped: true };
    addLedger_(acc.user, 'mini game', GAME_COINS, '', String(d.game || '').slice(0, 30));
    return { ok: true, coins: w.coins + GAME_COINS, added: GAME_COINS, gamesToday: w.gamesToday + 1 };
  })
};
