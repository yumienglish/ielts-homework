# Quản lý lớp học — hướng dẫn cài đặt

Web app quản lý lớp tên là **Mia's Classroom**, có các màn **Trang chủ · Lịch · Buổi học · Giáo án · Học sinh · Học phí · Báo cáo**. Dữ liệu nằm trong một file Google Sheet riêng của cô, gọi là **file chính**.

- Code: [`quan-ly/QuanLy.gs`](quan-ly/QuanLy.gs) (xử lý phía Google) và [`quan-ly/App.html`](quan-ly/App.html) (giao diện).
- **File chính có học phí.** Chỉ chia sẻ cho người nhà, quyền Xem (xem mục [Cho người nhà xem](#cho-người-nhà-xem-chỉ-xem)). Không bao giờ chia sẻ cho trợ lý.

---

## Cài đặt (làm 1 lần, khoảng 10 phút)

### 1. Tạo file chính từ file dữ liệu ban đầu
1. Mở Google Drive, bấm **Mới → Tải tệp lên**, chọn file `QuanLyLopHoc-du-lieu-ban-dau.xlsx` (Claude đã chuẩn bị sẵn).
2. Bấm đúp vào file vừa tải lên → **Mở bằng Google Trang tính**.
3. **Tệp → Lưu dưới dạng Google Trang tính**. Đặt tên file mới là **Quản lý lớp học**.
4. Xóa file `.xlsx` trên Drive cho gọn. Từ giờ chỉ dùng file **Quản lý lớp học**.

### 2. Dán code
1. Trong file **Quản lý lớp học**: **Tiện ích mở rộng → Apps Script**.
2. Đổi tên dự án (góc trên bên trái) thành `Quản lý lớp học`.
3. Ở file `Mã.gs` (hoặc `Code.gs`): xóa hết, dán toàn bộ nội dung `QuanLy.gs`.
4. Bấm **＋** cạnh chữ *Tệp* → **HTML**, đặt tên đúng là **`App`**. Xóa hết nội dung mẫu, dán toàn bộ `App.html`.
5. Bấm 💾 **Lưu**.
6. Bấm ⚙ **Cài đặt dự án** → **Múi giờ** = `(GMT+07:00) Bangkok/Hanoi/Jakarta`.

### 3. Kiểm tra các tab
1. Quay lại tab Google Sheet, **tải lại trang**. Trên thanh menu sẽ có thêm menu **🌷 Lớp học**.
2. Chọn **🌷 Lớp học → Kiểm tra / tạo các tab**.
   Google hỏi quyền: bấm **Tiếp tục → chọn tài khoản → Nâng cao → Đi tới Quản lý lớp học (không an toàn) → Cho phép**. Cảnh báo này xuất hiện vì script do cô tự tạo, không phải ứng dụng đã đăng ký với Google.
3. Hộp thoại liệt kê số dòng từng tab. Số đúng khi cài lần đầu:

   | Lop | HocSinh | Lich | GiaoAn | GhiChuTuan | HocPhi | Diem | MauNhanXet |
   |---|---|---|---|---|---|---|---|
   | 10 | 20 | 123 | 84 | 7 | 80 | 93 | 15 |

4. Mở tab **CaiDat**, điền tên cô vào cột *Giá trị* của dòng **Tên cô (ký báo cáo)**.

### 4. Bật web app
1. Trong Apps Script: **Triển khai → Tùy chọn triển khai mới**.
2. Bấm ⚙ cạnh *Chọn loại* → **Ứng dụng web**.
3. Điền như sau:
   - Mô tả: `Quản lý lớp`
   - **Thực thi với tư cách: Người dùng truy cập ứng dụng web**
   - **Người có quyền truy cập: Bất kỳ ai có Tài khoản Google**

   Cài như vậy vẫn an toàn. Mỗi người mở web app bằng chính tài khoản của mình, nên **chỉ người được chia sẻ file Quản lý lớp học mới xem được dữ liệu**. Người khác có link cũng chỉ thấy lỗi không có quyền.
4. Bấm **Triển khai**, rồi copy **URL ứng dụng web** (link kết thúc bằng `/exec`).
   Dán link này vào dòng **Link web app** ở tab **CaiDat** (cột *Giá trị*). Menu **🌷 Lớp học → Mở web app** sẽ dùng link đó.
5. Mở link trên điện thoại, đăng nhập đúng tài khoản Google của cô. Sau đó chọn **Thêm vào màn hình chính** để mở nhanh như một ứng dụng.
   Trong Sheet, menu **🌷 Lớp học → Mở web app** cũng hiện link này.

### Nếu mở link báo "Rất tiếc, không thể mở tệp tại thời điểm này"
Lỗi này thường xảy ra khi trình duyệt đang **đăng nhập nhiều tài khoản Google**: Google tự dùng tài khoản đầu tiên, không phải tài khoản chứa file. Có 2 cách xử lý:
- Mở link trong cửa sổ ẩn danh (hoặc một hồ sơ Chrome) chỉ đăng nhập đúng tài khoản đó.
- Hoặc thêm số thứ tự tài khoản vào link: `…/macros/s/…/exec` thành `…/macros/u/1/s/…/exec`. Tài khoản đầu tiên là `0`, tài khoản thứ hai là `1`, cứ thế tiếp.

### 5. Dọn file cũ
- **Gỡ quyền của trợ lý ở file Lịch cũ.** Tab **Quote** (học phí) đang nằm trong file đó.
- File Lịch và Syllabus cũ chỉ còn để lưu trữ, không cần sửa nữa. Trong file Lịch, chọn menu **Syllabus → Tắt tự động**.

---

## Dùng hằng ngày

- Mọi việc làm trên web app: xếp lịch, soạn giáo án, điểm danh, tick học phí, thêm lớp và học sinh, viết báo cáo.
- Trên đầu trang có chữ **☁️ Đã lưu**. Khi đang gửi dữ liệu sẽ hiện **⏳ Đang lưu…**.
- Nếu hiện **⚠️ Chưa lưu được**, thường là do mất mạng. Web app tự thử lại, đừng đóng trang cho đến khi thấy lại chữ **☁️ Đã lưu**.
- Bấm vào chữ **☁️ Đã lưu** để tải dữ liệu mới nhất, ví dụ khi vừa sửa trên máy tính rồi mở điện thoại.
- Quay lại web app sau hơn 3 phút không dùng, dữ liệu cũng tự tải lại.
- **Mở app tức thì:** web app lưu tạm bản dữ liệu gần nhất ngay trên trình duyệt của máy đang dùng, nên mở app là thấy ngay. Trong lúc lấy bản mới từ Google, đầu trang hiện **🔄 Đang cập nhật…**. Nếu có gì khác, màn hình tự cập nhật và báo "Đã cập nhật dữ liệu mới nhất". Khi sửa liên tục (như gõ ghi chú), app đợi cô ngừng tay khoảng nửa giây rồi mới gửi lên Google một lần. Muốn xóa bản lưu tạm trên một máy thì xóa dữ liệu duyệt web của trình duyệt đó.
- **Giáo án — xem buổi cũ:** bình thường chỉ hiện các buổi từ hôm nay trở đi. Trên thanh tên lớp có 2 nút: **👁 Hiện 1 buổi trước** (chỉ buổi gần nhất đã dạy) và **📜 Hiện tất cả buổi cũ**. Bấm lại nút đang bật để ẩn đi. App nhớ lựa chọn này cho lần mở sau.
- **Hủy / dời buổi, giáo án tự đi theo.** Giáo án xếp theo thứ tự buổi:
  - Xóa (hủy) một buổi: bài của buổi đó chuyển sang buổi kế tiếp, các bài sau lùi 1 buổi.
  - Dời buổi sang ngày khác, hoặc thêm buổi học bù: các bài được xếp lại theo thứ tự buổi mới.
  - Bài nào nằm ở ngày lớp không còn buổi (VD buổi bị xóa trước khi có tính năng này): Trang chủ, Buổi học và Giáo án báo **⚠️ chưa được dạy**, bấm **⤵️ Dời bài xuống** để sửa.
  - Mọi lần dời đều có **↶ Hoàn tác**.
- **Xóa nhầm?** Sau khi xóa buổi học, xóa dòng giáo án, xóa lớp hoặc cho học sinh nghỉ học, ở cuối màn hình hiện ô **↶ Hoàn tác** trong 10 giây. Bấm vào là mọi thứ trở lại như cũ.

## Bài học sinh nộp online (BTVN, Speaking)

File Quản lý **tự đọc** 2 file bài nộp mà các trang bài tập đang ghi vào, rồi chép bài mới vào tab **Diem** (cột *Nguồn* ghi `BTVN online` hoặc `Speaking`). Hai script nhận bài (`Code.gs`, `Speaking.gs`) giữ nguyên, học sinh nộp bài như cũ.

### Cài đặt (1 lần, chỉ 1 bước)
Bài nộp của **mọi học sinh** đều ghi chung vào 2 file trong Drive của cô: **BTVN – Bài nộp của học sinh** và **Speaking 10 tuần – Bài nộp**. Cô **không phải copy gì từ email**.

- Chọn menu **🌷 Lớp học → 📥 Lấy bài nộp online ngay**, hoặc trong web app: **Học sinh → Lấy bài nộp ngay**.
  Google hỏi thêm quyền xem Drive và quyền chạy hẹn giờ một lần, cô bấm **Cho phép**. Script sẽ:
  - tự tìm 2 file trên theo tên trong Drive, rồi lưu link vào tab **CaiDat**;
  - chép **toàn bộ bài đã nộp từ trước tới nay** vào tab Diem;
  - **tự bật lấy bài 4 tiếng một lần**. Từ đó cô không cần bấm gì nữa.

Nếu hộp thoại báo *không tìm thấy file* (ví dụ cô đã đổi tên file), mở file đó trên Drive, copy link trên thanh địa chỉ rồi dán vào dòng tương ứng trong tab **CaiDat**.

### Cách hoạt động
- **Khớp tên tự động:** tên học sinh tự gõ được so với *Tên gọi*, *Họ tên đầy đủ*, tên trong ngoặc (VD `An (Tom)` gõ `Tom`) và cột *Tên khác (bài nộp online)*. Khi so không phân biệt dấu hay chữ hoa, và nếu trùng tên thì xét thêm lớp. Ví dụ em gõ đủ họ tên `Nguyễn Minh An`, lớp `AB01`: nếu lớp đó chỉ có một An thì bài tự khớp.
- **Bài không khớp tên:** vào mục **📥 Bài nộp online** ở đầu màn **Học sinh** (Trang chủ cũng nhắc). Cô chọn đúng em rồi bấm **Ghép**. Nếu để tick **Nhớ tên này**, tên em đã gõ được lưu vào cột *Tên khác*, lần sau tự khớp. Bài rác hay bài thử thì bấm **Bỏ qua**.
- **Không chép trùng:** mỗi bài có *Mã bài nộp*, lấy lại nhiều lần cũng không bị nhân đôi.
- **Speaking:** mỗi em, mỗi tuần chỉ có 1 dòng điểm (gửi nhiều đợt thì dòng đó được cập nhật). Cột *Điểm* để trống, cô hoặc trợ lý chấm xong thì điền vào tab Diem.
- **Màn Điểm danh:** em nào đã nộp bài online kể từ buổi trước được **tự chọn "Đủ"** ở mục *Bài tập buổi trước*, kèm tên bài và điểm. Cô vẫn sửa được trước khi bấm Lưu.
- Muốn lấy ngay không chờ 4 tiếng: web app → **Học sinh** → **Lấy bài nộp ngay**.

## Nhắc bài tập hàng tuần 📣

Mỗi lớp được nhắc **1 lần/tuần, khoảng 20:00**, vào **ngày làm bài tập**. Đó là ngày nghỉ cách xa ngày học nhất, web app tự tính theo Lịch (VD lớp học T2 và T5 thì làm bài T7). Muốn chọn ngày khác: **Học sinh → ✏️ Sửa lớp → Ngày làm BT**.

**Làm 1 lần:**
1. **Học sinh → ✏️ Sửa lớp**: dán **Link bài tập** của lớp (link cố định, trang tự mở bài tuần mới).
2. Em nào không tự làm mà cô nhắn qua phụ huynh: bấm tên em → **✏️ Sửa** → điền *Phụ huynh*, *SĐT/Zalo* và tick **📣 Nhắc bài tập qua phụ huynh**.
3. Mở **Học sinh → 📣 Nhắc BT** → phần **Cài nhắc hẹn Zalo**. Với mỗi nhóm Zalo lớp:
   - mở nhóm → **⋯ / ＋ → Nhắc hẹn**;
   - dán tin (nút **📋 Chép tin**);
   - chọn ngày làm BT, **20:00**, **Lặp lại: Hàng tuần**.

   Từ đó Zalo tự báo cả nhóm mỗi tuần.
4. Nhắc chính cô: trong **Cloud của tôi** tạo nhắc hẹn lặp hàng tuần lúc **19:55** vào các ngày ghi ở cuối màn 📣 Nhắc BT: "📣 Mở Mia's Classroom → nhắc em chưa làm".

**Mỗi tuần, đúng ngày làm bài:** Trang chủ hiện thẻ **📣 Nhắc bài tập tối nay** cho các lớp đến ngày. Mỗi lớp có:
- **✅ em đã nộp / ⏰ em chưa nộp**, lấy từ bài nộp online kể từ buổi học trước.
- **📋 Chép tin nhóm lớp**: dán vào nhóm Zalo. Tin ghi bài tập (cột *Homework* của giáo án buổi gần nhất), hạn nộp (trước buổi học kế tiếp), tên em chưa nộp và link, nên mỗi tuần mỗi khác.
- **💬 PH …** (em làm qua phụ huynh, chưa nộp): chép tin riêng cho phụ huynh và mở thẳng Zalo của phụ huynh. Cô chỉ cần dán và gửi.
- **✓ Đã nhắc**: ẩn thẻ của lớp đó đến tuần sau.

Muốn nhắc vào ngày khác, hoặc xem tất cả lớp: **Học sinh → 📣 Nhắc BT**.

## Dùng Lịch trên điện thoại

- **Dời một lớp sang giờ/ngày khác:** chạm và **giữ ô lớp khoảng 1 giây** cho đến khi ô nổi lên (máy rung nhẹ), rồi kéo đến ô mới và thả. Vuốt nhanh trên lịch chỉ cuộn trang, không dời lớp; bấm nhẹ vào ô lớp để mở buổi học. Trên máy tính, dùng chuột kéo ngay không cần giữ.
- Lỡ dời nhầm: bấm **↶ Hoàn tác** ngay trên đầu lịch.
- **Thu phóng:** các nút **− / +** trên đầu lịch phóng to, thu nhỏ lưới; nút **🗓 Cả tuần** thu vừa màn hình để thấy đủ 7 ngày (chữ nhỏ nhưng đủ nhận màu lớp), bấm lại (**🔍 100%**) để về cỡ bình thường. Mức thu phóng được nhớ cho lần sau trên cùng máy.

## Lucky Draw 🎁

Chỉ áp dụng cho **lớp từ 2 bạn trở lên**.

- **Chấm điểm mỗi buổi:** ở màn **Buổi học**, mỗi em có hàng nút 🎁. Mỗi nút được bấm là **+1 điểm**:
  - ⏰ Đúng giờ
  - 📚 Làm bài đầy đủ
  - 🎮 Game
  - 📈 Tiến bộ
  - 🏆 Đúng hết / cao nhất lớp
  - 🔤 Học từ vựng
  - 🙋 Tích cực tập trung
  - ✍️ Làm bài nghiêm túc
- **Tự tick:** "Đúng giờ" tự tick khi em **Có mặt**. "Làm bài đầy đủ" tự tick khi bài tập buổi trước là **Đủ**. Bấm lại để bỏ tick.
- **Chọn nhanh cả lớp:** khung vàng phía trên cho 1 tiêu chí vào mọi em có mặt (ví dụ cả lớp chơi game). Bấm lần nữa để bỏ.
- Bấm **💾 Lưu buổi học** là lưu luôn điểm Lucky.
- **Tab 🎁 Lucky** có các cột:
  - **Trước**: điểm còn dư mang sang;
  - **tháng trước** và **tháng này**: điểm cộng từng tháng;
  - **Còn**: số điểm hiện có.

  Điểm cộng dồn qua các tháng. Em đủ **50 điểm** hiện ô vàng **🎁**.
- **Bốc thăm:** bấm ô 🎁 (hoặc bấm tên em) → ghi **Quà đã nhận** → **🎁 Đã bốc thăm – trừ 50 điểm**.
  - Lịch sử bốc thăm hiện ở cuối tab.
  - Bấm nhầm thì xóa dòng đó (🗑) rồi bấm **↶ Hoàn tác** nếu cần.
- **Điểm mang sang** (điểm còn dư từ file Lucky Draw cũ): dán vào ô **📥 Nhập điểm còn dư**, dạng `Tên Điểm, Tên Điểm…`.
  - App tự ghép tên: bỏ dấu, nhận cả tên trong ngoặc như "Tom" của "An (Tom)".
  - Nhập lại cho một em thì thay số cũ, không cộng thêm.
- **Điều chỉnh tay:** trong chi tiết từng em, ô **Điều chỉnh** cộng hoặc trừ điểm, kèm lý do.

## Cho người nhà xem (chỉ xem)

1. Trong file **Quản lý lớp học**, bấm **Chia sẻ**, nhập Gmail của người nhà và chọn quyền **Người xem**.
2. Gửi họ link web app (link `/exec`).
3. Lần đầu mở, Google hỏi quyền và báo *ứng dụng chưa được xác minh*. Đây là cảnh báo bình thường vì script do cô tự viết. Người nhà bấm **Nâng cao → Đi tới Quản lý lớp học → Cho phép**.
4. Người nhà sẽ thấy nhãn **👀 Chỉ xem** trên đầu trang:
   - Xem được mọi màn: lịch, giáo án, học sinh, **cả học phí**.
   - Các nút thêm, sửa, lưu bị ẩn. Lỡ bấm tick hay kéo lịch thì trang tự trả lại như cũ, không có gì bị ghi.
   - Muốn người đó sửa được như cô thì đổi quyền chia sẻ thành **Người chỉnh sửa**.

**Không chia sẻ file này cho trợ lý.** Trợ lý dùng file *Điểm – Trợ lý* riêng (giai đoạn sau), file đó không có học phí.

## Sửa tay trong Google Sheet (khi cần)

Cô vẫn sửa trực tiếp trong các tab được. Sửa xong, mở lại web app (hoặc bấm **☁️ Đã lưu**) để thấy thay đổi.

| Tab | Nội dung | Lưu ý khi sửa tay |
|---|---|---|
| **Lop** | Mã lớp, kiểu học phí (`Tháng` / `Gói`), số buổi, giáo trình, sticker, màu | Màu ghi dạng `#FF595E`. Lớp không dạy nữa: ghi `Ngừng` ở cột *Trạng thái*. *Link bài tập* và *Ngày làm BT* (`T2`…`CN`, trống = tự tính) dùng cho 📣 Nhắc bài tập. |
| **HocSinh** | Tên gọi, họ tên đầy đủ, lớp, học phí, ngày bắt đầu | **Không đổi Tên gọi ở đây** (tên gọi dùng để nối dữ liệu). Muốn đổi tên: web app → **Học sinh** → bấm tên em → **✏️ Sửa** → sửa *Tên gọi* → **Lưu**. Điểm danh, học phí, điểm, Lucky Draw, báo cáo tự chuyển sang tên mới, tên cũ được thêm vào *Tên khác*. Em nghỉ: ghi `Nghỉ học` ở *Trạng thái*. *Phụ huynh*, *SĐT/Zalo* và *Nhắc BT qua phụ huynh* (`x`) dùng cho 📣 Nhắc bài tập. |
| **Lich** | Mỗi dòng một buổi | Ngày ghi `2026-11-20`, giờ ghi `17:00`. Không sửa cột `id`. Buổi học bù ghi `x`. |
| **GiaoAn** | Mỗi dòng một buổi của một lớp | Để trống *Ngày dạy* thì bài tự xếp vào các buổi tiếp theo. |
| **GhiChuTuan** | Ghi chú và việc cần làm theo tuần | Việc cần làm: mỗi dòng 1 việc. `[ ] việc` = chưa xong, `[x 2026-11-14] việc` = xong ngày đó (web app tự xóa sau 7 ngày). Dễ nhất là tick trong web app: **Lịch** → ô *Việc cần làm*. Nút **⧉ Chép tuần trước** ở mỗi ô: Ghi chú thêm các dòng tuần này chưa có; Việc cần làm thêm các việc **chưa xong** của tuần trước (bỏ trùng). Có Hoàn tác. |
| **DiemDanh** | Mỗi dòng một em trong một buổi | Web app tự ghi. Cột *Lucky Draw* liệt kê các tiêu chí được +1 của buổi đó, cách nhau bằng dấu phẩy. |
| **LuckyDraw** | Điểm mang sang, lần bốc thăm (−50) + quà, điều chỉnh tay | Loại là `Mang sang`, `Bốc thăm` hoặc `Điều chỉnh`. Không sửa cột `id`. |
| **HocPhi** | Mỗi dòng: học sinh, tháng (`2026-11`), trạng thái | Trạng thái là `Đã đóng`, `Chưa đóng` hoặc `Nghỉ`. Xóa dòng = trả về *Tự động*. |
| **BangGia** | Bảng giá (Quote): mỗi dòng 1 cấp độ: *Nhóm*, *LEVEL*, *Giá 1 giờ kèm 1-1* | Tab tự tạo khi cô lưu bảng giá lần đầu trong web app (**Học phí → 📋 Quote → 📥 Dán bảng giá**). Giá ghi đủ đồng, VD `180000`. Lớp 2 / 3 / 4 / 5+ học viên (75% / 65% / 55% / 50%) và giá 1 tháng (8 tiết × 1h30) web app tự tính. |
| **Diem** | Điểm HW / XT / CT: tab SCORES cũ + bài nộp online | Nhập tay được. Không sửa cột *Mã bài nộp*. Bài Speaking: điền điểm vào cột *Điểm* / *Max* sau khi chấm. |
| **ChoGhepTen** | Bài nộp online chưa khớp tên | Xử lý trong web app (Học sinh → Bài nộp online). |
| **MauNhanXet** | Mẫu nhận xét M01–M15 | Thêm hoặc sửa mẫu tự do. |
| **BaoCao** | Nội dung báo cáo đã sửa của từng em | |
| **NhacBT** | Tuần nào đã nhắc bài tập lớp nào (Thứ Hai của tuần, Lớp, Đã nhắc lúc) | Tab tự tạo khi cô bấm **✓ Đã nhắc** lần đầu. |
| **CaiDat** | Tên cô ký báo cáo | |

**Không đổi tên tab và không đổi chữ ở hàng tiêu đề.** Script tìm cột theo đúng chữ ở hàng 1. Cô được thêm cột mới ở bên phải, script sẽ giữ nguyên các cột đó.

## Cập nhật code sau này

1. Dán lại `QuanLy.gs` và `App.html` vào đúng hai file cũ → **Lưu**.
2. **Triển khai → Quản lý các lần triển khai** → bấm ✏️ → *Phiên bản*: **Phiên bản mới** → **Triển khai**.
   Link web app giữ nguyên, không cần đổi link trên điện thoại.

## Giới hạn hiện tại

- **Dữ liệu ban đầu được chép ngày 12/11/2026.** Nếu sau ngày này cô còn sửa trên file Lịch, Syllabus hoặc Quote cũ, hãy sửa lại trên web app, hoặc nhờ Claude xuất lại file dữ liệu trước khi cài.
- Những gì cô bấm thử trong **bản xem thử** chỉ nằm trong trình duyệt, không được chép sang.
- Chưa có (giai đoạn sau): file **Điểm – Trợ lý** và đồng bộ điểm 15 phút một lần, tạo PDF báo cáo tự động. Hiện tại báo cáo dùng nút **🖨️ In / Lưu PDF** của trình duyệt.
