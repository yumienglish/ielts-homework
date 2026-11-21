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
// Họ tên + Lớp = tên thật để cô đối chiếu. "Mã HS" = Tên gọi trong web quản lý lớp; có Mã HS mới lên bảng xếp hạng.
const ACC_HEAD = ['Tên đăng nhập', 'PIN', 'Họ tên', 'Tên hiển thị', 'Lớp', 'Avatar', 'Hoạt động', 'Mã HS', 'Ngày tạo'];
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
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    if (d && d.action === 'avatar') return json_(setAvatar_(d.token, d.avatar));
    validate_(d);
    if (d.token) { // đã đăng nhập → tên/lớp lấy từ tài khoản, không lấy chữ em gõ
      const acc = verifyToken_(d.token);
      if (!acc) return json_({ ok: false, auth: true, error: 'Phiên đăng nhập đã hết, em đăng nhập lại nhé' });
      d.name = acc.fullName || acc.name;
      d.cls = acc.cls || d.cls;
      d.account = acc.user;
    }
    const sheetUrl = logToSheet_(d);
    if (d.account) CacheService.getScriptCache().remove('board');
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
      hs: String(r[7] || '').trim().replace(/^-$/, '') // "-" = cô đã bỏ ghép → chưa lên bảng
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
const weakPin_ = p => { const d = p.split('').map(Number), s = d[1] - d[0];
  return new Set(d).size === 1 || (Math.abs(s) === 1 && d[2] - d[1] === s && d[3] - d[2] === s); };

