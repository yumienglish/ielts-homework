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
              'Mã lần nộp', 'Điểm lần 2', 'Câu sai lần 2', 'Nộp lần 2 lúc', 'Thời gian làm lần 2', 'Rời trang lần 2'];
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

function doGet() {
  return ContentService.createTextOutput('BTVN: máy chủ nhận bài đang hoạt động ✅');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const d = JSON.parse(e.postData.contents);
    validate_(d);
    const sheetUrl = logToSheet_(d);
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
    d.startedAt ? new Date(d.startedAt) : '—', fmtDur_(d.timeTakenSec), d.leaves, secs[5], rec, d.sid || '', second]));
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
