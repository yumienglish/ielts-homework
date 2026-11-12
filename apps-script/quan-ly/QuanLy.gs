/**
 * QUẢN LÝ LỚP HỌC — script của file Google Sheet chính (CHỈ CÔ dùng, không chia sẻ file này).
 * ------------------------------------------------------------
 * Gồm 2 file trong Apps Script: QuanLy.gs (file này) + App.html (giao diện web).
 * Hướng dẫn cài đặt: apps-script/HUONG-DAN-QUAN-LY.md
 *
 * Mỗi tab là 1 bảng, hàng 1 là tiêu đề. Web app đọc toàn bộ bảng khi mở (getAll)
 * và chỉ gửi về những dòng đã thay đổi (applyChanges). Cô vẫn sửa tay trong Sheet được.
 */

const APP_TITLE = 'Lớp học của cô';

// Kiểu cột: t = chữ, d = ngày (yyyy-mm-dd), m = tháng (yyyy-mm), h = giờ (HH:mm), n = số, '' = tự do.
// Cột t/d/m/h được định dạng "Văn bản thuần" để Sheet không tự đổi kiểu.
const SCHEMA = {
  Lop: { key: ['code'], cols: [
    ['code', 'Mã lớp', 't'], ['type', 'Kiểu học phí (Tháng/Gói)', ''], ['size', 'Số buổi/gói', 'n'], ['perWeek', 'Số buổi/tuần', 'n'],
    ['book', 'Giáo trình', ''], ['extra', 'Extra', ''], ['emo', 'Sticker', ''], ['bg', 'Màu nền', 't'], ['fg', 'Màu chữ', 't'], ['status', 'Trạng thái', '']] },
  HocSinh: { key: ['name'], cols: [
    ['name', 'Tên gọi', 't'], ['full', 'Họ tên đầy đủ', ''], ['cls', 'Lớp', 't'], ['fee', 'Học phí', 'n'], ['from', 'Bắt đầu học', 'd'],
    ['status', 'Trạng thái', ''], ['parent', 'Phụ huynh', ''], ['phone', 'SĐT/Zalo', 't'], ['alias', 'Tên khác (bài nộp online)', ''], ['note', 'Ghi chú', '']] },
  Lich: { key: ['id'], cols: [
    ['id', 'id', 't'], ['date', 'Ngày', 'd'], ['time', 'Giờ bắt đầu', 'h'], ['dur', 'Số phút', 'n'], ['cls', 'Lớp', 't'],
    ['makeup', 'Học bù (x)', ''], ['startNum', 'Buổi số (đặt tay, trống = tự đếm)', 'n']] },
  GiaoAn: { key: ['id'], cols: [
    ['id', 'id', 't'], ['cls', 'Lớp', 't'], ['date', 'Ngày dạy (trống = tự xếp)', 'd'], ['num', 'Buổi', 't'], ['lesson', 'Bài dạy', ''],
    ['content', 'Nội dung bài dạy (chi tiết)', ''], ['mat', 'Tài liệu cần chuẩn bị', ''], ['hw', 'Homework', ''], ['print', 'File cần in', ''],
    ['note', 'Note sau buổi học', ''], ['ord', 'Thứ tự', 'n']] },
  GhiChuTuan: { key: ['mon'], cols: [['mon', 'Thứ Hai của tuần', 'd'], ['gc', 'Ghi chú', ''], ['todo', 'Việc cần làm', '']] },
  DiemDanh: { key: ['date', 'cls', 'name'], cols: [
    ['date', 'Ngày', 'd'], ['cls', 'Lớp', 't'], ['name', 'Học sinh', 't'], ['status', 'Trạng thái', ''], ['hw', 'BT buổi trước', ''],
    ['tpl', 'Mẫu nhận xét', ''], ['note', 'Ghi chú', '']] },
  HocPhi: { key: ['name', 'ym'], cols: [['name', 'Học sinh', 't'], ['ym', 'Tháng (yyyy-mm)', 'm'], ['state', 'Trạng thái (Đã đóng/Chưa đóng/Nghỉ)', '']] },
  Diem: { key: null, readOnly: true, cols: [
    ['date', 'Ngày', 'd'], ['cls', 'Lớp', 't'], ['name', 'Học sinh', 't'], ['type', 'Loại (HW/XT/CT)', 't'], ['test', 'Bài', ''],
    ['score', 'Điểm', 't'], ['max', 'Max', 't'], ['pct', '%', 't'], ['ta', 'Người chấm', ''], ['note', 'Lỗi sai', ''], ['res', 'Hướng xử lý', ''], ['src', 'Nguồn', '']] },
  MauNhanXet: { key: null, readOnly: true, cols: [
    ['code', 'Mã', 't'], ['label', 'Nhãn ngắn', ''], ['teacher', 'Nhận xét của GV', ''], ['next', 'Hành động tiếp theo', ''], ['parent', 'Câu gửi phụ huynh', '']] },
  BaoCao: { key: ['name'], cols: [
    ['name', 'Học sinh', 't'], ['from', 'Từ ngày', 'd'], ['to', 'Đến ngày', 'd'], ['learn', 'Kỳ này con đã học', ''], ['good', 'Con làm tốt', ''],
    ['weak', 'Cần cố gắng', ''], ['goal', 'Mục tiêu', ''], ['sent', 'Đã gửi', '']] },
  CaiDat: { key: ['key'], cols: [['key', 'Mục', 't'], ['value', 'Giá trị', '']] },
};
const TEXT_KINDS = { t: 1, d: 1, m: 1, h: 1 };
const DEFAULT_SETTINGS = [['Tên cô (ký báo cáo)', '']];

