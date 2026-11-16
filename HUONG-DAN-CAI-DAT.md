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
5. Mở từng file bài tập (`unit-01-ms-foundation-ls/index.html`, `grammar/index.html`), tìm dòng:
   ```js
   const SCRIPT_URL = 'PASTE_APPS_SCRIPT_URL_HERE';
   ```
   rồi thay bằng URL vừa copy (giữ nguyên dấu nháy).

> Nếu sau này sửa `Code.gs`, cần vào **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy** để bản mới có hiệu lực. URL không đổi.

> **Cập nhật cho Unit 1 (có ghi âm):** `Code.gs` đã được sửa để nhận file ghi âm và đính kèm vào email. Cô dán lại toàn bộ `Code.gs` mới vào Apps Script, bấm 💾 Save, rồi làm bước **New version → Deploy** ở trên. Không cần cấp thêm quyền. Google Sheet sẽ tự đổi tiêu đề cột thành `Phần 1…Phần 5` và thêm 2 cột cuối là `Phần 6` và `Ghi âm`. Các dòng cũ của bài Grammar giữ nguyên.

> **Cập nhật "Nộp 2 lần" (11/2026):** học sinh nộp lần 1, sửa câu sai, rồi nộp lần 2. Cô dán lại toàn bộ `Code.gs` mới vào Apps Script, bấm 💾 Save, rồi làm **New version → Deploy**, và **làm bước này TRƯỚC khi đăng các trang mới**. Sheet tự thêm 6 cột cuối: `Mã lần nộp`, `Điểm lần 2`, `Câu sai lần 2`, `Nộp lần 2 lúc`, `Thời gian làm lần 2`, `Rời trang lần 2`. Lần 2 được điền vào **cùng dòng** với lần 1. Cột `Điểm` vẫn là điểm lần 1, và web app quản lý lớp vẫn lấy cột này.

## B. Đăng trang lên GitHub Pages

