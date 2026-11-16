/**
 * Thư viện Yumi – máy chủ cho trang library/ (bảng tài liệu kiểu Padlet).
 * - File lưu trong Google Drive: thư mục "📚 Thư viện Yumi", mỗi pack là 1 thư mục con
 * - Danh sách pack + tài liệu lưu trong Google Sheet "Thư viện Yumi – dữ liệu" (nằm trong thư mục trên)
 * - Không cần mã truy cập: ai có link trang đều xem/đăng được (link không công bố ở đâu)
 *
 * Đây là một dự án Apps Script RIÊNG, không dán chung với Code.gs / Speaking.gs.
 * Cài đặt: xem library/HUONG-DAN.md
 */
const TEACHER_EMAIL = 'tqmai1996@gmail.com';
const ROOT_FOLDER_NAME = '📚 Thư viện Yumi';
const SHEET_TITLE = 'Thư viện Yumi – dữ liệu';
const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20MB mỗi file (giới hạn an toàn của Apps Script)

const PACK_COLS = [
  ['id', 'ID'], ['name', 'Tên pack'], ['emoji', 'Emoji'], ['color', 'Màu'], ['order', 'Thứ tự'],
  ['folderId', 'Thư mục Drive'], ['createdAt', 'Ngày tạo'], ['deleted', 'Đã xóa'],
];
const ITEM_COLS = [
  ['id', 'ID'], ['packId', 'Pack ID'], ['packName', 'Pack'], ['title', 'Tiêu đề'], ['type', 'Loại'],
  ['tags', 'Tag'], ['desc', 'Mô tả / ghi chú'], ['fileId', 'File Drive ID'], ['url', 'Link'],
  ['mime', 'Kiểu file'], ['size', 'Dung lượng (byte)'], ['by', 'Người đăng'], ['createdAt', 'Ngày đăng'],
  ['pinned', 'Ghim'], ['deleted', 'Đã xóa'],
  ['color', 'Màu bài'], // cột mới luôn thêm ở CUỐI để dữ liệu cũ không bị lệch cột
  ['likes', 'Thả tim (ai)'],
];
const COMMENT_COLS = [
  ['id', 'ID'], ['itemId', 'Bài (ID)'], ['by', 'Người viết'], ['text', 'Bình luận'], ['createdAt', 'Thời gian'], ['deleted', 'Đã xóa'],
];
const DEFAULT_COLOR = '#ffd6cc';
const MAX_DESC = 20000;

// Lịch tuần lấy từ file "Quản lý lớp học" (tab Lop + Lich). Để trống = tự tìm file theo tên trong Drive.
const QUAN_LY_SHEET_ID = '';
const QUAN_LY_FILE_NAME = 'Quản lý lớp học';
const TIMEZONE = 'Asia/Ho_Chi_Minh';

/* ───────────────────────── Cài đặt ───────────────────────── */

/** Chạy hàm này 1 lần trong trình soạn thảo: cấp quyền, tạo thư mục + Sheet, gửi email. */
function setup() {
  const root = root_();
  const ss = ss_();
  table_(ss, 'PACKS', PACK_COLS);
  table_(ss, 'ITEMS', ITEM_COLS);
  table_(ss, 'COMMENTS', COMMENT_COLS);
  MailApp.sendEmail(TEACHER_EMAIL, 'Thư viện Yumi: cài đặt thành công ✅',
    'Máy chủ Thư viện Yumi đã sẵn sàng.\n\n' +
    '📁 Thư mục Drive chứa file: ' + root.getUrl() + '\n' +
    '📊 Bảng dữ liệu: ' + ss.getUrl());
  Logger.log('Thư mục: ' + root.getUrl());
  Logger.log('Sheet: ' + ss.getUrl());
}

/* ───────────────────────── Web app ───────────────────────── */

function doGet() {
  return ContentService.createTextOutput('Thư viện Yumi: máy chủ đang hoạt động ✅');
}

