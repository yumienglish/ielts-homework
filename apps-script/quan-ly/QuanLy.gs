/**
 * QUẢN LÝ LỚP HỌC — script của file Google Sheet chính (CHỈ CÔ dùng, không chia sẻ file này).
 * ------------------------------------------------------------
 * Gồm 2 file trong Apps Script: QuanLy.gs (file này) + App.html (giao diện web).
 * Hướng dẫn cài đặt: apps-script/HUONG-DAN-QUAN-LY.md
 *
 * Mỗi tab là 1 bảng, hàng 1 là tiêu đề. Web app đọc toàn bộ bảng khi mở (getAll)
 * và chỉ gửi về những dòng đã thay đổi (applyChanges). Cô vẫn sửa tay trong Sheet được.
 */

const APP_TITLE = "Mia's Classroom";

// Kiểu cột: t = chữ, d = ngày (yyyy-mm-dd), m = tháng (yyyy-mm), h = giờ (HH:mm), n = số, '' = tự do.
// Cột t/d/m/h được định dạng "Văn bản thuần" để Sheet không tự đổi kiểu.
const SCHEMA = {
  Lop: { key: ['code'], cols: [
    ['code', 'Mã lớp', 't'], ['type', 'Kiểu học phí (Tháng/Gói)', ''], ['size', 'Số buổi/gói', 'n'], ['perWeek', 'Số buổi/tuần', 'n'],
    ['book', 'Giáo trình', ''], ['extra', 'Extra', ''], ['emo', 'Sticker', ''], ['bg', 'Màu nền', 't'], ['fg', 'Màu chữ', 't'], ['status', 'Trạng thái', ''],
    ['hwLink', 'Link bài tập', ''], ['hwDay', 'Ngày làm BT (T2…CN, trống = tự tính)', 't']] },
  HocSinh: { key: ['name'], cols: [
    ['name', 'Tên gọi', 't'], ['full', 'Họ tên đầy đủ', ''], ['cls', 'Lớp', 't'], ['fee', 'Học phí', 'n'], ['from', 'Bắt đầu học', 'd'],
    ['status', 'Trạng thái', ''], ['parent', 'Phụ huynh', ''], ['phone', 'SĐT/Zalo', 't'], ['alias', 'Tên khác (bài nộp online)', ''], ['note', 'Ghi chú', ''],
    ['viaParent', 'Nhắc BT qua phụ huynh (x)', '']] },
  // Nhắc bài tập: tuần nào đã nhắc lớp nào (web app: Trang chủ → 📣 Nhắc bài tập → ✓ Đã nhắc)
  NhacBT: { key: ['mon', 'cls'], cols: [['mon', 'Thứ Hai của tuần', 'd'], ['cls', 'Lớp', 't'], ['at', 'Đã nhắc lúc', 't']] },
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
    ['tpl', 'Mẫu nhận xét', ''], ['note', 'Ghi chú', ''], ['lucky', 'Lucky Draw (điểm cộng buổi này)', '']] },
  HocPhi: { key: ['name', 'ym'], cols: [['name', 'Học sinh', 't'], ['ym', 'Tháng (yyyy-mm)', 'm'], ['state', 'Trạng thái (Đã đóng/Chưa đóng/Nghỉ)', '']] },
  // Bảng giá (Quote) — web app: Học phí → nút 📋 Quote. Mỗi dòng 1 cấp độ + giá 1 giờ lớp kèm 1-1;
  // lớp 2/3/4/5+ học viên và giá 1 tháng (8 tiết × 1h30) do web app tự tính (App.html: Q_PCT, Q_HOURS).
  BangGia: { key: ['group', 'level'], cols: [
    ['group', 'Nhóm', 't'], ['level', 'LEVEL', 't'], ['hour', 'Giá 1 giờ kèm 1-1 (đ)', 'n'], ['ord', 'Thứ tự', 'n']] },
  // Lucky Draw: điểm mang sang, lần bốc thăm (−50) + quà, điều chỉnh tay. Điểm cộng từng buổi nằm ở cột Lucky Draw của DiemDanh.
  LuckyDraw: { key: ['id'], cols: [
    ['id', 'id', 't'], ['date', 'Ngày', 'd'], ['name', 'Học sinh', 't'], ['kind', 'Loại (Mang sang/Bốc thăm/Điều chỉnh)', ''],
    ['pts', 'Điểm (+/−)', 'n'], ['gift', 'Quà đã nhận / ghi chú', '']] },
  Diem: { key: ['ref'], readOnly: true, cols: [
    ['date', 'Ngày', 'd'], ['cls', 'Lớp', 't'], ['name', 'Học sinh', 't'], ['type', 'Loại (HW/XT/CT)', 't'], ['test', 'Bài', ''],
    ['score', 'Điểm', 't'], ['max', 'Max', 't'], ['pct', '%', 't'], ['ta', 'Người chấm', ''], ['note', 'Lỗi sai', ''], ['res', 'Hướng xử lý', ''], ['src', 'Nguồn', ''],
    ['ref', 'Mã bài nộp (tự ghi)', 't']] },
  // Bài nộp online chưa khớp được tên học sinh (web app: Học sinh → Bài nộp online)
  ChoGhepTen: { key: ['ref'], readOnly: true, cols: [
    ['ref', 'Mã bài nộp', 't'], ['src', 'Nguồn', ''], ['date', 'Ngày nộp', 'd'], ['typedName', 'Tên HS tự gõ', ''], ['typedCls', 'Lớp HS tự gõ', ''],
    ['test', 'Bài', ''], ['score', 'Điểm', 't'], ['max', 'Max', 't'], ['row', 'Dữ liệu (đừng sửa)', ''], ['status', 'Trạng thái', '']] },
  MauNhanXet: { key: null, readOnly: true, cols: [
    ['code', 'Mã', 't'], ['label', 'Nhãn ngắn', ''], ['teacher', 'Nhận xét của GV', ''], ['next', 'Hành động tiếp theo', ''], ['parent', 'Câu gửi phụ huynh', '']] },
  BaoCao: { key: ['name'], cols: [
    ['name', 'Học sinh', 't'], ['from', 'Từ ngày', 'd'], ['to', 'Đến ngày', 'd'], ['learn', 'Kỳ này con đã học', ''], ['good', 'Con làm tốt', ''],
    ['weak', 'Cần cố gắng', ''], ['goal', 'Mục tiêu', ''], ['sent', 'Đã gửi', '']] },
  CaiDat: { key: ['key'], cols: [['key', 'Mục', 't'], ['value', 'Giá trị', '']] },
};
const TEXT_KINDS = { t: 1, d: 1, m: 1, h: 1 };
const DEFAULT_SETTINGS = [['Tên cô (ký báo cáo)', ''], ['Link web app', ''], ['Link file bài nộp BTVN', ''], ['Link file bài nộp Speaking', ''], ['Lần lấy bài nộp gần nhất', '']];