// ===================== MENU & WEB APP =====================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🌷 Lớp học')
    .addItem('Mở web app', 'menuOpenApp')
    .addSeparator()
    .addItem('Kiểm tra / tạo các tab', 'setup')
    .addToUi();
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('App')
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

function menuOpenApp() {
  const url = ScriptApp.getService().getUrl();
  const ui = SpreadsheetApp.getUi();
  if (!url) { ui.alert('Chưa triển khai web app.\nTrong Apps Script: Triển khai → Tùy chọn triển khai mới → Ứng dụng web (xem hướng dẫn).'); return; }
  const html = HtmlService.createHtmlOutput('<p style="font-family:sans-serif">Mở web app (nên lưu vào màn hình chính điện thoại):</p>' +
    '<p><a href="' + url + '" target="_blank" style="font-family:sans-serif;font-size:16px">' + url + '</a></p>').setWidth(460).setHeight(140);
  ui.showModalDialog(html, APP_TITLE);
}

// ===================== TẠO / KIỂM TRA TAB =====================
/** Tạo tab còn thiếu, thêm cột còn thiếu, đặt định dạng chữ cho cột ngày/giờ/mã. Chạy lại nhiều lần không sao. */
function setup() {
  const ss = SpreadsheetApp.getActive(); const tz = ss.getSpreadsheetTimeZone(); const lines = [];
  Object.keys(SCHEMA).forEach(function (t) {
    const existed = !!ss.getSheetByName(t);
    const sh = ensureSheet_(ss, t);
    const n = normalizeTable_(sh, t, tz);
    lines.push((existed ? '✓ ' : '＋ ') + t + ': ' + n + ' dòng');
  });
  const cd = ss.getSheetByName('CaiDat'); const have = readTable_(ss, 'CaiDat', tz).map(function (r) { return r.key; });
  DEFAULT_SETTINGS.forEach(function (kv) { if (have.indexOf(kv[0]) < 0) cd.appendRow(kv); });
  const msg = 'Các tab dữ liệu:\n' + lines.join('\n') + '\n\nTab CaiDat: điền "Tên cô (ký báo cáo)" để hiện ở cuối báo cáo.';
  try { SpreadsheetApp.getUi().alert('Kiểm tra xong', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (e) { Logger.log(msg); }
  return msg;
}

function ensureSheet_(ss, t) {
  const sc = SCHEMA[t]; let sh = ss.getSheetByName(t);
  if (!sh) { sh = ss.insertSheet(t); sh.getRange(1, 1, 1, sc.cols.length).setValues([sc.cols.map(function (c) { return c[1]; })]); }
  const width = Math.max(sh.getLastColumn(), 1);
  const head = sh.getRange(1, 1, 1, width).getValues()[0].map(String); const n0 = head.length;
  sc.cols.forEach(function (c) { if (head.indexOf(c[1]) < 0) { head.push(c[1]); sh.getRange(1, head.length).setValue(c[1]); } });
  if (head.length !== n0 || sh.getFrozenRows() !== 1) {
    sh.getRange(1, 1, 1, head.length).setFontWeight('bold').setBackground('#fde2e8').setWrap(true);
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Đổi ô ngày/giờ kiểu Date (do gõ tay hoặc nhập file) thành chữ chuẩn, rồi định dạng văn bản thuần. */
function normalizeTable_(sh, t, tz) {
  const sc = SCHEMA[t]; const last = sh.getLastRow(); const width = sh.getLastColumn();
  const head = sh.getRange(1, 1, 1, width).getValues()[0].map(String);
  const rows = Math.max(sh.getMaxRows() - 1, 1);
  sc.cols.forEach(function (c) {
    if (!TEXT_KINDS[c[2]]) return; const j = head.indexOf(c[1]); if (j < 0) return;
    if (last > 1) {
      const rg = sh.getRange(2, j + 1, last - 1, 1); const v = rg.getValues(), dv = rg.getDisplayValues();
      const out = v.map(function (r, i) { return [cellOut_(r[0], dv[i][0], c[2], tz)]; });
      rg.setNumberFormat('@').setValues(out);
    }
    sh.getRange(2, j + 1, rows, 1).setNumberFormat('@');
  });
  return Math.max(last - 1, 0);
}

// ===================== ĐỌC =====================
/** Web app gọi khi mở: trả về toàn bộ các tab. */
function getAll() {
  const ss = SpreadsheetApp.getActive(); const tz = ss.getSpreadsheetTimeZone(); const tables = {};
  Object.keys(SCHEMA).forEach(function (t) { tables[t] = readTable_(ss, t, tz); });
  return { tables: tables, canEdit: canEdit_(ss), at: new Date().toISOString() };
}

/**
 * Người đang mở web app có được sửa không: chủ file hoặc người có quyền chỉnh sửa file.
 * Người chỉ được chia sẻ quyền Xem (vd. người nhà) chỉ xem được, không ghi được gì.
 * (Cần triển khai web app "Thực thi với tư cách: Người dùng truy cập ứng dụng web".)
 */
function canEdit_(ss) {
  const me = String(Session.getActiveUser().getEmail() || '').toLowerCase();
  if (!me) return true; // không biết email (chạy dưới quyền chủ file) → Google tự chặn nếu không có quyền
  const owner = ss.getOwner();
  if (owner && String(owner.getEmail()).toLowerCase() === me) return true;
  return ss.getEditors().some(function (u) { return String(u.getEmail()).toLowerCase() === me; });
}

function readTable_(ss, t, tz) {
  const sc = SCHEMA[t]; const sh = ss.getSheetByName(t); if (!sh) return [];
  const last = sh.getLastRow(), width = sh.getLastColumn(); if (last < 2 || !width) return [];
  const rg = sh.getRange(1, 1, last, width); const v = rg.getValues(), dv = rg.getDisplayValues();
  const head = v[0].map(String); const out = [];
  for (let i = 1; i < v.length; i++) {
    if (v[i].every(function (x) { return x === '' || x === null; })) continue;
    const o = {};
    // giữ cả các cột cô tự thêm (theo tên tiêu đề), để ghi lại không bị mất
    head.forEach(function (h, j) { if (h) o['_' + h] = cellOut_(v[i][j], dv[i][j], '', tz); });
    sc.cols.forEach(function (c) { const j = head.indexOf(c[1]); if (j >= 0) { o[c[0]] = cellOut_(v[i][j], dv[i][j], c[2], tz); delete o['_' + c[1]]; } });
    out.push(o);
  }
  return out;
}

/** Chuẩn hóa 1 ô về dạng chữ/số dùng trong web app. */
function cellOut_(v, disp, kind, tz) {
  if (kind === 'h') { const m = /(\d{1,2}):(\d{2})/.exec(String(disp || v)); return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : ''; }
  if (v instanceof Date) return Utilities.formatDate(v, tz, kind === 'm' ? 'yyyy-MM' : 'yyyy-MM-dd');
  if (kind === 'd' && typeof v === 'string') { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v.trim()); if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2); }
  if (kind === 'm' && typeof v === 'string') { const m = /^(\d{1,2})\/(\d{4})$/.exec(v.trim()); if (m) return m[2] + '-' + ('0' + m[1]).slice(-2); }
  if (v === null || v === undefined) return '';
  if (TEXT_KINDS[kind]) return String(v).trim();
  return v;
}

// ===================== GHI =====================
/**
 * Web app gửi các thay đổi: [{t: 'Lich', op: 'put'|'del', key: 's12', row: {...}}].
 * put = sửa dòng có khóa đó (hoặc thêm mới), del = xóa dòng.
 */
function applyChanges(changes) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const ss = SpreadsheetApp.getActive(); const tz = ss.getSpreadsheetTimeZone(); const byT = {};
    if (!canEdit_(ss)) throw new Error('Bạn chỉ có quyền xem, không lưu được thay đổi.');
    (changes || []).forEach(function (c) {
      if (!SCHEMA[c.t] || SCHEMA[c.t].readOnly) throw new Error('Không ghi được vào tab ' + c.t);
      (byT[c.t] = byT[c.t] || []).push(c);
    });
    Object.keys(byT).forEach(function (t) { writeTable_(ss, t, byT[t], tz); });
    return { ok: true, n: (changes || []).length };
  } finally { lock.releaseLock(); }
}