1. Tạo repo mới trên GitHub, ví dụ `btvn`, để chế độ **Public**.
2. Push thư mục `d:\Syllabus` lên repo đó.
3. Trên GitHub, vào repo → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` / `(root)` → **Save**.
4. Sau 1–2 phút, trang có địa chỉ (repo `ielts-homework` của tổ chức `yumienglish`; các link cũ `miathoday.github.io/…` vẫn tự chuyển sang link mới):
   - Mục lục **Homework - IELTS Foundation. Pack 1**: <https://yumienglish.github.io/ielts-homework/>
   - Unit 1 · MS Foundation: <https://yumienglish.github.io/ielts-homework/unit-01-ms-foundation-ls/>
   - Grammar · Present Simple: <https://yumienglish.github.io/ielts-homework/grammar/>
   - Basic Listening · Letters: <https://yumienglish.github.io/ielts-homework/basic-listening-letters/>. Đáp án nằm ở hằng số `KEY` đầu phần script trong `basic-listening-letters/index.html`; ô nào để trống thì câu đó hiện "cô chấm sau".
   - Link cũ `…/unit-02-present-simple/` vẫn dùng được, trang sẽ tự chuyển sang `…/grammar/`.

Gửi link mục lục cho học sinh là tiện nhất: các em tự chọn bài, mỗi trang bài tập đều có nút **← Homework · IELTS Foundation · Pack 1** để quay về mục lục.

> Ghi âm (Unit 1, Exercise 8) chỉ chạy khi trang mở qua **https** (GitHub Pages đã có sẵn https). Học sinh dùng Chrome trên Android hoặc máy tính, Safari trên iPhone hoặc iPad. Lần đầu bấm ghi âm, trình duyệt hỏi quyền micro, học sinh bấm **Cho phép**.

---

## Học sinh làm bài thế nào?

1. Nhập họ tên và lớp.
2. Làm 5 bài. Bài làm tự lưu trên máy, lỡ tắt trình duyệt cũng không mất.
3. Bấm **Nộp bài ✔** (lần 1). Trang hiện điểm lần 1 và gửi bài về Gmail của cô (mail 1, kèm ghi âm nếu có).
   Câu đúng tô xanh và bị khoá. Câu sai tô đỏ, có 💡 gợi ý nhưng **chưa hiện đáp án**.
4. Học sinh sửa các câu sai rồi bấm **Nộp lần 2 ✔**. Trang hiện đáp án, giải thích và điểm "Lần 1 → Lần 2", rồi gửi mail 2 cho cô.
   Chỉ được sửa 1 lần. Ghi âm chỉ nộp ở lần 1. Nếu đúng hết ngay lần 1 thì không có lần 2.
5. Nếu mạng lỗi, trang hiện nút **Gửi lại**. Mở lại trang thì bài chưa gửi xong sẽ tự gửi tiếp.

## Cô nhận được gì?

- **Email 1** (sau lần 1), tiêu đề dạng `[BTVN Grammar] Nguyễn Minh Anh – 7A – Lần 1: 27/31`, có bảng từng câu: học sinh trả lời gì, đáp án, đúng/sai, thời gian làm bài, số lần rời trang.
- **Email 2** (sau lần 2), tiêu đề dạng `… – Lần 1: 27/31 → Lần 2: 29/31`, có bảng so sánh lần 1 và lần 2 (điểm, giờ bắt đầu / nộp, thời gian làm, số lần rời trang). Từng câu có cột Lần 1, Lần 2, Đáp án và dấu ✅ đúng ngay / ❌→✅ sửa đúng / ❌❌ sai cả 2 lần.
  Với Unit 1, nếu học sinh có ghi âm thì tiêu đề có thêm 🎙 và **file ghi âm được đính kèm** ở cuối email (bấm vào là nghe được).
- **Google Sheet** "BTVN – Bài nộp của học sinh": mỗi lần nộp là 1 dòng (thời gian, tên, lớp, điểm từng bài, danh sách câu sai).

---

## C. Speaking 10 tuần (`speaking-10-weeks/`), máy chủ riêng

Trang luyện Speaking dùng **một dự án Apps Script riêng**, có Google Sheet riêng, không dùng chung với `Code.gs`.

1. Đăng nhập **tqmai1996@gmail.com**, mở <https://script.google.com>, bấm **New project**. Đặt tên, ví dụ `Speaking 10 tuần`.
2. Xóa code mẫu, dán toàn bộ [`apps-script/Speaking.gs`](apps-script/Speaking.gs), rồi bấm 💾 **Save**.
3. Chọn hàm **`setup`** rồi bấm **▶ Run**, sau đó cấp quyền giống phần A. Hộp thư nhận email **"Speaking 10 tuần: cài đặt thành công ✅"** kèm link Sheet **"Speaking 10 tuần – Bài nộp"**.
4. **Deploy → New deployment → Web app**. *Execute as:* `Me`, *Who has access:* `Anyone`. Bấm **Deploy** rồi copy **Web app URL**.
5. Mở `speaking-10-weeks/app.js`, sửa dòng đầu:
   ```js
   const SCRIPT_URL = 'PASTE_SPEAKING_SCRIPT_URL_HERE';
   ```
   thay bằng URL vừa copy, rồi push lên GitHub.
6. Link cho học sinh: <https://yumienglish.github.io/ielts-homework/speaking-10-weeks/>

**Lịch:** Tuần 1 bắt đầu Thứ Ba 10/11/2026. Mỗi tuần mở vào Thứ Ba và có deadline vào Thứ Hai tuần sau. Tuần chưa tới thì bị khóa. Muốn dời cả lịch, chỉ cần sửa `START_DATE` ở đầu `app.js`.
**Cô xem trước các tuần bị khóa:** thêm `?unlock` vào cuối link, ví dụ `…/speaking-10-weeks/?unlock`.
**Sửa nội dung** (câu hỏi, đề, gợi ý, thêm đề mới quý 1/2027): sửa `speaking-10-weeks/data.js`. Mã câu (W1-A-01…) được tạo tự động theo thứ tự.

**Học sinh làm gì:** nhập tên và lớp, mở tuần đang học, bấm **🎙 Record** để thu từng câu. Nghe lại bản thu, nếu chưa ưng thì bấm **🔁 Record again**. Part 2 có nút chuẩn bị 1 phút kèm ô ghi từ khóa. Tuần 9–10 thi thử: câu hỏi ẩn cho tới khi bấm bắt đầu, mỗi Part thu thành 1 file. Bản thu lưu trên máy nên tắt trang không mất. Bấm **✉ Send to teacher** thì chỉ những câu mới thu hoặc thu lại mới được gửi, nên học sinh gửi nhiều lần trong tuần được.

**Cô nhận được:** email `[Speaking W1] Tên – Lớp – 6 recordings · required 10/19`, trong email có bảng các câu (mã câu, câu hỏi, độ dài, từ khóa Part 2, mốc thời gian từng câu của bài thi thử). **Mỗi câu là 1 file đính kèm, tên file là mã câu**, ví dụ `W1-A-01 - Nguyễn Minh Anh.webm`. Sheet có thêm 1 dòng cho mỗi lần gửi. Lần gửi nặng hơn 12MB sẽ tự tách thành nhiều email.

> Nếu sau này sửa `Speaking.gs`: **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**. URL giữ nguyên.

## Muốn cho một học sinh làm lại?

Bài làm được lưu trong trình duyệt của học sinh. Học sinh mở trang bằng **cửa sổ ẩn danh** hoặc xóa dữ liệu trang web là làm lại được từ đầu.
