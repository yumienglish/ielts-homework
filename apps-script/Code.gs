/**
 * Máy chủ nhận bài tập về nhà.
 * - Nhận bài nộp từ trang web (POST JSON)
 * - Gửi email kết quả cho giáo viên
 * - Ghi 1 dòng vào Google Sheet "BTVN – Bài nộp của học sinh" (tự tạo lần đầu)
 *
 * Cài đặt: xem HUONG-DAN-CAI-DAT.md
 */
const TEACHER_EMAIL = 'tqmai1996@gmail.com';
const SHEET_TITLE = 'BTVN – Bài nộp của học sinh';
const TIMEZONE = 'Asia/Ho_Chi_Minh';
const HEAD = ['Thời gian nộp', 'Họ tên', 'Lớp', 'Bài', 'Điểm', 'Tổng', '2.1', '2.2', '2.3', '2.4', '2.5', 'Câu sai', 'Chi tiết (JSON)',
              'Bắt đầu lúc', 'Thời gian làm bài', 'Số lần rời trang'];

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
    sendMail_(d, sheetUrl);
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

function logToSheet_(d) {
  const { ss, sh } = getSheet_();
  // thêm dấu ' để Sheets không hiểu "6/6" là ngày tháng
  const secs = d.sections.map(s => "'" + s.score + '/' + s.total);
  while (secs.length < 5) secs.push('');
  const wrong = d.items.filter(i => !i.ok).map(i => i.sec + '.' + i.n).join(', ');
  const when = d.submittedAt ? new Date(d.submittedAt) : new Date();
  sh.appendRow([when, d.name, d.cls, d.title, d.score, d.total].concat(secs.slice(0, 5), [wrong || '—', JSON.stringify(d.items),
    d.startedAt ? new Date(d.startedAt) : '—', fmtDur_(d.timeTakenSec), d.leaves]));
  return ss.getUrl();
}

function sendMail_(d, sheetUrl) {
  const subject = '[BTVN ' + d.unit + '] ' + d.name + ' – ' + d.cls + ' – ' + d.score + '/' + d.total;
  const td = 'style="border:1px solid #e3dccf;padding:6px 8px;vertical-align:top"';
  const row = (k, v) => '<tr><td style="padding:3px 14px 3px 0;color:#666">' + k + '</td><td style="padding:3px 0"><b>' + v + '</b></td></tr>';
  let html = '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#222;max-width:760px">' +
    '<h2 style="margin:0 0 8px;color:#14866d">' + esc_(d.title) + '</h2>' +
    '<table style="border-collapse:collapse;margin-bottom:12px;font-size:14px">' +
    row('Học sinh', esc_(d.name) + ' – Lớp ' + esc_(d.cls)) +
    row('Điểm (score)', '<span style="font-size:20px;color:#14866d">' + d.score + '/' + d.total + '</span>') +
    row('Bắt đầu (started)', fmtTime_(d.startedAt)) +
    row('Nộp bài (submitted)', fmtTime_(d.submittedAt)) +
    row('Thời gian làm (time taken)', fmtDur_(d.timeTakenSec)) +
    row('Rời trang (left the page)', '<span style="color:' + (d.leaves ? '#d64045' : '#1f8a4c') + '">' + d.leaves + ' lần</span>') +
    '</table>';

  d.sections.forEach(s => {
    html += '<h3 style="margin:16px 0 6px">' + esc_(s.title) + ' — ' + s.score + '/' + s.total + '</h3>' +
      '<table style="border-collapse:collapse;width:100%;font-size:13.5px">' +
      '<tr style="background:#f4efe6"><th ' + td + '>Câu</th><th ' + td + '>Đề</th><th ' + td + '>HS trả lời</th><th ' + td + '>Đáp án</th><th ' + td + '></th></tr>';
    d.items.filter(i => i.sec === s.id).forEach(i => {
      html += '<tr style="background:' + (i.ok ? '#eefaf3' : '#fdecec') + '">' +
        '<td ' + td + '>' + esc_(i.n) + '</td>' +
        '<td ' + td + '>' + esc_(i.q) + '</td>' +
        '<td ' + td + '><b>' + (i.ans ? esc_(i.ans) : '<i style="color:#999">(bỏ trống)</i>') + '</b></td>' +
        '<td ' + td + '>' + esc_(i.correct) + '</td>' +
        '<td ' + td + '>' + (i.ok ? '✅' : '❌') + '</td></tr>';
    });
    html += '</table>';
  });
  html += '<p style="margin-top:16px"><a href="' + sheetUrl + '">📊 Mở bảng tổng hợp bài nộp (Google Sheet)</a></p></div>';

  MailApp.sendEmail({ to: TEACHER_EMAIL, subject: subject, htmlBody: html, name: 'Bài tập về nhà' });
}