function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (_) { return json_({ ok: false, error: 'Dữ liệu gửi lên không hợp lệ' }); }
  try {
    const action = String(d.action || '');
    if (action === 'list') return json_({ ok: true, data: snapshot_() });
    const fn = ACTIONS[action];
    if (!fn) return json_({ ok: false, error: 'Thao tác không hợp lệ: ' + action });

    const lock = LockService.getScriptLock();
    lock.waitLock(25000);
    try {
      const extra = fn(d) || {};
      return json_(Object.assign({ ok: true, data: snapshot_() }, extra));
    } finally {
      try { lock.releaseLock(); } catch (_) {}
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

const ACTIONS = {
  createPack: createPack_,
  updatePack: updatePack_,
  deletePack: deletePack_,
  orderPacks: orderPacks_,
  upload: upload_,
  addLink: addLink_,
  addNote: addNote_,
  updateItem: updateItem_,
  deleteItem: deleteItem_,
  toggleLike: toggleLike_,
  addComment: addComment_,
  deleteComment: deleteComment_,
  syncSchedule: function () { const r = syncSchedule_(); return { msg: r }; },
};

/* ───────────────────────── Pack ───────────────────────── */

function createPack_(d) {
  const name = str_(d.name, 60).trim();
  if (!name) throw new Error('Chưa nhập tên pack');
  const t = load_('PACKS', PACK_COLS);
  const live = t.rows.filter(p => !p.deleted);
  if (live.some(p => p.name.toLowerCase() === name.toLowerCase())) throw new Error('Đã có pack tên "' + name + '"');
  const folder = root_().createFolder(name);
  const pack = {
    id: newId_(), name: name, emoji: emoji_(d.emoji), color: color_(d.color),
    order: live.reduce((m, p) => Math.max(m, Number(p.order) || 0), 0) + 1,
    folderId: folder.getId(), createdAt: new Date(), deleted: false,
  };
  append_(t, pack);
  return { id: pack.id };
}

function updatePack_(d) {
  const t = load_('PACKS', PACK_COLS);
  const p = find_(t, d.id);
  if (d.name != null) {
    const name = str_(d.name, 60).trim();
    if (!name) throw new Error('Chưa nhập tên pack');
    if (t.rows.some(x => !x.deleted && x.id !== p.id && x.name.toLowerCase() === name.toLowerCase())) throw new Error('Đã có pack tên "' + name + '"');
    if (name !== p.name) {
      p.name = name;
      try { packFolder_(p, t).setName(name); } catch (_) {}
      // cập nhật cột "Pack" trong ITEMS cho dễ đọc
      const it = load_('ITEMS', ITEM_COLS);
      it.rows.filter(i => i.packId === p.id).forEach(i => { i.packName = name; save_(it, i); });
    }
  }
  if (d.emoji != null) p.emoji = emoji_(d.emoji);
  if (d.color != null) p.color = color_(d.color);
  save_(t, p);
}

function deletePack_(d) {
  const t = load_('PACKS', PACK_COLS);
  const p = find_(t, d.id);
  const it = load_('ITEMS', ITEM_COLS);
  if (it.rows.some(i => i.packId === p.id && !i.deleted)) throw new Error('Pack còn tài liệu. Hãy xóa hoặc chuyển hết tài liệu sang pack khác trước.');
  p.deleted = true;
  save_(t, p);
  try { DriveApp.getFolderById(p.folderId).setTrashed(true); } catch (_) {}
}

function orderPacks_(d) {
  if (!Array.isArray(d.ids)) throw new Error('Thiếu thứ tự pack');
  const t = load_('PACKS', PACK_COLS);
  d.ids.slice(0, 500).forEach((id, i) => {
    const p = t.rows.find(x => x.id === String(id));
    if (p && Number(p.order) !== i + 1) { p.order = i + 1; save_(t, p); }
  });
}

/* ───────────────────────── Tài liệu ───────────────────────── */

function upload_(d) {
  const packs = load_('PACKS', PACK_COLS);
  const pack = livePack_(packs, d.packId);
  const f = saveFile_(d, pack, packs);
  const item = baseItem_(d, pack, 'file');
  item.title = str_(d.title, 150).trim() || f.name.replace(/\.[^.]+$/, '');
  item.fileId = f.id;
  item.url = f.url;
  item.mime = f.mime;
  item.size = f.size;
  append_(load_('ITEMS', ITEM_COLS), item);
  return { id: item.id };
}

function addLink_(d) {
  const pack = livePack_(load_('PACKS', PACK_COLS), d.packId);
  const url = str_(d.url, 2000).trim();
  if (!/^https?:\/\/\S+$/i.test(url)) throw new Error('Link phải bắt đầu bằng http:// hoặc https://');
  const item = baseItem_(d, pack, 'link');
  item.url = url;
  item.title = str_(d.title, 150).trim() || url.replace(/^https?:\/\/(www\.)?/i, '').slice(0, 150);
  const m = url.match(/(?:\/d\/|[?&]id=)([\w-]{20,})/); // link Google Drive/Docs → để hiện ảnh xem trước
  if (m && /google\.com/i.test(url)) item.fileId = m[1];
  append_(load_('ITEMS', ITEM_COLS), item);
  return { id: item.id };
}

function addNote_(d) {
  // Không có packId → ghi chú tự do trên bảng Ghi chú (không thuộc pack nào)
  const pack = d.packId ? livePack_(load_('PACKS', PACK_COLS), d.packId) : null;
  const item = baseItem_(d, pack, 'note');
  if (!item.desc && !str_(d.title, 150).trim()) throw new Error('Ghi chú đang trống');
  item.title = str_(d.title, 150).trim();
  append_(load_('ITEMS', ITEM_COLS), item);
  return { id: item.id };
}

function updateItem_(d) {
  const t = load_('ITEMS', ITEM_COLS);
  const it = find_(t, d.id);
  if (it.deleted) throw new Error('Tài liệu đã bị xóa');
  if (d.title != null) it.title = str_(d.title, 150).trim() || it.title;
  if (d.desc != null) it.desc = str_(d.desc, MAX_DESC).trim();
  if (d.tags != null) it.tags = tags_(d.tags);
  if (d.pinned != null) it.pinned = !!d.pinned;
  if (d.color != null) it.color = itemColor_(d.color);
  if (d.packId === '' && it.packId !== '') { // chuyển ra bảng Ghi chú (chỉ ghi chú / link / lịch, không phải file)
    if (it.type === 'file') throw new Error('Bài có file không chuyển thành ghi chú được');
    it.packId = ''; it.packName = 'Ghi chú';
  } else if (d.packId && String(d.packId) !== it.packId) {
    const packs = load_('PACKS', PACK_COLS);
    const pack = livePack_(packs, d.packId);
    if (it.type === 'file' && it.fileId) {
      try { DriveApp.getFileById(it.fileId).moveTo(packFolder_(pack, packs)); } catch (_) {}
    }
    it.packId = pack.id;
    it.packName = pack.name;
  }
  // Đổi đính kèm: attach = 'none' (gỡ) | 'link' (gắn/đổi link) | 'file' (thay bằng file mới, gửi kèm b64)
  const attach = String(d.attach || '');
  if (attach === 'none' || attach === 'link' || attach === 'file') {
    const oldFile = it.type === 'file' ? it.fileId : '';
    if (attach === 'file') {
      const packs = load_('PACKS', PACK_COLS);
      const f = saveFile_(d, livePack_(packs, it.packId), packs);
      it.type = 'file'; it.fileId = f.id; it.url = f.url; it.mime = f.mime; it.size = f.size;
      if (!str_(d.title, 150).trim()) it.title = f.name.replace(/\.[^.]+$/, '');
    } else if (attach === 'link') {
      const url = str_(d.url, 2000).trim();
      if (!/^https?:\/\/\S+$/i.test(url)) throw new Error('Link phải bắt đầu bằng http:// hoặc https://');
      const m = url.match(/(?:\/d\/|[?&]id=)([\w-]{20,})/);
      it.type = 'link'; it.url = url; it.fileId = m && /google\.com/i.test(url) ? m[1] : ''; it.mime = ''; it.size = '';
    } else {
      it.type = 'note'; it.url = ''; it.fileId = ''; it.mime = ''; it.size = '';
    }
    // file cũ do trang tải lên → bỏ vào Thùng rác Drive (khôi phục được 30 ngày)
    if (oldFile && oldFile !== it.fileId) { try { DriveApp.getFileById(oldFile).setTrashed(true); } catch (_) {} }
  } else if (d.url != null && it.type === 'link') {
    const url = str_(d.url, 2000).trim();
    if (!/^https?:\/\/\S+$/i.test(url)) throw new Error('Link phải bắt đầu bằng http:// hoặc https://');
    it.url = url;
  }
  save_(t, it);
}

/** Lưu 1 file (base64) vào thư mục của pack, chia sẻ "ai có link đều xem". */
function saveFile_(d, pack, packs) {
  if (typeof d.b64 !== 'string' || !d.b64) throw new Error('Thiếu nội dung file');
  if (d.b64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 + 8) throw new Error('File quá lớn (tối đa 20MB). Hãy tải lên Drive rồi dán link.');
  const name = str_(d.name, 150).replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'file';
  let mime = str_(d.mime, 120).split(';')[0].trim();
  if (!/^[\w.+-]+\/[\w.+-]+$/.test(mime)) mime = 'application/octet-stream';
  const bytes = Utilities.base64Decode(d.b64);
  const file = packFolder_(pack, packs).createFile(Utilities.newBlob(bytes, mime, name));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (_) {}
  return { id: file.getId(), url: file.getUrl(), mime: mime, size: bytes.length, name: name };
}

function deleteItem_(d) {
  const t = load_('ITEMS', ITEM_COLS);
  const it = find_(t, d.id);
  it.deleted = true;
  save_(t, it);
  // Chỉ bỏ vào Thùng rác file do trang này tải lên; link Drive dán vào thì không động tới.
  if (it.type === 'file' && it.fileId) {
    try { DriveApp.getFileById(it.fileId).setTrashed(true); } catch (_) {}
  }
}

/* ───────────────────────── Thả tim + bình luận ───────────────────────── */

function toggleLike_(d) {
  const who = str_(d.who, 30).trim();
  if (!who) throw new Error('Chưa chọn người dùng');
  const t = load_('ITEMS', ITEM_COLS);
  const it = find_(t, d.id);
  const list = String(it.likes || '').split(',').map(s => s.trim()).filter(Boolean);
  const i = list.indexOf(who);
  if (i >= 0) list.splice(i, 1); else list.push(who);
  it.likes = list.join(', ');
  save_(t, it);
}

function addComment_(d) {
  const who = str_(d.who, 30).trim();
  const text = str_(d.text, 5000).trim();
  if (!who) throw new Error('Chưa chọn người dùng');
  if (!text) throw new Error('Bình luận đang trống');
  const it = find_(load_('ITEMS', ITEM_COLS), d.itemId);
  if (it.deleted) throw new Error('Bài đã bị xóa');
  append_(load_('COMMENTS', COMMENT_COLS), { id: newId_(), itemId: it.id, by: who, text: text, createdAt: new Date(), deleted: false });
}

function deleteComment_(d) {
  const t = load_('COMMENTS', COMMENT_COLS);
  const c = find_(t, d.id);
  c.deleted = true;
  save_(t, c);
}

/* ───────────────────────── Lịch tuần (từ file Quản lý lớp học) ───────────────────────── */

/** Chạy hàm này 1 lần trong trình soạn thảo: cấp quyền, đồng bộ ngay, và hẹn giờ tự đồng bộ 2 ngày/lần. */
function enableScheduleSync() {
  ScriptApp.getProjectTriggers().forEach(tr => { if (tr.getHandlerFunction() === 'syncSchedule') ScriptApp.deleteTrigger(tr); });
  ScriptApp.newTrigger('syncSchedule').timeBased().everyDays(2).atHour(6).inTimezone(TIMEZONE).create();
  const msg = syncSchedule();
  Logger.log(msg + '\nĐã bật tự đồng bộ: 2 ngày/lần, khoảng 6–7 giờ sáng.');
  return msg;
}

/** Hẹn giờ gọi hàm này. */
function syncSchedule() {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return syncSchedule_(); } finally { try { lock.releaseLock(); } catch (_) {} }
}

function quanLy_() {
  const props = PropertiesService.getScriptProperties();
  const id = QUAN_LY_SHEET_ID || props.getProperty('QL_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (_) {} }
  const files = DriveApp.searchFiles('title = "' + QUAN_LY_FILE_NAME + '" and mimeType = "application/vnd.google-apps.spreadsheet" and trashed = false');
  while (files.hasNext()) {
    const f = files.next();
    const ss = SpreadsheetApp.openById(f.getId());
    if (ss.getSheetByName('Lich') && ss.getSheetByName('Lop')) { props.setProperty('QL_ID', f.getId()); return ss; }
  }
  throw new Error('Không tìm thấy file "' + QUAN_LY_FILE_NAME + '" (có tab Lich và Lop). Dán ID file vào QUAN_LY_SHEET_ID ở đầu Library.gs.');
}

/** Đọc 1 tab theo tên cột tiêu đề → mảng object {tên cột: chữ hiển thị}. */
function readByHeader_(sh) {
  const last = sh.getLastRow(), width = sh.getLastColumn();
  if (last < 2 || !width) return [];
  const rg = sh.getRange(1, 1, last, width);
  const v = rg.getValues(), dv = rg.getDisplayValues();
  const head = dv[0].map(s => String(s).trim());
  const out = [];
  for (let i = 1; i < v.length; i++) {
    const o = {};
    head.forEach((h, j) => { o[h] = v[i][j] instanceof Date ? v[i][j] : String(dv[i][j]).trim(); });
    out.push(o);
  }
  return out;
}

function ymd_(x) {
  if (x instanceof Date) return Utilities.formatDate(x, TIMEZONE, 'yyyy-MM-dd');
  const s = String(x || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return m[3] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2);
  return '';
}
function hm_(x) {
  if (x instanceof Date) return Utilities.formatDate(x, TIMEZONE, 'HH:mm');
  const m = String(x || '').match(/(\d{1,2}):(\d{2})/);
  return m ? ('0' + m[1]).slice(-2) + ':' + m[2] : '';
}

function syncSchedule_() {
  const ql = quanLy_();
  const classes = {};
  readByHeader_(ql.getSheetByName('Lop')).forEach(r => {
    const code = String(r['Mã lớp'] || '').trim();
    if (code) classes[code] = { bg: r['Màu nền'] || '', fg: r['Màu chữ'] || '', emo: r['Sticker'] || '' };
  });
  // Lưu 14 ngày (tuần này + tuần sau). Trang chỉ hiện tuần chứa ngày hôm nay, nên sang tuần mới
  // vẫn đúng lịch dù lần đồng bộ kế tiếp chưa tới (2 ngày/lần).
  const today = Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  const base = new Date(today + 'T12:00:00Z');
  const mon = new Date(base.getTime() - ((base.getUTCDay() + 6) % 7) * 864e5);
  const days = [];
  for (let i = 0; i < 14; i++) days.push({ date: new Date(mon.getTime() + i * 864e5).toISOString().slice(0, 10), list: [] });
  readByHeader_(ql.getSheetByName('Lich')).forEach(r => {
    const date = ymd_(r['Ngày']);
    const day = days.find(x => x.date === date);
    const cls = String(r['Lớp'] || '').trim();
    if (day && cls) day.list.push({ time: hm_(r['Giờ bắt đầu']), cls: cls, dur: Number(r['Số phút']) || 0 });
  });
  days.forEach(d => d.list.sort((a, b) => a.time.localeCompare(b.time)));
  const used = {};
  days.forEach(d => d.list.forEach(x => { if (classes[x.cls]) used[x.cls] = classes[x.cls]; }));
  PropertiesService.getScriptProperties().setProperty('CLASSES', JSON.stringify(classes));

  const data = { mon: days[0].date, sun: days[6].date, days: days, classes: used, syncedAt: new Date().toISOString() };
  const ddmm = s => s.slice(8, 10) + '/' + s.slice(5, 7);
  const title = 'Lịch dạy tuần ' + ddmm(data.mon) + ' – ' + ddmm(data.sun);

  // Ghi vào 1 bài cố định (loại "schedule"); chưa có thì tạo trên bảng Ghi chú
  const props = PropertiesService.getScriptProperties();
  const t = load_('ITEMS', ITEM_COLS);
  let it = t.rows.find(r => r.id === props.getProperty('SCHEDULE_ITEM_ID') && !r.deleted && r.type === 'schedule');
  if (!it) it = t.rows.find(r => r.type === 'schedule' && !r.deleted);
  if (it) {
    it.title = title; it.desc = JSON.stringify(data);
    save_(t, it);
  } else {
    it = baseItem_({ who: 'Tự động', pinned: true }, null, 'schedule'); // nằm trên bảng Ghi chú
    it.title = title; it.desc = JSON.stringify(data);
    append_(t, it);
  }
  props.setProperty('SCHEDULE_ITEM_ID', it.id);
  const n = days.slice(0, 7).reduce((s, d) => s + d.list.length, 0);
  return 'Đã đồng bộ ' + title + ': ' + n + ' buổi (kèm sẵn lịch tuần sau).';
}

function baseItem_(d, pack, type) {
  // createdAt chỉ dùng khi chép bài cũ sang (giữ ngày gốc); không nhận ngày trong tương lai
  const at = d.createdAt ? new Date(d.createdAt) : null;
  return {
    id: newId_(), packId: pack ? pack.id : '', packName: pack ? pack.name : 'Ghi chú', title: '', type: type,
    tags: tags_(d.tags), desc: str_(d.desc, MAX_DESC).trim(), fileId: '', url: '', mime: '', size: '',
    by: str_(d.who, 30).trim() || '?', createdAt: at && !isNaN(at) && at <= new Date() ? at : new Date(),
    pinned: !!d.pinned, deleted: false, color: itemColor_(d.color),
  };
}

/* ───────────────────────── Dữ liệu trả về trang ───────────────────────── */

function snapshot_() {
  const packs = load_('PACKS', PACK_COLS).rows.filter(p => !p.deleted)
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map(p => ({ id: p.id, name: p.name, emoji: p.emoji, color: p.color, order: Number(p.order) || 0 }));
  const items = load_('ITEMS', ITEM_COLS).rows.filter(i => !i.deleted && i.id)
    .map(i => ({
      id: i.id, packId: i.packId, title: i.title, type: i.type, tags: i.tags, desc: i.desc,
      fileId: i.fileId, url: i.url, mime: i.mime, size: Number(i.size) || 0, by: i.by,
      createdAt: i.createdAt, pinned: !!i.pinned, color: i.color || '',
      likes: String(i.likes || '').split(',').map(s => s.trim()).filter(Boolean),
    }));
  const live = {};
  items.forEach(i => { live[i.id] = true; });
  const comments = load_('COMMENTS', COMMENT_COLS).rows.filter(c => !c.deleted && live[c.itemId])
    .map(c => ({ id: c.id, itemId: c.itemId, by: c.by, text: c.text, createdAt: c.createdAt }));
  let classes = {};
  try { classes = JSON.parse(PropertiesService.getScriptProperties().getProperty('CLASSES') || '{}'); } catch (_) {}
  return { ver: 3, packs: packs, items: items, comments: comments, classes: classes };
}

/* ───────────────────────── Drive + Sheet ───────────────────────── */

function root_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('ROOT_ID');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (_) {} }
  const f = DriveApp.createFolder(ROOT_FOLDER_NAME);
  props.setProperty('ROOT_ID', f.getId());
  return f;
}