// ===================== MENU & WEB APP =====================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('🌷 Lớp học')
    .addItem('Mở web app', 'menuOpenApp')
    .addSeparator()
    .addItem('Kiểm tra / tạo các tab', 'setup')
    .addSeparator()
    .addItem('📥 Lấy bài nộp online ngay', 'menuImport')
    .addItem('Bật tự lấy bài nộp (4 tiếng/lần)', 'enableImportTrigger')
    .addItem('Tắt tự lấy bài nộp', 'disableImportTrigger')
    .addToUi();
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('App')
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/**
 * Mở web app. Ưu tiên link cô dán ở tab CaiDat (dòng "Link web app"), vì
 * ScriptApp.getService().getUrl() hay trả về link bản thử (/dev) hoặc lần triển khai cũ.
 */
function menuOpenApp() {
  const ss = SpreadsheetApp.getActive(); const ui = SpreadsheetApp.getUi();
  let saved = '';
  readTable_(ss, 'CaiDat', ss.getSpreadsheetTimeZone()).forEach(function (r) { if (r.key === 'Link web app') saved = String(r.value || '').trim(); });
  const url = /\/exec(\?|$)/.test(saved) ? saved : '';
  if (!url) {
    ui.alert('Chưa có link web app',
      'Mở Apps Script → Triển khai → Quản lý các lần triển khai → copy "URL ứng dụng web" (đuôi /exec),\n' +
      'rồi dán vào dòng "Link web app" ở tab CaiDat (cột Giá trị). Lần sau bấm menu này sẽ mở đúng link.\n\n' +
      '(Chưa có dòng "Link web app"? Chạy 🌷 Lớp học → Kiểm tra / tạo các tab trước.)', ui.ButtonSet.OK);
    return;
  }
  const html = HtmlService.createHtmlOutput('<p style="font-family:sans-serif">Mở web app (nên lưu dấu trang / thêm vào màn hình chính):</p>' +
    '<p><a href="' + url + '" target="_blank" style="font-family:sans-serif;font-size:16px;word-break:break-all">' + url + '</a></p>' +
    '<p style="font-family:sans-serif;font-size:12px;color:#777">Báo "không thể mở tệp"? Trình duyệt đang dùng nhầm tài khoản Google: mở trong cửa sổ ẩn danh, hoặc thêm /u/1/ vào link (xem hướng dẫn).</p>')
    .setWidth(480).setHeight(190);
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
  const msg = 'Các tab dữ liệu:\n' + lines.join('\n') + '\n\nTab CaiDat: điền "Tên cô (ký báo cáo)" để hiện ở cuối báo cáo, ' +
    'và dán link 2 file bài nộp (BTVN, Speaking) để tự lấy bài học sinh nộp online.';
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
  // Hỏi Drive danh sách người sửa rất chậm (~0,5–1 giây) → nhớ kết quả 10 phút
  let cache = null; try { cache = CacheService.getScriptCache(); } catch (e) {}
  const ck = 'canEdit:' + me; const hit = cache && cache.get(ck); if (hit) return hit === '1';
  const owner = ss.getOwner();
  const ok = (owner && String(owner.getEmail()).toLowerCase() === me) || ss.getEditors().some(function (u) { return String(u.getEmail()).toLowerCase() === me; });
  if (cache) try { cache.put(ck, ok ? '1' : '0', 600); } catch (e) {}
  return ok;
}

