# GT2 Portal (kênh GT2: NSKX · 3T · BHT + đại lý)

App React + Vite, chạy dưới `/GT2/` trên cùng origin với cổng VHKD. Backend: Supabase Edge Function `gt2-api`
(mã ở `Karofi-ID/supabase/functions/gt2-api`, dữ liệu ở schema Postgres `gt2`). Đăng nhập: **chỉ qua Karofi ID** (khối quyền `GT2` trong token) — không có form đăng nhập riêng.

Thiết kế + các điểm nghiệp vụ đã chốt: `D:\Operation\Claude Code\De-xuat-Kenh-GT2-2026-11-10.md`.

## Chạy thử ở máy (không cần Supabase thật)

```bash
# cửa sổ 1 — gt2-api thật trên Postgres giả (PGlite) + dữ liệu mẫu, cổng 8787
cd ../Karofi-ID/test && node ../tools/gt2-dev-server.mjs
# cửa sổ 2 — giao diện
VITE_GT2_API=http://localhost:8787 npm run dev       # http://localhost:3200
```

Lấy token thử: `GET http://localhost:8787/dev-token?role=partner&pt=NSKX&n=nskx` (role: partner, dealer, admin, planner, account, qc, viewer),
rồi trong console trình duyệt: `localStorage.setItem('karofi.session', JSON.stringify({ token: '<token>' }))` và tải lại.

## Kiểm thử

```bash
npm test                                  # hàm thuần của giao diện
cd ../Karofi-ID/test && node gt2-api-pure.test.mjs && node gt2-api.test.mjs && node quan-tri-gt2.test.mjs
```

## Triển khai

Đang chạy: cổng `https://sales.karofiglobal.com/GT2/` → Cloudflare **Worker** `karofi-gt2` (`karofi-gt2.hai-cao.workers.dev`, phục vụ `dist/` qua `wrangler.jsonc`;
build command `npm run build`). Push nhánh `main` là Cloudflare tự build + deploy — vì vậy **chỉ push sau khi backend tương ứng đã lên**.

Thứ tự khi có thay đổi backend / CSDL:
1. Chạy SQL mới trong Supabase SQL Editor (người có quyền): đợt 32 `chay-dot32-gt2-nen-tang-2026-11-11.sql` (đã chạy), **đợt 33 `chay-dot33-gt2-cong-no-2026-11-12.sql`** (pha 2 — công nợ, đã chạy), **đợt 34 `chay-dot34-gt2-tra-hang-2026-11-12.sql`** (pha 3 — trả hàng 3T).
2. Deploy hàm: `npx supabase functions deploy gt2-api --no-verify-jwt` (và `karofi-id` khi đổi quyền).
3. Push `GT2-Portal` → Cloudflare deploy giao diện.
4. Đồng bộ lớp phiên khi đổi `Karofi-ID/web/*`: `node tools/dong-bo-lop-phien.mjs --ghi` (sinh `src/services/karofiSessionCore.js` — đừng sửa tay).

Cấp quyền: Karofi ID > Quản trị > Thêm / sửa tài khoản > tick "GT2 Portal": `partner` / `dealer` + **mã đối tác** (NSKX, 3T, BHT, mã đại lý);
nhân viên Karofi: `admin`, `planner`, `account` (kế toán: DO, xuất kho, xác nhận tiền về), `qc`, `viewer`.
Dữ liệu đầu vào (admin, màn Danh mục & cài đặt): đối tác (đại lý + hạn mức), kho, danh mục + giá riêng từng đối tác, leadtime, lịch nghỉ lễ.

## Pha 2 — công nợ kênh BHT (12/11/2026)

- Nợ ghi theo **DO đã xuất kho (PGI)**, hạn = ngày xuất kho + `han_thanh_toan_ngay` của đối tác (mặc định 5). Sổ cho đối tác loại BHT và đại lý BHT.
- Đại lý / BHT **gửi điện chuyển tiền** (ảnh / PDF ≤ 4 MB, gắn MỘT đơn) ở màn "Công nợ & thanh toán" hoặc mục Thanh toán của đơn → Kế toán xác nhận
  (sửa được số tiền / ngày) hoặc từ chối có lý do ở màn "DO, xuất kho & tiền về". Kế toán ghi tay được khoản thu không có điện.
- Tiền của đơn nào chỉ trừ nợ đơn đó (khoản hạn sớm nhất trước); trả trước khi giao hiện là "trả trước".
- Cảnh báo khi admin duyệt đơn đại lý dùng dư nợ + quá hạn thật từ sổ (vẫn chỉ cảnh báo, tick "vẫn duyệt").

## Pha 3 — trả hàng 3T (12/11/2026)

- 3T gửi phiếu (mã, SL, số HĐ / DO gốc, lý do, ≤ 10 ảnh / PDF; dán được từ Excel) → sửa / huỷ khi chưa xét.
- Kỳ so sánh = kỳ đã kết thúc gần nhất theo ngày gửi (tham số `tra_hang_ky`: quý / 6 tháng), ngưỡng `tra_hang_ty_le_pct` (mặc định 3%).
- Doanh thu kỳ = doanh thu thuần SAP **trước thuế** của đơn vị `tra_hang_don_vi_fc` (mặc định 3T) trong `fc.actual_revenue`; thiếu thì admin nhập tay.
  Giá trị hàng trả cùng nền trước thuế: đơn giá tự lấy = bình quân thuần SAP 12 tháng, không có thì giá danh mục 3T (cảnh báo: có thể gồm VAT); admin sửa được.
- Admin duyệt (vượt ngưỡng → duyệt ngoại lệ có lý do) / từ chối → Kho / QC ghi SL thực nhận + kết luận từng mã (danh mục "Kết luận QC") → 3T thấy kết quả.