function ss_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (_) {} }
  const ss = SpreadsheetApp.create(SHEET_TITLE);
  props.setProperty('SHEET_ID', ss.getId());
  try { DriveApp.getFileById(ss.getId()).moveTo(root_()); } catch (_) {}
  return ss;
}

function table_(ss, name, cols) {
  let sh = ss.getSheetByName(name);
  if (!sh) {
    const first = ss.getSheets()[0];
    if (ss.getSheets().length === 1 && first.getLastRow() === 0 && !/^(PACKS|ITEMS)$/.test(first.getName())) {
      sh = first.setName(name);
    } else {
      sh = ss.insertSheet(name);
    }
    sh.setFrozenRows(1);
  }
  const head = cols.map(c => c[1]);
  const cur = sh.getRange(1, 1, 1, head.length).getValues()[0];
  if (cur.join('|') !== head.join('|')) {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold').setBackground('#ffe1d6');
  }
  return sh;
}

/** Đọc cả bảng thành mảng object; mỗi object nhớ số dòng (_row) để ghi lại. */
function load_(name, cols) {
  const sh = table_(ss_(), name, cols);
  const n = sh.getLastRow() - 1;
  const vals = n > 0 ? sh.getRange(2, 1, n, cols.length).getValues() : [];
  const rows = vals.map((v, i) => {
    const o = { _row: i + 2 };
    cols.forEach((c, j) => {
      const x = v[j];
      o[c[0]] = x instanceof Date ? x.toISOString() : (typeof x === 'boolean' || typeof x === 'number') ? x : String(x);
    });
    o.deleted = o.deleted === true || o.deleted === 'TRUE';
    if ('pinned' in o) o.pinned = o.pinned === true || o.pinned === 'TRUE';
    return o;
  });
  return { sh: sh, cols: cols, rows: rows };
}