/** Đọc 1 tab: 1 lần gọi Google cho cả bảng; chỉ gọi thêm "chữ hiển thị" cho cột giờ khi Sheet tự đổi thành kiểu thời gian. */
function readTable_(ss, t, tz) {
  const sc = SCHEMA[t]; const sh = ss.getSheetByName(t); if (!sh) return [];
  const v = sh.getDataRange().getValues(); if (v.length < 2) return [];
  const head = v[0].map(String); const out = [];
  const dispCol = {}; // cột giờ (h) có ô kiểu Date → đọc chữ hiển thị của riêng cột đó
  sc.cols.forEach(function (c) { if (c[2] !== 'h') return; const j = head.indexOf(c[1]);
    if (j >= 0 && v.some(function (r, i) { return i > 0 && r[j] instanceof Date; })) dispCol[j] = sh.getRange(1, j + 1, v.length, 1).getDisplayValues(); });
  const dsp = function (i, j) { return dispCol[j] ? dispCol[j][i][0] : ''; };
  for (let i = 1; i < v.length; i++) {
    if (v[i].every(function (x) { return x === '' || x === null; })) continue;
    const o = {};
    // giữ cả các cột cô tự thêm (theo tên tiêu đề), để ghi lại không bị mất
    head.forEach(function (h, j) { if (h) o['_' + h] = cellOut_(v[i][j], '', '', tz); });
    sc.cols.forEach(function (c) { const j = head.indexOf(c[1]); if (j >= 0) { o[c[0]] = cellOut_(v[i][j], dsp(i, j), c[2], tz); delete o['_' + c[1]]; } });
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

/**
 * Ghi các thay đổi vào 1 tab. Sửa/thêm vài dòng → chỉ ghi đúng những dòng đó (nhanh);
 * có xóa dòng hoặc sửa rất nhiều dòng → ghi lại cả bảng (để dồn dòng, không chừa dòng trống).
 */
function writeTable_(ss, t, chs, tz) {
  const sc = SCHEMA[t]; let sh = ss.getSheetByName(t);
  let vals = sh ? sh.getDataRange().getValues() : [[]]; let head = vals[0].map(String);
  if (!sh || sc.cols.some(function (c) { return head.indexOf(c[1]) < 0; })) { // tab/cột còn thiếu → tạo rồi đọc lại
    sh = ensureSheet_(ss, t); vals = sh.getDataRange().getValues(); head = vals[0].map(String);
  }
  const last = vals.length;
  const col = {}; sc.cols.forEach(function (c) { col[c[0]] = { j: head.indexOf(c[1]), kind: c[2] }; });
  const keyOf = function (i) { return sc.key.map(function (k) { return String(cellOut_(vals[i][col[k].j], '', col[k].kind, tz)); }).join('|'); };
  const index = {}; for (let i = 1; i < vals.length; i++) index[keyOf(i)] = i;
  const rows = vals.map(function (r) { return r.length < head.length ? r.concat(new Array(head.length - r.length).fill('')) : r; });
  let deleted = false; const touched = {};
  chs.forEach(function (ch) {
    let i = index[ch.key];
    if (ch.op === 'del') { if (i !== undefined) { rows[i] = null; delete index[ch.key]; deleted = true; } return; }
    if (i === undefined || rows[i] === null) { rows.push(new Array(head.length).fill('')); i = rows.length - 1; index[ch.key] = i; }
    touched[i] = true;
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
  const idx = Object.keys(touched).map(Number).sort(function (a, b) { return a - b; });
  if (deleted || idx.length > 30) { // ghi lại cả bảng
    sh.getRange(1, 1, out.length, head.length).setValues(out);
    if (deleted && last > out.length) sh.getRange(out.length + 1, 1, last - out.length, head.length).clearContent();
    return;
  }
  for (let k = 0; k < idx.length;) { // ghi từng cụm dòng liền nhau
    let e = k; while (e + 1 < idx.length && idx[e + 1] === idx[e] + 1) e++;
    sh.getRange(idx[k] + 1, 1, e - k + 1, head.length).setValues(rows.slice(idx[k], idx[e] + 1));
    k = e + 1;
  }
}

// ===================== BÀI NỘP ONLINE (BTVN, Speaking) =====================
// Đọc 2 file bài nộp do Code.gs / Speaking.gs tạo (không sửa 2 script đó), chép bài mới vào tab Diem.
// Bài không khớp được tên học sinh → tab ChoGhepTen, cô ghép trong web app (Học sinh → Bài nộp online).
// title = tên file do Code.gs / Speaking.gs tự tạo → chưa dán link thì tự tìm trong Drive của cô.
const IMPORT_SOURCES = [
  { setting: 'Link file bài nộp BTVN', title: 'BTVN – Bài nộp của học sinh', label: 'BTVN online', parse: parseBtvn_ },
  { setting: 'Link file bài nộp Speaking', title: 'Speaking 10 tuần – Bài nộp', label: 'Speaking', parse: parseSpeaking_ },
];

function menuImport() {
  const r = importSubmissions_({ ensureTrigger: true });
  SpreadsheetApp.getUi().alert('Lấy bài nộp online', r.text, SpreadsheetApp.getUi().ButtonSet.OK);
}
/** Tìm file Google Sheet theo đúng tên trong Drive (lấy file sửa gần nhất). */
function findByTitle_(title) {
  try {
    const it = DriveApp.searchFiles('title = "' + title.replace(/"/g, '\\"') + '" and trashed = false and mimeType = "application/vnd.google-apps.spreadsheet"');
    let best = null;
    while (it.hasNext()) { const f = it.next(); if (!best || f.getLastUpdated() > best.getLastUpdated()) best = f; }
    return best ? best.getId() : '';
  } catch (e) { return ''; }
}
/** Bật lịch tự lấy bài 4 tiếng/lần nếu chưa bật. Trả về true nếu vừa bật. */
function ensureImportTrigger_() {
  try {
    if (ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'importSubmissions'; })) return false;
    ScriptApp.newTrigger('importSubmissions').timeBased().everyHours(4).create(); return true;
  } catch (e) { return false; }
}
/** Trigger 4 tiếng/lần. */
function importSubmissions() { return importSubmissions_().text; }
function enableImportTrigger() {
  disableImportTrigger(true);
  ScriptApp.newTrigger('importSubmissions').timeBased().everyHours(4).create();
  SpreadsheetApp.getUi().alert('Đã BẬT: cứ 4 tiếng file này tự lấy bài học sinh nộp online một lần.');
}
function disableImportTrigger(quiet) {
  let n = 0;
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'importSubmissions') { ScriptApp.deleteTrigger(t); n++; } });
  if (quiet !== true) SpreadsheetApp.getUi().alert(n ? 'Đã TẮT tự lấy bài nộp.' : 'Tự lấy bài nộp đang tắt sẵn.');
}

/** Web app: nút "Lấy bài nộp ngay". Trả về dữ liệu mới + kết quả. */
function importNow() {
  if (!canEdit_(SpreadsheetApp.getActive())) throw new Error('Bạn chỉ có quyền xem.');
  const r = importSubmissions_({ ensureTrigger: true }); const d = getAll(); d.importText = r.text; return d;
}
/** Web app: ghép 1 bài nộp với học sinh. remember = nhớ tên đã gõ vào cột "Tên khác" để lần sau tự khớp. */
function resolveQueue(ref, studentName, remember) {
  const ss = SpreadsheetApp.getActive(); if (!canEdit_(ss)) throw new Error('Bạn chỉ có quyền xem.');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const tz = ss.getSpreadsheetTimeZone();
    const q = readTable_(ss, 'ChoGhepTen', tz).filter(function (r) { return r.ref === ref; })[0];
    const st = readTable_(ss, 'HocSinh', tz).filter(function (r) { return r.name === studentName; })[0];
    if (!q || !st) throw new Error('Không tìm thấy bài nộp hoặc học sinh.');
    moveToDiem_(ss, tz, [{ q: q, st: st }]);
    if (remember) {
      const al = String(st.alias || '').split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(String);
      if (al.map(norm_).indexOf(norm_(q.typedName)) < 0 && norm_(q.typedName) !== norm_(st.name)) al.push(String(q.typedName).trim());
      writeTable_(ss, 'HocSinh', [{ op: 'put', key: st.name, row: { alias: al.join(', ') } }], tz);
      rematchQueue_(ss, tz);
    }
  } finally { lock.releaseLock(); }
  return getAll();
}
/**
 * Web app: đổi tên gọi 1 học sinh ở MỌI tab có cột tên học sinh (HocSinh, DiemDanh, HocPhi, BaoCao, LuckyDraw, Diem),
 * để lịch sử điểm danh, học phí, điểm, Lucky Draw, báo cáo đi theo tên mới.
 * Tên cũ được thêm vào cột "Tên khác" → bài nộp online còn gõ tên cũ vẫn tự khớp.
 */