function writeTable_(ss, t, chs, tz) {
  const sc = SCHEMA[t]; const sh = ensureSheet_(ss, t);
  const last = sh.getLastRow(), width = sh.getLastColumn();
  const rg = sh.getRange(1, 1, Math.max(last, 1), width);
  const vals = rg.getValues(), dv = rg.getDisplayValues(); const head = vals[0].map(String);
  const col = {}; sc.cols.forEach(function (c) { col[c[0]] = { j: head.indexOf(c[1]), kind: c[2] }; });
  const keyOf = function (i) { return sc.key.map(function (k) { return String(cellOut_(vals[i][col[k].j], dv[i][col[k].j], col[k].kind, tz)); }).join('|'); };
  const index = {}; for (let i = 1; i < vals.length; i++) index[keyOf(i)] = i;
  const rows = vals.slice(); let deleted = false;
  chs.forEach(function (ch) {
    let i = index[ch.key];
    if (ch.op === 'del') { if (i !== undefined) { rows[i] = null; delete index[ch.key]; deleted = true; } return; }
    if (i === undefined || rows[i] === null) { rows.push(new Array(head.length).fill('')); i = rows.length - 1; index[ch.key] = i; }
    Object.keys(ch.row || {}).forEach(function (f) {
      if (f.charAt(0) === '_') { const j = head.indexOf(f.slice(1)); if (j >= 0) rows[i][j] = ch.row[f]; return; }
      const c = col[f]; if (!c || c.j < 0) return;
      let v = ch.row[f]; if (v === null || v === undefined) v = '';
      rows[i][c.j] = TEXT_KINDS[c.kind] ? String(v) : v;
    });
  });
  const out = rows.filter(function (r) { return r !== null; });
  if (out.length > sh.getMaxRows()) {
    const add = out.length - sh.getMaxRows() + 50; sh.insertRowsAfter(sh.getMaxRows(), add);
    sc.cols.forEach(function (c) { if (TEXT_KINDS[c[2]] && col[c[0]].j >= 0) sh.getRange(2, col[c[0]].j + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@'); });
  }
  sh.getRange(1, 1, out.length, head.length).setValues(out);
  if (deleted && last > out.length) sh.getRange(out.length + 1, 1, last - out.length, head.length).clearContent();
}