function toCells_(t, o) {
  return t.cols.map(c => {
    const v = o[c[0]];
    if (v == null) return '';
    if (v instanceof Date || typeof v === 'boolean' || typeof v === 'number') return v;
    const s = String(v);
    if (c[0] === 'createdAt' && /^\d{4}-\d\d-\d\dT/.test(s)) return new Date(s);
    return s ? "'" + s : ''; // dấu ' giữ nguyên chữ (không biến thành ngày/công thức)
  });
}

function append_(t, o) {
  t.sh.appendRow(toCells_(t, o));
}

function save_(t, o) {
  t.sh.getRange(o._row, 1, 1, t.cols.length).setValues([toCells_(t, o)]);
}

function find_(t, id) {
  const o = t.rows.find(r => r.id === String(id || ''));
  if (!o) throw new Error('Không tìm thấy (có thể đã bị xóa). Bấm 🔄 để tải lại.');
  return o;
}

function livePack_(t, id) {
  const p = find_(t, id);
  if (p.deleted) throw new Error('Pack đã bị xóa. Bấm 🔄 để tải lại.');
  return p;
}

function packFolder_(p, t) {
  try {
    const f = DriveApp.getFolderById(p.folderId);
    if (!f.isTrashed()) return f;
  } catch (_) {}
  const f = root_().createFolder(p.name); // thư mục bị xóa tay → tạo lại
  p.folderId = f.getId();
  save_(t, p);
  return f;
}

/* ───────────────────────── Tiện ích ───────────────────────── */

function str_(v, max) { return String(v == null ? '' : v).slice(0, max); }
function newId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function emoji_(v) { return str_(v, 16).trim() || '📦'; }
function color_(v) { const s = str_(v, 7); return /^#[0-9a-f]{6}$/i.test(s) ? s : DEFAULT_COLOR; }
function itemColor_(v) { const s = str_(v, 7); return /^#[0-9a-f]{6}$/i.test(s) ? s : ''; } // '' = bài màu trắng
function tags_(v) {
  const list = Array.isArray(v) ? v : String(v || '').split(/[,#\n]/);
  const seen = {};
  return list.map(x => String(x).trim().replace(/\s+/g, ' ').slice(0, 40)).filter(x => {
    const k = x.toLowerCase();
    if (!x || seen[k]) return false;
    seen[k] = true;
    return true;
  }).slice(0, 15).join(', ');
}
function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