const RENAME_TABS = ['HocSinh', 'DiemDanh', 'HocPhi', 'BaoCao', 'LuckyDraw', 'Diem'];
function renameStudent(oldName, newName) {
  const ss = SpreadsheetApp.getActive(); if (!canEdit_(ss)) throw new Error('Bạn chỉ có quyền xem.');
  oldName = String(oldName || '').trim(); newName = String(newName || '').trim().replace(/\s+/g, ' ');
  if (!oldName || !newName) throw new Error('Thiếu tên học sinh.');
  if (oldName === newName) return getAll();
  const lock = LockService.getScriptLock(); lock.waitLock(30000); const counts = {};
  try {
    const tz = ss.getSpreadsheetTimeZone(); const hs = readTable_(ss, 'HocSinh', tz);
    const st = hs.filter(function (r) { return r.name === oldName; })[0];
    if (!st) throw new Error('Không tìm thấy học sinh "' + oldName + '".');
    if (hs.some(function (r) { return r.name === newName; })) throw new Error('Đã có học sinh tên "' + newName + '" – thêm số/ký hiệu để phân biệt.');
    RENAME_TABS.forEach(function (t) {
      const sh = ss.getSheetByName(t); if (!sh || sh.getLastRow() < 2) return;
      const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
      const label = SCHEMA[t].cols.filter(function (c) { return c[0] === 'name'; })[0][1]; const j = head.indexOf(label); if (j < 0) return;
      const rg = sh.getRange(2, j + 1, sh.getLastRow() - 1, 1); const v = rg.getValues(); let n = 0;
      const out = v.map(function (r) { if (String(r[0]).trim() === oldName) { n++; return [newName]; } return [r[0]]; });
      if (n) { rg.setValues(out); counts[t] = n; }
    });
    const al = String(st.alias || '').split(/[,;\n]/).map(function (x) { return x.trim(); }).filter(function (x) { return x && norm_(x) !== norm_(newName); });
    if (al.map(norm_).indexOf(norm_(oldName)) < 0 && norm_(oldName) !== norm_(newName)) al.push(oldName);
    writeTable_(ss, 'HocSinh', [{ op: 'put', key: newName, row: { alias: al.join(', ') } }], tz);
    try { // tài khoản đăng nhập của em đi theo tên mới
      const ash = btvnFile_(ss, tz).getSheetByName('TaiKhoan');
      if (ash) accRead_(ash).forEach(function (a) { if (a.hs === oldName) { ash.getRange(a.row, 8).setValue(newName); counts.TaiKhoan = (counts.TaiKhoan || 0) + 1; } });
    } catch (e) {}
  } finally { lock.releaseLock(); }
  const d = getAll(); d.renamed = counts; return d;
}
/** Web app: bỏ qua 1 bài nộp (không chép vào điểm, không hỏi lại). */
function ignoreQueue(ref) {
  const ss = SpreadsheetApp.getActive(); if (!canEdit_(ss)) throw new Error('Bạn chỉ có quyền xem.');
  writeTable_(ss, 'ChoGhepTen', [{ op: 'put', key: ref, row: { status: 'Bỏ qua' } }], ss.getSpreadsheetTimeZone());
  return getAll();
}

