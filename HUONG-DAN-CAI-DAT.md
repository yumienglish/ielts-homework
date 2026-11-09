# Hướng dẫn cài đặt trang bài tập về nhà

Có 2 phần: **(A) máy chủ nhận bài** bằng Google Apps Script, dùng để gửi email cho cô và lưu vào Google Sheet; **(B) đăng trang web** lên GitHub Pages.

---

## A. Cài máy chủ nhận bài (Google Apps Script), làm 1 lần, khoảng 5 phút

1. Đăng nhập Gmail **tqmai1996@gmail.com**, rồi mở <https://script.google.com> và bấm **New project** (Dự án mới).
2. Xóa hết code mẫu, dán toàn bộ nội dung file [`apps-script/Code.gs`](apps-script/Code.gs) vào, rồi bấm 💾 **Save**. Đặt tên dự án, ví dụ `BTVN`.
3. Cấp quyền:
   - Ở thanh trên, chọn hàm **`setup`** rồi bấm **▶ Run**.
   - Google hỏi quyền: bấm **Review permissions**, chọn tài khoản, rồi **Advanced** → **Go to BTVN (unsafe)** → **Allow**.
     (Cảnh báo "unsafe" là bình thường vì đây là script của chính cô.)
   - Hộp thư sẽ nhận email **"BTVN: cài đặt thành công ✅"** kèm link Google Sheet tổng hợp.
4. Deploy (xuất bản):
   - Bấm **Deploy** → **New deployment** → bánh răng ⚙ → chọn **Web app**.
   - **Execute as:** `Me (tqmai1996@gmail.com)`
   - **Who has access:** `Anyone` (bắt buộc, để học sinh không cần đăng nhập vẫn nộp được)
   - Bấm **Deploy** rồi **copy Web app URL** (dạng `https://script.google.com/macros/s/AKfy…/exec`).
5. Mở file `unit-02-present-simple/index.html`, tìm dòng:
   ```js
   const SCRIPT_URL = 'PASTE_APPS_SCRIPT_URL_HERE';
   ```
   rồi thay bằng URL vừa copy (giữ nguyên dấu nháy).

> Nếu sau này sửa `Code.gs`, cần vào **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** để bản mới có hiệu lực. URL không đổi.

## B. Đăng trang lên GitHub Pages

1. Tạo repo mới trên GitHub, ví dụ `btvn`, để chế độ **Public**.
2. Push thư mục `d:\Syllabus` lên repo đó.
3. Trên GitHub, vào repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` / `(root)` → **Save**.
4. Sau 1–2 phút, trang có địa chỉ:
   - Mục lục: `https://<tên-github>.github.io/btvn/`
   - Bài Unit 2: `https://<tên-github>.github.io/btvn/unit-02-present-simple/`

Gửi link bài Unit 2 cho học sinh là xong.

---

## Học sinh làm bài thế nào?

1. Nhập họ tên và lớp.
2. Làm 5 bài. Bài làm tự lưu trên máy, lỡ tắt trình duyệt cũng không mất.
3. Bấm **Nộp bài ✔**. Trang hiện điểm, đáp án và giải thích từng câu, đồng thời gửi bài về Gmail của cô.
4. Nộp xong thì không sửa được nữa. Nếu mạng lỗi, trang hiện nút **Gửi lại**.

## Cô nhận được gì?

- **Email** tiêu đề dạng `[BTVN Unit 2] Nguyễn Minh Anh – 7A – 27/31`, có bảng từng câu: học sinh trả lời gì, đáp án, đúng/sai.
- **Google Sheet** "BTVN – Bài nộp của học sinh": mỗi lần nộp là 1 dòng (thời gian, tên, lớp, điểm từng bài, danh sách câu sai).

## Muốn cho một học sinh làm lại?

Bài làm được lưu trong trình duyệt của học sinh. Học sinh mở trang bằng **cửa sổ ẩn danh** hoặc xóa dữ liệu trang web là làm lại được từ đầu.