/** Em tự tạo tài khoản: nickname + PIN + họ tên thật + lớp. Khớp đúng 1 học sinh (chưa ai dùng) → lên bảng ngay, không thì chờ cô ghép. */
function register_(d) {
  const nick = String(d.nick || '').replace(/\s+/g, ' ').trim();
  const user = normUser_(nick), pin = normPin_(d.pin);
  const full = String(d.full || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const cls = clsCode_(d.cls) || String(d.cls || '').trim().toUpperCase().slice(0, 30); // "ket 01" → KET01
  if (nick.length < 3 || nick.length > 20 || !/^[\p{L}\p{N} ._-]+$/u.test(nick) || user.length < 3)
    return { ok: false, field: 'nick', error: 'Nickname dài 3–20 chữ, chỉ gồm chữ, số, dấu cách nhé' };
  if (full.split(' ').length < 2 || !/^[\p{L} .'-]+$/u.test(full)) return { ok: false, field: 'full', error: 'Em nhập đủ họ và tên thật nhé (VD: Nguyễn Minh Anh)' };
  if (!cls) return { ok: false, field: 'cls', error: 'Em nhập lớp nhé (VD: KET01)' };
  if (pin.length !== 4 || String(d.pin).replace(/\D/g, '').length !== 4) return { ok: false, field: 'pin', error: 'PIN có đúng 4 số nhé' };
  if (weakPin_(pin)) return { ok: false, field: 'pin', error: 'PIN này dễ đoán quá, em chọn 4 số khác nhé' };
  const cache = CacheService.getScriptCache();
  const hk = 'reg:' + Utilities.formatDate(new Date(), TIMEZONE, 'yyyyMMddHH');
  const cnt = Number(cache.get(hk) || 0);
  if (cnt >= MAX_REG_PER_HOUR) return { ok: false, error: 'Nhiều bạn đang tạo tài khoản quá, em thử lại sau ít phút nhé' };
  const accs = accounts_();
  if (accs[user]) return { ok: false, field: 'nick', error: 'Nickname này có bạn dùng rồi, em chọn tên khác nhé' };
  let hs = rosterMatch_(full, cls);
  if (hs && Object.keys(accs).some(u => accs[u].active && accs[u].hs === hs)) hs = ''; // em đó đã có tài khoản → chờ cô xem
  const sh = accSheet_();
  const r = sh.getLastRow() + 1;
  sh.getRange(r, 2).setNumberFormat('@');
  sh.getRange(r, 1, 1, ACC_HEAD.length).setValues([[user, pin, full, nick, cls, '', true, hs, new Date()]]);
  cache.put(hk, String(cnt + 1), 3600);
  if (hs) cache.remove('board');
  const acc = { user: user, pin: pin, fullName: full, name: nick, cls: cls, avatar: '', active: true, hs: hs, row: r };
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
  return { user: acc.user, name: acc.name, cls: acc.cls, avatar: acc.avatar, approved: !!acc.hs };
}

function login_(user, pin) {
  user = normUser_(user); pin = normPin_(pin);
  if (!user || pin.length !== 4) return { ok: false, error: 'Em nhập nickname và 4 số PIN nhé' };
  const cache = CacheService.getScriptCache();
  const key = 'fail:' + user;
  const fails = Number(cache.get(key) || 0);
  if (fails >= MAX_FAILS) return { ok: false, locked: true, error: 'Sai nhiều lần quá, em đợi 15 phút rồi thử lại nhé' };
  const acc = accounts_()[user];
  if (!acc || !acc.active || acc.pin !== pin) {
    cache.put(key, String(fails + 1), LOCK_SEC);
    return { ok: false, error: acc && acc.active ? 'Sai mã PIN rồi. Quên PIN thì em nhắn cô nhé' : 'Chưa có nickname này. Em kiểm tra lại, hoặc bấm "Tạo tài khoản" nhé' };
  }
  cache.remove(key);
  return { ok: true, token: makeToken_(acc), me: profile_(acc) };
}

/** Avatar để hiện trên bảng: emoji ngắn, hoặc đường dẫn ảnh trong yumienglish.github.io (VD /KET/img/ui/av-3.webp). */
function setAvatar_(tok, av) {
  const acc = verifyToken_(tok);
  if (!acc) return { ok: false, auth: true, error: 'Phiên đăng nhập đã hết' };
  av = String(av || '').trim();
  const ok = /^\/[\w-]+(\/[\w.-]+)+\.(webp|png|jpe?g|svg)$/i.test(av) || (av.length > 0 && av.length <= 12 && !/[<>"'&\s]/.test(av));
  if (!ok) return { ok: false, error: 'Avatar không hợp lệ' };
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
    if (!user || !accs[user] || !accs[user].active || !accs[user].hs) return;
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
  const list = t => Object.keys(accs).filter(u => accs[u].active && accs[u].hs).map(u => ({
    user: u, name: accs[u].name, cls: accs[u].cls, avatar: accs[u].avatar, xp: (t[u] || {}).xp || 0, n: (t[u] || {}).n || 0
  })).sort((a, b) => b.xp - a.xp || b.n - a.n || a.name.localeCompare(b.name, 'vi'))
    .map((o, i, arr) => Object.assign(o, { rank: i && arr[i - 1].xp === o.xp ? arr[i - 1].rank : i + 1 }));
  const data = { updated: now.toISOString(), week: list(tally.week), month: list(tally.month), all: list(tally.all) };
  try { cache.put('board', JSON.stringify(data), BOARD_CACHE_SEC); } catch (_) {}
  return data;
}

/** Bảng xếp hạng cho học sinh đã đăng nhập: không lộ tên đăng nhập của bạn khác. */
function board_(tok) {
  const acc = verifyToken_(tok);
  if (!acc) return { ok: false, auth: true, error: 'Em đăng nhập để xem bảng xếp hạng nhé' };
  const data = boardData_();
  const strip = arr => arr.map(o => ({ rank: o.rank, name: o.name, cls: o.cls, avatar: o.avatar, xp: o.xp, n: o.n, me: o.user === acc.user || undefined }));
  return { ok: true, updated: data.updated, me: profile_(acc), pending: !acc.hs, week: strip(data.week), month: strip(data.month), all: strip(data.all) };
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