// ===================== TÀI KHOẢN HỌC SINH (đăng nhập trang BTVN + bảng xếp hạng) =====================
// Tab "TaiKhoan" nằm trong FILE BÀI NỘP BTVN (Code.gs đọc tab này để kiểm tra đăng nhập). Thứ tự cột phải khớp ACC_HEAD trong Code.gs.
// Web app: Học sinh → 🔑 Tài khoản. "Mã HS" = Tên gọi trong tab HocSinh (để bài nộp tự vào đúng em).
// Các em TỰ tạo tài khoản trên trang bài tập (nickname + PIN + họ tên thật + lớp). Cô chỉ duyệt: ghép với học sinh, đổi PIN, tắt.
const ACC_HEAD = ['Tên đăng nhập', 'PIN', 'Họ tên', 'Tên hiển thị', 'Lớp', 'Avatar', 'Hoạt động', 'Mã HS', 'Ngày tạo'];
/** Chép danh sách học sinh đang học sang tab DSHocSinh của file BTVN → Code.gs tự ghép lúc em tạo tài khoản. */
function syncRoster_(f, hsRows) {
  let sh = f.getSheetByName('DSHocSinh');
  if (!sh) { sh = f.insertSheet('DSHocSinh'); sh.setFrozenRows(1); }
  const rows = [['Tên gọi', 'Họ tên', 'Lớp', 'Tên khác']].concat(hsRows.filter(function (s) { return s.name && !/nghỉ|ngừng/i.test(s.status || ''); })
    .map(function (s) { return [s.name, s.full || '', s.cls || '', s.alias || '']; }));
  sh.clearContents();
  sh.getRange(1, 1, rows.length, 4).setNumberFormat('@').setValues(rows);
  sh.getRange(1, 1, 1, 4).setFontWeight('bold');
}
/** Tài khoản chưa ghép mà nay khớp đúng 1 học sinh (chưa có tài khoản khác) → ghép luôn. Trả về số tài khoản vừa ghép. */
function autoMatchAccounts_(sh, hsRows) {
  const list = accRead_(sh); const match = matcher_(hsRows); let n = 0;
  const used = {}; list.forEach(function (a) { if (a.hs && a.active) used[a.hs] = 1; });
  list.forEach(function (a) {
    if (a.hs || !a.active) return;
    const st = match(a.full, a.cls);
    if (st && !used[st.name]) { sh.getRange(a.row, 8).setValue(st.name); used[st.name] = 1; n++; }
  });
  return n;
}
function btvnFile_(ss, tz) {
  const set = {}; readTable_(ss, 'CaiDat', tz).forEach(function (r) { set[r.key] = String(r.value || '').trim(); });
  const id = sheetId_(set['Link file bài nộp BTVN']) || findByTitle_('BTVN – Bài nộp của học sinh');
  if (!id) throw new Error('Chưa tìm thấy file bài nộp BTVN – dán link file vào tab CaiDat ("Link file bài nộp BTVN").');
  return SpreadsheetApp.openById(id);
}
function accTab_(f) {
  let sh = f.getSheetByName('TaiKhoan');
  if (!sh) {
    sh = f.insertSheet('TaiKhoan');
    sh.getRange(1, 1, 1, ACC_HEAD.length).setValues([ACC_HEAD]).setFontWeight('bold').setBackground('#ffe3ec');
    sh.setFrozenRows(1); sh.getRange('B:B').setNumberFormat('@');
  }
  return sh;
}
function accUser_(s) { return norm_(s).replace(/ /g, '').slice(0, 30); }
function accRead_(sh) {
  const n = sh.getLastRow() - 1; if (n < 1) return [];
  return sh.getRange(2, 1, n, ACC_HEAD.length).getValues().map(function (r, i) {
    const act = r[6];
    const p = String(r[1] == null ? '' : r[1]).replace(/\D/g, '');
    return { row: i + 2, user: accUser_(r[0]), pin: p ? p.padStart(4, '0') : '', full: String(r[2] || ''),
      name: String(r[3] || ''), cls: String(r[4] || ''), avatar: String(r[5] || ''),
      active: !(act === false || /^(false|không|khong|0|tắt|tat)$/i.test(String(act).trim())), hs: String(r[7] || ''),
      created: r[8] instanceof Date ? Utilities.formatDate(r[8], 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd') : String(r[8] || '') };
  }).filter(function (a) { return a.user; });
}
/** Web app: danh sách tài khoản (cần quyền sửa – có PIN). */
function getAccounts() {
  const ss = SpreadsheetApp.getActive(); if (!canEdit_(ss)) throw new Error('Bạn chỉ có quyền xem.');
  const tz = ss.getSpreadsheetTimeZone(); const f = btvnFile_(ss, tz); const sh = accTab_(f);
  const hsRows = readTable_(ss, 'HocSinh', tz);
  try { syncRoster_(f, hsRows); autoMatchAccounts_(sh, hsRows); } catch (e) {}
  return accRead_(sh).map(function (a) { delete a.row; return a; });
}
/** Web app: thêm / sửa tài khoản. list = [{user, pin?, full, name, cls, active, hs}] — tìm theo tên đăng nhập, không có thì thêm dòng. */
function saveAccounts(list) {
  const ss = SpreadsheetApp.getActive(); if (!canEdit_(ss)) throw new Error('Bạn chỉ có quyền xem.');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const sh = accTab_(btvnFile_(ss, ss.getSpreadsheetTimeZone()));
    const cur = {}; accRead_(sh).forEach(function (a) { cur[a.user] = a; });
    const add = [];
    (list || []).slice(0, 300).forEach(function (x) {
      const user = accUser_(x.user); if (!user) return;
      const pin = String(x.pin || '').replace(/\D/g, '');
      const a = cur[user];
      const row = [user, pin.length === 4 ? pin : (a ? a.pin : ''), String(x.full || '').slice(0, 80), String(x.name || '').slice(0, 40),
        String(x.cls || '').slice(0, 30), a ? a.avatar : '', x.active !== false, String(x.hs || '').slice(0, 80), a && a.created ? a.created : new Date()];
      if (row[1].length !== 4) throw new Error('Thiếu PIN 4 số cho ' + user);
      if (a) { sh.getRange(a.row, 2).setNumberFormat('@'); sh.getRange(a.row, 1, 1, ACC_HEAD.length).setValues([row]); }
      else { add.push(row); cur[user] = { user: user }; }
    });
    if (add.length) {
      const r0 = sh.getLastRow() + 1;
      sh.getRange(r0, 2, add.length, 1).setNumberFormat('@');
      sh.getRange(r0, 1, add.length, ACC_HEAD.length).setValues(add);
    }
  } finally { lock.releaseLock(); }
  return getAccounts();
}
/** Tài khoản → học sinh (theo Mã HS) để ghép bài nộp có cột "Tài khoản". */
function accStudents_(fileId, students) {
  const out = {};
  try {
    const sh = SpreadsheetApp.openById(fileId).getSheetByName('TaiKhoan'); if (!sh) return out;
    const byName = {}; students.forEach(function (s) { if (s.name) byName[s.name] = s; });
    accRead_(sh).forEach(function (a) { if (a.hs && byName[a.hs]) out[a.user] = byName[a.hs]; });
  } catch (e) {}
  return out;
}

function importSubmissions_(opts) {
  opts = opts || {};
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return { text: 'Đang có lần lấy bài khác chạy, thử lại sau.' };
  try {
    const ss = SpreadsheetApp.getActive(); const tz = ss.getSpreadsheetTimeZone();
    ensureSheet_(ss, 'Diem'); ensureSheet_(ss, 'ChoGhepTen');
    const set = {}; readTable_(ss, 'CaiDat', tz).forEach(function (r) { set[r.key] = String(r.value || '').trim(); });
    const hsRows = readTable_(ss, 'HocSinh', tz);
    const match = matcher_(hsRows); let accSt = {};
    const inDiem = {}; readTable_(ss, 'Diem', tz).forEach(function (r) { if (r.ref) inDiem[r.ref] = r; });
    const inQueue = {}; readTable_(ss, 'ChoGhepTen', tz).forEach(function (r) { if (r.ref) inQueue[r.ref] = r; });
    const found = {}; const msgs = []; let nAdd = 0, nQ = 0, nUpd = 0;
    IMPORT_SOURCES.forEach(function (src) {
      let id = sheetId_(set[src.setting]);
      if (!id) { // chưa có link → tự tìm file theo tên trong Drive, tìm thấy thì ghi link vào CaiDat
        id = findByTitle_(src.title);
        if (!id) { msgs.push('• ' + src.label + ': không tìm thấy file "' + src.title + '" trong Drive. Dán link file vào tab CaiDat.'); return; }
        writeTable_(ss, 'CaiDat', [{ op: 'put', key: src.setting, row: { key: src.setting, value: 'https://docs.google.com/spreadsheets/d/' + id + '/edit' } }], tz);
        msgs.push('• ' + src.label + ': đã tự tìm thấy file "' + src.title + '" và lưu link vào tab CaiDat.');
      }
      let rows;
      try { rows = readSource_(id, tz); } catch (e) { msgs.push('• ' + src.label + ': không mở được file (' + e.message + ').'); return; }
      if (src.parse === parseBtvn_) { // em đăng nhập → ghép theo tài khoản; chép danh sách HS để tự ghép tài khoản mới
        try { const bf = SpreadsheetApp.openById(id); syncRoster_(bf, hsRows); if (bf.getSheetByName('TaiKhoan')) autoMatchAccounts_(bf.getSheetByName('TaiKhoan'), hsRows); } catch (e) {}
        accSt = accStudents_(id, hsRows);
      }
      // bản sau ghi đè bản trước (Speaking gửi nhiều đợt trong 1 tuần → 1 dòng điểm)
      rows.forEach(function (o) { const rec = src.parse(o, tz); if (rec) { rec.row.src = src.label; found[rec.ref] = rec; } });
    });
    const putD = [], putQ = [];
    Object.keys(found).forEach(function (ref) {
      const rec = found[ref];
      if (inDiem[ref]) { if (rec.updatable && String(inDiem[ref].note) !== rec.row.note) { putD.push({ op: 'put', key: ref, row: { note: rec.row.note } }); nUpd++; } return; }
      if (inQueue[ref]) return;
      const st = (rec.account && accSt[rec.account]) || match(rec.typedName, rec.typedCls);
      if (st) { putD.push({ op: 'put', key: ref, row: diemRow_(rec.row, st, ref) }); nAdd++; }
      else {
        putQ.push({ op: 'put', key: ref, row: { ref: ref, src: rec.row.src, date: rec.row.date, typedName: rec.typedName, typedCls: rec.typedCls,
          test: rec.row.test, score: rec.row.score, max: rec.row.max, row: JSON.stringify(rec.row), status: '' } }); nQ++;
      }
    });
    if (putD.length) writeTable_(ss, 'Diem', putD, tz);
    if (putQ.length) writeTable_(ss, 'ChoGhepTen', putQ, tz);
    const nRe = rematchQueue_(ss, tz);
    const now = Utilities.formatDate(new Date(), tz, 'HH:mm dd/MM/yyyy');
    writeTable_(ss, 'CaiDat', [{ op: 'put', key: 'Lần lấy bài nộp gần nhất', row: { key: 'Lần lấy bài nộp gần nhất', value: now } }], tz);
    if (opts.ensureTrigger && ensureImportTrigger_()) msgs.push('• Đã bật tự lấy bài nộp 4 tiếng/lần.');
    const waiting = readTable_(ss, 'ChoGhepTen', tz).filter(function (r) { return !r.status; }).length;
    const text = 'Thêm ' + (nAdd + nRe) + ' bài vào Điểm' + (nUpd ? ', cập nhật ' + nUpd + ' bài Speaking' : '') + '. ' +
      (waiting ? waiting + ' bài chờ ghép tên (web app → Học sinh).' : 'Không có bài chờ ghép tên.') + (msgs.length ? '\n' + msgs.join('\n') : '');
    return { text: text, added: nAdd + nRe, queued: waiting };
  } finally { lock.releaseLock(); }
}

/** Thử khớp lại các bài đang chờ (sau khi cô thêm tên khác / học sinh mới). Trả về số bài đã khớp. */
function rematchQueue_(ss, tz) {
  const match = matcher_(readTable_(ss, 'HocSinh', tz)); const pairs = [];
  readTable_(ss, 'ChoGhepTen', tz).forEach(function (q) { if (q.status) return; const st = match(q.typedName, q.typedCls); if (st) pairs.push({ q: q, st: st }); });
  if (pairs.length) moveToDiem_(ss, tz, pairs);
  return pairs.length;
}
function moveToDiem_(ss, tz, pairs) {
  writeTable_(ss, 'Diem', pairs.map(function (p) { return { op: 'put', key: p.q.ref, row: diemRow_(JSON.parse(p.q.row || '{}'), p.st, p.q.ref) }; }), tz);
  writeTable_(ss, 'ChoGhepTen', pairs.map(function (p) { return { op: 'del', key: p.q.ref }; }), tz);
}
function diemRow_(row, st, ref) {
  const o = {}; Object.keys(row).forEach(function (k) { o[k] = row[k]; });
  o.name = st.name; o.cls = st.cls || o.cls || ''; o.ref = ref; return o;
}

function sheetId_(s) { const m = /\/d\/([a-zA-Z0-9_-]+)/.exec(s || ''); return m ? m[1] : (/^[a-zA-Z0-9_-]{25,}$/.test(s || '') ? s : ''); }
/** Đọc tab "Bài nộp" (hoặc tab đầu) của file bài nộp: mỗi dòng = {tiêu đề: {v: giá trị, d: chữ hiển thị}}. */
function readSource_(id, tz) {
  const f = SpreadsheetApp.openById(id); const sh = f.getSheetByName('Bài nộp') || f.getSheets()[0];
  const last = sh.getLastRow(), width = sh.getLastColumn(); if (last < 2) return [];
  const rg = sh.getRange(1, 1, last, width); const v = rg.getValues(), dv = rg.getDisplayValues();
  const head = v[0].map(function (h) { return String(h).trim(); }); const out = [];
  for (let i = 1; i < v.length; i++) { const o = {}; head.forEach(function (h, j) { o[h] = { v: v[i][j], d: String(dv[i][j]).trim() }; }); out.push(o); }
  return out;
}
function when_(cell, tz) { // ô thời gian → {key: chuỗi để chống trùng, date: yyyy-mm-dd}
  if (!cell) return null; const v = cell.v;
  if (v instanceof Date) return { key: Utilities.formatDate(v, tz, "yyyy-MM-dd'T'HH:mm:ss"), date: Utilities.formatDate(v, tz, 'yyyy-MM-dd') };
  const p = function (x) { return ('0' + x).slice(-2); };
  const m = /(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(cell.d); if (!m) return null;
  return { key: cell.d, date: m[3] + '-' + p(m[2]) + '-' + p(m[1]) };
}
function txt_(o, k) { return o[k] ? o[k].d : ''; }
function parseBtvn_(o, tz) {
  const w = when_(o['Thời gian nộp'], tz); const name = txt_(o, 'Họ tên'); if (!w || !name) return null;
  const score = txt_(o, 'Điểm'), total = txt_(o, 'Tổng'); const sc = parseFloat(score.replace(',', '.')), tt = parseFloat(total.replace(',', '.'));
  const pending = ['Phần 1', 'Phần 2', 'Phần 3', 'Phần 4', 'Phần 5', 'Phần 6'].some(function (k) { return /chờ chấm/i.test(txt_(o, k)); });
  const wrong = txt_(o, 'Câu sai'); const leaves = parseInt(txt_(o, 'Số lần rời trang'), 10) || 0; const rec = txt_(o, 'Ghi âm');
  const note = [wrong && wrong !== '—' ? 'Câu sai: ' + wrong : '', pending ? 'Còn phần cô chấm' : '', leaves ? 'Rời trang ' + leaves + ' lần' : '',
    /^Có/.test(rec) ? 'Có ghi âm (xem email)' : rec === 'Không ghi âm' ? 'Không nộp ghi âm' : ''].filter(String).join(' · ');
  return { ref: 'BTVN|' + w.key + '|' + norm_(name), typedName: name, typedCls: txt_(o, 'Lớp'), account: accUser_(txt_(o, 'Tài khoản')),
    row: { date: w.date, type: 'HW', test: txt_(o, 'Bài'), score: score, max: total, pct: tt ? Math.round(sc / tt * 100) + '%' : '', ta: 'Online', note: note, res: '' } };
}
function parseSpeaking_(o, tz) {
  const w = when_(o['Thời gian gửi'], tz); const name = txt_(o, 'Họ tên'); if (!w || !name) return null;
  const week = txt_(o, 'Tuần') || 'Tuần ?'; const req = txt_(o, 'Câu bắt buộc đã thu'); const late = txt_(o, 'Nộp muộn');
  return { ref: 'SP|' + norm_(name) + '|' + clsCode_(txt_(o, 'Lớp')) + '|' + norm_(week), typedName: name, typedCls: txt_(o, 'Lớp'), updatable: true,
    row: { date: w.date, type: 'HW', test: 'Speaking – ' + week, score: '', max: '', pct: '', ta: '', res: '',
      note: 'Đã thu ' + (req || '?') + ' câu bắt buộc' + (late ? ' · nộp muộn' : '') + ' · chờ chấm (nghe ghi âm trong email)' } };
}

// ---- khớp tên học sinh tự gõ ----
function norm_(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}
function clsCode_(s) { const m = /([A-Za-z]{2,4})\s*-?\s*(\d{2,3})/.exec(String(s || '')); return m ? (m[1] + m[2]).toUpperCase() : ''; }
/**
 * Khớp theo Tên gọi / Họ tên đầy đủ / tên trong ngoặc / Tên khác (không phân biệt dấu); trùng thì lọc theo lớp.
 * Không khớp thì thử tên riêng trong lớp (VD gõ "Nguyễn Minh An" lớp AB01 → "An 5" nếu lớp đó chỉ có 1 An).
 */
function matcher_(students) {
  const list = students.filter(function (s) { return s.name; }).map(function (s) {
    const plain = String(s.name).replace(/\(.*?\)/g, ' ');
    const keys = [norm_(s.name), norm_(plain), norm_(s.full)];
    (String(s.name).match(/\(([^)]*)\)/g) || []).forEach(function (x) { keys.push(norm_(x)); });
    String(s.alias || '').split(/[,;\n]/).forEach(function (a) { keys.push(norm_(a)); });
    return { s: s, keys: keys.filter(String), given: norm_(plain).split(' ')[0], cls: clsCode_(s.cls), active: !/nghỉ|ngừng/i.test(s.status || '') };
  });
  return function (typedName, typedCls) {
    const n = norm_(typedName), c = clsCode_(typedCls); if (!n) return null;
    let cand = list.filter(function (x) { return x.keys.indexOf(n) >= 0; });
    if (cand.length > 1 && c) cand = cand.filter(function (x) { return x.cls === c; });
    if (cand.length > 1) cand = cand.filter(function (x) { return x.active; });
    if (cand.length === 1) return cand[0].s;
    if (!cand.length && c) {
      const toks = n.split(' ');
      const g = list.filter(function (x) { return x.cls === c && x.active && x.given && toks.indexOf(x.given) >= 0; });
      if (g.length === 1) return g[0].s;
    }
    return null;
  };
}
