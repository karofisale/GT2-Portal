/** api.js — gọi gt2-api (Supabase Edge Function). Giao thức: { fn, args:[token, ...] } -> { result } | { error }. */
import { sessionGt2 } from './session';

export const API_URL = (import.meta.env && import.meta.env.VITE_GT2_API) || 'https://zzbnxyvjpiuhxauagbgh.supabase.co/functions/v1/gt2-api';

/** Hàm GHI không được tự thử lại khi mất mạng giữa đường (có thể đã chạy xong rồi) — cùng nguyên tắc của OEM. */
const GHI = new Set(['createDon', 'updateDon', 'cancelDonKhach', 'approveDon', 'cancelDonAdmin', 'setSoSap', 'setNgayGiao', 'requestDo', 'saveDo', 'deleteDo', 'markPgi',
  'saveCaiDat', 'saveDoiTac', 'saveKho', 'importDanhMuc', 'saveLeadtime', 'saveLyDo', 'saveNgayNghi',
  'guiDienThanhToan', 'rutDienThanhToan', 'xacNhanThanhToan', 'tuChoiThanhToan', 'ghiThanhToanTay',
  'createTraHang', 'updateTraHang', 'cancelTraHang', 'approveTraHang', 'rejectTraHang', 'saveQcTraHang', 'saveKetLuanQc']);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class LoiApi extends Error {}

async function goi(fn, args, lan) {
  const ss = sessionGt2();
  if (!ss) throw new LoiApi('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại ở cổng VHKD.');
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 45000);
  try {
    const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn, args: [ss.token].concat(args || []) }), signal: ctl.signal });
    const text = await res.text();
    let j;
    try { j = JSON.parse(text); } catch { throw new TypeError('Phản hồi không đọc được (HTTP ' + res.status + ')'); }
    if (j && j.error) throw new LoiApi(j.error);
    return j ? j.result : null;
  } catch (e) {
    if (e instanceof LoiApi) throw e;
    if (!GHI.has(fn) && lan < 2) { await sleep(1200 * (lan + 1)); return goi(fn, args, lan + 1); }
    throw new LoiApi(GHI.has(fn)
      ? 'Mất kết nối khi đang lưu — thao tác CHƯA chắc đã được ghi. Mở lại danh sách để kiểm tra rồi mới bấm lại.'
      : 'Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
  } finally { clearTimeout(tm); }
}

export const api = (fn, ...args) => goi(fn, args, 0);
