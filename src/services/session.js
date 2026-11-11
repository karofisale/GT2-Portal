/**
 * session.js — phần RIÊNG của GT2 trong lớp phiên dùng chung (lõi: karofiSessionCore.js, sinh tự động từ Karofi-ID/web — đừng sửa).
 * GT2 chỉ dùng token Karofi ID (khối quyền `GT2` { n, r, pt }); KHÔNG có đăng nhập riêng. Chưa có phiên -> về cổng VHKD.
 */
import { claimFor } from './karofiSessionCore';

export {
  clearSharedSession, bounceToPortal, clearBounceFlag, veCongSauDangXuat, appKhacDungDuoc, duongDanCong, KAROFI_APPS
} from './karofiSessionCore';

/** Phiên GT2 dựng từ phiên dùng chung, hoặc null nếu chưa đăng nhập / không được cấp quyền GT2. */
export function sessionGt2() {
  const c = claimFor('GT2');
  if (!c) return null;
  return { token: c.token, name: c.claim.n, role: String(c.claim.r || 'viewer').toLowerCase(), partner: c.claim.pt || '', expiresAt: c.expiresAt };
}
