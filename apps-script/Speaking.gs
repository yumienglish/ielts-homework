/**
 * Máy chủ nhận bài Speaking 10 tuần (speaking-10-weeks/).
 * - Nhận bài thu âm từ trang web (POST JSON, nhiều file ghi âm mỗi lần)
 * - Gửi email cho giáo viên, đính kèm từng file ghi âm (tên file = mã câu)
 * - Ghi 1 dòng vào Google Sheet "Speaking 10 tuần – Bài nộp" (tự tạo lần đầu)
 *
 * Đây là một dự án Apps Script RIÊNG, không dán chung với Code.gs.
 * Cài đặt: xem HUONG-DAN-CAI-DAT.md, phần C.
 */
const TEACHER_EMAIL = 'tqmai1996@gmail.com';
const SHEET_TITLE = 'Speaking 10 tuần – Bài nộp';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const HEAD = ['Thời gian gửi', 'Họ tên', 'Lớp', 'Tuần', 'Số bản ghi', 'Mã câu', 'Câu bắt buộc đã thu', 'Nộp muộn', 'Ghi chú', 'Đợt gửi'];
const MAX_TOTAL_B64 = 24 * 1024 * 1024; // tổng dung lượng 1 lần gửi (Gmail giới hạn đính kèm 25MB)

/** Chạy hàm này 1 lần trong trình soạn thảo để cấp quyền + tạo Sheet + gửi email thử. */
function setup() {
  const { ss } = getSheet_();
  MailApp.sendEmail(TEACHER_EMAIL, 'Speaking 10 tuần: cài đặt thành công ✅',
    'Máy chủ nhận bài Speaking đã sẵn sàng.\nBảng tổng hợp bài nộp: ' + ss.getUrl());
  Logger.log('Sheet: ' + ss.getUrl());
}

