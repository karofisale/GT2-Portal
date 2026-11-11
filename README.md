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

## Triển khai (cần người có quyền — chưa làm)

1. Chạy `Karofi-ID/supabase/chay-dot32-gt2-nen-tang-2026-11-11.sql` trong Supabase SQL Editor (thêm 3 cột `gt2_*` vào `kid.users` + schema `gt2`).
2. Deploy hàm: `npx supabase functions deploy gt2-api --no-verify-jwt` và `npx supabase functions deploy karofi-id --no-verify-jwt`; đặt secret `GT2_STOCK_SECRET` (chuỗi ngẫu nhiên dài) nếu muốn máy SAP đẩy tồn kho.
3. Tạo project Cloudflare Pages tên `karofi-gt2` (đúng tên đã khai trong `Karofi-VHKD/_worker.js`), build `npm run build`, thư mục `dist`; sau đó deploy lại cổng VHKD để route `/GT2` có hiệu lực.
4. Đồng bộ lớp phiên: trong `Karofi-ID`, `node tools/dong-bo-lop-phien.mjs --ghi` (đã sinh `src/services/karofiSessionCore.js` — đừng sửa tay).
5. Vào Karofi ID > Quản trị > Thêm / sửa tài khoản > tick "GT2 Portal": vai `partner` / `dealer` + **mã đối tác** (NSKX, 3T, BHT, mã đại lý); nhân viên Karofi: `admin`, `planner`, `account`, `qc`, `viewer` (không gắn mã đối tác).
6. Trong GT2 Portal (admin): nhập danh mục kho, đối tác (đại lý + hạn mức), danh mục sản phẩm + giá riêng từng đối tác, leadtime theo category, lịch nghỉ lễ.
