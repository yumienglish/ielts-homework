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
];
const DEFAULT_COLOR = '#ffd6cc';
const MAX_DESC = 20000;

/* ───────────────────────── Cài đặt ───────────────────────── */

/** Chạy hàm này 1 lần trong trình soạn thảo: cấp quyền, tạo thư mục + Sheet, gửi email. */
function setup() {
  const root = root_();
  const ss = ss_();
  table_(ss, 'PACKS', PACK_COLS);
  table_(ss, 'ITEMS', ITEM_COLS);
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
  if (typeof d.b64 !== 'string' || !d.b64) throw new Error('Thiếu nội dung file');
  if (d.b64.length > Math.ceil(MAX_FILE_BYTES / 3) * 4 + 8) throw new Error('File quá lớn (tối đa 20MB). Hãy tải lên Drive rồi dán link.');
  const name = str_(d.name, 150).replace(/[\\/:*?"<>|]+/g, ' ').trim() || 'file';
  let mime = str_(d.mime, 120).split(';')[0].trim();
  if (!/^[\w.+-]+\/[\w.+-]+$/.test(mime)) mime = 'application/octet-stream';
  const bytes = Utilities.base64Decode(d.b64);
  const file = packFolder_(pack, packs).createFile(Utilities.newBlob(bytes, mime, name));
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (_) {}
  const item = baseItem_(d, pack, 'file');
  item.title = str_(d.title, 150).trim() || name.replace(/\.[^.]+$/, '');
  item.fileId = file.getId();
  item.url = file.getUrl();
  item.mime = mime;
  item.size = bytes.length;
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
  const pack = livePack_(load_('PACKS', PACK_COLS), d.packId);
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
  if (d.url != null && it.type === 'link') {
    const url = str_(d.url, 2000).trim();
    if (!/^https?:\/\/\S+$/i.test(url)) throw new Error('Link phải bắt đầu bằng http:// hoặc https://');
    it.url = url;
  }
  if (d.packId != null && String(d.packId) !== it.packId) {
    const packs = load_('PACKS', PACK_COLS);
    const pack = livePack_(packs, d.packId);
    if (it.type === 'file' && it.fileId) {
      try { DriveApp.getFileById(it.fileId).moveTo(packFolder_(pack, packs)); } catch (_) {}
    }
    it.packId = pack.id;
    it.packName = pack.name;
  }
  save_(t, it);
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

function baseItem_(d, pack, type) {
  // createdAt chỉ dùng khi chép bài cũ sang (giữ ngày gốc); không nhận ngày trong tương lai
  const at = d.createdAt ? new Date(d.createdAt) : null;
  return {
    id: newId_(), packId: pack.id, packName: pack.name, title: '', type: type,
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
    }));
  return { packs: packs, items: items };
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