function doGet() {
  return ContentService.createTextOutput('Speaking 10 weeks: server is running ✅');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    const d = JSON.parse(e.postData.contents);
    validate_(d);
    const sheetUrl = logToSheet_(d);
    sendMail_(d, sheetUrl);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function str_(v, max) { return String(v == null ? '' : v).slice(0, max); }

function validate_(d) {
  if (!d || d.app !== 'speaking10') throw new Error('Invalid data');
  if (!Array.isArray(d.items) || d.items.length > 80) throw new Error('Invalid recording list');
  d.name = str_(d.name, 80).trim();
  d.cls = str_(d.cls, 30).trim();
  if (!d.name) throw new Error('Missing name');
  d.week = Math.max(0, Math.min(99, Number(d.week) || 0));
  d.weekTitle = str_(d.weekTitle, 120);
  d.due = str_(d.due, 20);
  d.late = !!d.late;
  d.batch = Math.max(1, Number(d.batch) || 1);
  d.batches = Math.max(d.batch, Number(d.batches) || 1);
  const p = d.progress || {};
  d.progress = { done: Math.max(0, Number(p.done) || 0), total: Math.max(0, Number(p.total) || 0) };
  d.extras = (Array.isArray(d.extras) ? d.extras.slice(0, 12) : []).map(x => ({ label: str_(x && x.label, 100), text: str_(x && x.text, 4000) }));
  let total = 0;
  d.items = d.items.map(it => {
    if (!it || typeof it.b64 !== 'string' || !it.b64) throw new Error('Missing audio file');
    total += it.b64.length;
    let mime = str_(it.mime || 'audio/webm', 40).split(';')[0];
    if (!/^audio\/[\w.+-]+$/.test(mime)) mime = 'audio/webm';
    return {
      code: str_(it.code, 40).replace(/[^A-Za-z0-9-]/g, '') || 'REC',
      part: str_(it.part, 40),
      q: str_(it.q, 400),
      req: !!it.req,
      dur: Math.max(0, Number(it.dur) || 0),
      at: str_(it.at, 40),
      notes: str_(it.notes, 2000),
      marks: (Array.isArray(it.marks) ? it.marks.slice(0, 40) : []).map(m => ({ t: Math.max(0, Number(m && m.t) || 0), q: str_(m && m.q, 300) })),
      mime: mime,
      ext: str_(it.ext || 'webm', 5).replace(/[^a-z0-9]/gi, '') || 'webm',
      b64: it.b64,
    };
  });
  if (total > MAX_TOTAL_B64) throw new Error('Files too large – please send fewer recordings at a time');
}

function fmtClock_(sec) {
  sec = Math.round(sec || 0);
  return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
}
function fmtTime_(iso) {
  return iso ? Utilities.formatDate(new Date(iso), TIMEZONE, 'HH:mm dd/MM/yyyy') : '—';
}
function esc_(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
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
  const cur = sh.getRange(1, 1, 1, HEAD.length).getValues()[0];
  if (cur.join('|') !== HEAD.join('|')) {
    sh.getRange(1, 1, 1, HEAD.length).setValues([HEAD]).setFontWeight('bold').setBackground('#d9f2ee');
  }
  return { ss, sh };
}

function logToSheet_(d) {
  const { ss, sh } = getSheet_();
  const codes = d.items.map(i => i.code).join(', ');
  const notes = d.extras.map(x => x.label + ': ' + x.text).join('\n');
  sh.appendRow([
    d.sentAt ? new Date(d.sentAt) : new Date(), d.name, d.cls, 'Tuần ' + d.week, d.items.length, codes || '—',
    "'" + d.progress.done + '/' + d.progress.total, d.late ? 'Muộn' : '', notes, "'" + d.batch + '/' + d.batches,
  ]);
  return ss.getUrl();
}

function sendMail_(d, sheetUrl) {
  const safe = s => String(s).replace(/[\\/:*?"<>|]+/g, '').trim();
  const subject = '[Speaking W' + d.week + '] ' + d.name + ' – ' + d.cls + ' – ' +
    (d.items.length ? d.items.length + ' recording' + (d.items.length === 1 ? '' : 's') : 'notes') +
    ' · required ' + d.progress.done + '/' + d.progress.total +
    (d.late ? ' · LATE' : '') + (d.batches > 1 ? ' (' + d.batch + '/' + d.batches + ')' : '');

  const td = 'style="border:1px solid #e3dccf;padding:6px 8px;vertical-align:top"';
  const row = (k, v) => '<tr><td style="padding:3px 14px 3px 0;color:#666">' + k + '</td><td style="padding:3px 0"><b>' + v + '</b></td></tr>';
  let html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;max-width:780px">' +
    '<h2 style="margin:0 0 8px;color:#14866d">🎙 Speaking – Week ' + d.week + ': ' + esc_(d.weekTitle) + '</h2>' +
    '<table style="border-collapse:collapse;margin-bottom:12px;font-size:14px">' +
    row('Student', esc_(d.name) + ' – Class ' + esc_(d.cls)) +
    row('Sent', fmtTime_(d.sentAt)) +
    row('Deadline', esc_(d.due) + (d.late ? ' <span style="color:#d64045">(late)</span>' : '')) +
    row('Required recorded', '<span style="font-size:18px;color:#14866d">' + d.progress.done + '/' + d.progress.total + '</span>') +
    (d.batches > 1 ? row('Email', d.batch + ' of ' + d.batches) : '') +
    '</table>';

  if (d.items.length) {
    html += '<h3 style="margin:16px 0 6px">Recordings in this email (' + d.items.length + ') – attached below</h3>' +
      '<table style="border-collapse:collapse;width:100%;font-size:13.5px">' +
      '<tr style="background:#f4efe6"><th ' + td + '>Code</th><th ' + td + '>Part</th><th ' + td + '>Question</th><th ' + td + '>Length</th></tr>';
    d.items.forEach(i => {
      let q = esc_(i.q);
      if (i.marks.length) q += '<ol style="margin:4px 0 0;padding-left:18px;color:#555">' +
        i.marks.map(m => '<li><b>' + fmtClock_(m.t) + '</b> ' + esc_(m.q) + '</li>').join('') + '</ol>';
      if (i.notes) q += '<div style="margin-top:4px;color:#2f63d8">📝 Keywords: ' + esc_(i.notes) + '</div>';
      html += '<tr style="background:' + (i.req ? '#fff' : '#f8f8f8') + '">' +
        '<td ' + td + '><b>' + esc_(i.code) + '</b></td>' +
        '<td ' + td + '>' + esc_(i.part) + (i.req ? '' : '<br><i style="color:#999">optional</i>') + '</td>' +
        '<td ' + td + '>' + q + '</td>' +
        '<td ' + td + '>' + fmtClock_(i.dur) + '</td></tr>';
    });
    html += '</table>';
  }
  if (d.extras.length) {
    html += '<h3 style="margin:16px 0 6px">📝 Student notes</h3>';
    d.extras.forEach(x => {
      html += '<p style="margin:4px 0"><b>' + esc_(x.label) + ':</b><br>' + esc_(x.text).replace(/\n/g, '<br>') + '</p>';
    });
  }
  html += '<p style="margin-top:16px"><a href="' + sheetUrl + '">📊 Open the submissions sheet (Google Sheet)</a></p></div>';

  const attachments = d.items.map(i => Utilities.newBlob(Utilities.base64Decode(i.b64), i.mime,
    safe(i.code) + ' - ' + safe(d.name) + '.' + i.ext));
  const msg = { to: TEACHER_EMAIL, subject: subject, htmlBody: html, name: 'Speaking 10 weeks' };
  if (attachments.length) msg.attachments = attachments;
  MailApp.sendEmail(msg);
}
