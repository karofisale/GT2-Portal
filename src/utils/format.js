/** format.js — hàm thuần của giao diện GT2 (có test: test/format.test.mjs). */

export const fmtNum = (v) => (v === null || v === undefined || v === '' || !isFinite(Number(v)) ? '' : Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 2 }));
export const fmtTien = (v) => (v === null || v === undefined || v === '' || !isFinite(Number(v)) ? '' : Number(v).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' đ');

/** 'YYYY-MM-DD' (hoặc kèm giờ) -> 'dd/mm/yyyy' (giữ phần giờ nếu có). Chuỗi lạ trả nguyên. */
export function fmtNgay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(.*)$/.exec(String(s || '').trim());
  return m ? m[3] + '/' + m[2] + '/' + m[1] + m[4] : String(s || '');
}

export const NHAN_VAI = { partner: 'Đối tác', dealer: 'Đại lý', admin: 'Admin VHKD', planner: 'Kế hoạch', account: 'Kế toán', qc: 'Kho / QC', viewer: 'Chỉ xem' };
export const NHAN_LOAI = { nskx: 'NSKX', '3t': '3T', bht: 'BHT', dai_ly: 'Đại lý BHT' };
export const NHAN_MIEN = { bac: 'Miền Bắc', nam: 'Miền Nam', '': '' };
export const NHAN_DONG = { cho: 'Chờ xác nhận ngày giao', cho_do: 'Chờ tạo DO', co_do: 'Đã có DO', hoan_thanh: 'Hoàn thành', huy: 'Đã huỷ' };

const NOI_BO = ['admin', 'planner', 'account', 'qc', 'viewer'];
export const laNoiBo = (role) => NOI_BO.indexOf(role) >= 0;
export const laKhach = (role) => role === 'partner' || role === 'dealer';

/** Đối tác có sổ công nợ ở GT2 (pha 2): kênh BHT — BHT và đại lý của BHT. */
export const coSoCongNo = (loai) => loai === 'bht' || loai === 'dai_ly';

/** Các mục menu theo vai trò: [{ key, nhan }]. loai = loại đối tác của tài khoản khách (nskx | 3t | bht | dai_ly) — kênh BHT có thêm "Công nợ". */
export function menuTheoVai(role, loai) {
  if (laKhach(role)) {
    const k = [{ key: 'datHang', nhan: 'Đặt hàng' }, { key: 'donCuaToi', nhan: 'Đơn của tôi' }, { key: 'theoMa', nhan: 'Theo mã hàng' }, { key: 'danhMuc', nhan: 'Danh mục & tồn kho' }];
    if (coSoCongNo(loai)) k.splice(2, 0, { key: 'congNo', nhan: 'Công nợ & thanh toán' });
    return k;
  }
  const m = [];
  if (role === 'admin') m.push({ key: 'hvAdmin', nhan: 'Việc của Admin' });
  if (role === 'admin' || role === 'planner') m.push({ key: 'keHoach', nhan: 'Kế hoạch giao hàng' });
  if (role === 'admin' || role === 'account') m.push({ key: 'keToan', nhan: 'DO, xuất kho & tiền về' });
  if (role === 'admin' || role === 'account' || role === 'viewer') m.push({ key: 'congNo', nhan: 'Công nợ BHT' });
  m.push({ key: 'tatCaDon', nhan: 'Tất cả đơn' });
  m.push({ key: 'theoMa', nhan: 'Theo mã hàng' });
  if (role === 'admin' || role === 'planner') m.push({ key: 'caiDat', nhan: 'Danh mục & cài đặt' });
  return m;
}

/** Tone -> class CSS của huy hiệu trạng thái. */
export const toneClass = (t) => 'tag tag-' + (['amber', 'blue', 'emerald', 'rose'].indexOf(t) >= 0 ? t : 'gray');

/** Số dòng không rỗng của ô dán (chỉ để hiện "n dòng"; bản đọc chính thức do máy chủ làm — previewDon / createDon). */
export const demDongDan = (text) => String(text || '').split('\n').filter((x) => x.trim()).length;

/** Hôm nay 'YYYY-MM-DD' theo giờ Việt Nam. */
export function homNay(now) {
  const d = new Date((now ? new Date(now) : new Date()).getTime() + 7 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
}

/** Số điện thoại: bỏ khoảng trắng / dấu, kiểm 8–15 chữ số (có thể có + đầu). */
export const sdtHopLe = (s) => /^\+?\d{8,15}$/.test(String(s || '').replace(/[\s.\-()]/g, ''));

/** Người thao tác nhớ ở máy (tài khoản chung nên mỗi máy / mỗi người nhập một lần). */
export function nhoNguoi(storage, nguoi) {
  try { if (nguoi && nguoi.ten) storage.setItem('gt2.nguoi', JSON.stringify({ ten: nguoi.ten, sdt: nguoi.sdt || '' })); } catch { /* bộ nhớ bị chặn */ }
}
export function layNguoi(storage) {
  try { const j = JSON.parse(storage.getItem('gt2.nguoi') || 'null'); return j && j.ten ? { ten: String(j.ten), sdt: String(j.sdt || '') } : { ten: '', sdt: '' }; } catch { return { ten: '', sdt: '' }; }
}

/* ---------- công nợ / thanh toán (pha 2) ---------- */
export const NHAN_TT = { cho: 'Chờ xác nhận', da_xac_nhan: 'Đã xác nhận', tu_choi: 'Bị từ chối', rut: 'Đã rút' };
export const TONE_TT = { cho: 'amber', da_xac_nhan: 'emerald', tu_choi: 'rose', rut: 'gray' };

/** Tình trạng hạn của một đơn / khoản trong sổ: { nhan, tone } — quá hạn N ngày > sắp đến hạn > trong hạn > đã trả đủ. */
export function tinhTrangHan(x) {
  if (!x || !(Number(x.conNo) > 0.004)) return Number(x && x.traTruoc) > 0.004 ? { nhan: 'Trả trước', tone: 'blue' } : { nhan: 'Đã trả đủ', tone: 'emerald' };
  const qh = Number(x.quaHanNgay || x.soNgayQuaHanMax) || 0;
  if (qh > 0) return { nhan: 'Quá hạn ' + qh + ' ngày', tone: 'rose' };
  if (x.sapDenHan === true || Number(x.sapDenHan) > 0) return { nhan: 'Sắp đến hạn', tone: 'amber' };
  return { nhan: 'Trong hạn', tone: 'gray' };
}

/** Hạn gần nhất còn nợ của một đơn trong sổ (khoản đầu tiên còn nợ) — '' nếu đã trả đủ. */
export const hanGanNhat = (don) => { const k = (don && don.khoans || []).find((x) => Number(x.conNo) > 0.004); return k ? k.han : ''; };

/** Số tiền gõ tay -> số (bỏ dấu chấm / phẩy ngăn nghìn kiểu VN, khoảng trắng, chữ đ). '' / sai -> NaN. */
export function docTien(s) {
  const t = String(s == null ? '' : s).replace(/[đ\s]/gi, '').replace(/[.,](?=\d{3}(\D|$))/g, '');
  return /^\d+([.,]\d+)?$/.test(t) ? Number(t.replace(',', '.')) : NaN;
}

/** Tệp điện chuyển tiền: loại được nhận + kích thước tối đa (máy chủ cũng kiểm theo chữ ký tệp). */
export const TEP_TOI_DA = 4 * 1024 * 1024;
export const laTepHopLe = (mime) => ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].indexOf(String(mime || '')) >= 0;
