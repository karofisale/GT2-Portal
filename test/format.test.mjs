/** format.test.mjs — hàm thuần giao diện GT2.   Chạy: node test/format.test.mjs */
import * as F from '../src/utils/format.js';

let pass = 0, fail = 0;
const check = (t, ok, them) => { if (ok) { pass++; console.log('  OK   ' + t); } else { fail++; console.log('  FAIL ' + t + (them !== undefined ? ' → ' + JSON.stringify(them) : '')); } };

check('fmtNgay đổi YYYY-MM-DD sang dd/mm/yyyy', F.fmtNgay('2026-11-11') === '11/11/2026');
check('fmtNgay giữ giờ', F.fmtNgay('2026-11-11 08:30') === '11/11/2026 08:30');
check('fmtNgay chuỗi lạ / rỗng', F.fmtNgay('abc') === 'abc' && F.fmtNgay('') === '' && F.fmtNgay(null) === '');
check('fmtTien rỗng khi không phải số', F.fmtTien('') === '' && F.fmtTien(null) === '' && F.fmtTien('x') === '');
check('fmtTien có đơn vị', /đ$/.test(F.fmtTien(1500)) && /1[.,\s]?500/.test(F.fmtTien(1500)), F.fmtTien(1500));
check('fmtNum 0 vẫn hiện', F.fmtNum(0) === '0');
check('menu khách: đặt hàng, đơn, theo mã, danh mục', F.menuTheoVai('partner').map((m) => m.key).join() === 'datHang,donCuaToi,theoMa,danhMuc' && F.menuTheoVai('dealer').length === 4);
check('menu admin có việc admin + kế hoạch + kế toán + cài đặt', ['hvAdmin', 'keHoach', 'keToan', 'caiDat'].every((k) => F.menuTheoVai('admin').some((m) => m.key === k)));
check('menu planner: kế hoạch + cài đặt, không có việc admin / kế toán', (() => { const k = F.menuTheoVai('planner').map((m) => m.key); return k.includes('keHoach') && k.includes('caiDat') && !k.includes('hvAdmin') && !k.includes('keToan'); })());
check('menu kế toán: DO, không có kế hoạch', (() => { const k = F.menuTheoVai('account').map((m) => m.key); return k.includes('keToan') && !k.includes('keHoach'); })());
check('menu viewer chỉ xem: tất cả đơn + theo mã', F.menuTheoVai('viewer').map((m) => m.key).join() === 'tatCaDon,theoMa');
check('laNoiBo / laKhach', F.laNoiBo('planner') && !F.laNoiBo('partner') && F.laKhach('dealer') && !F.laKhach('admin'));
check('toneClass: tone lạ -> gray', F.toneClass('xyz') === 'tag tag-gray' && F.toneClass('amber') === 'tag tag-amber');
check('demDongDan bỏ dòng trống', F.demDongDan('a 1\n\n b 2\n  \n') === 2);
check('homNay theo giờ Việt Nam (17:30 UTC = sang ngày kế)', F.homNay('2026-11-11T17:30:00Z') === '2026-11-12' && F.homNay('2026-11-11T16:30:00Z') === '2026-11-11');
check('sdtHopLe', F.sdtHopLe('0901 234 567') && F.sdtHopLe('+84901234567') && !F.sdtHopLe('abc') && !F.sdtHopLe('123'));
const kho = (() => { const m = new Map(); return { setItem: (k, v) => m.set(k, v), getItem: (k) => (m.has(k) ? m.get(k) : null) }; })();
F.nhoNguoi(kho, { ten: 'Nguyễn A', sdt: '0901234567' });
check('nhớ / đọc người thao tác', F.layNguoi(kho).ten === 'Nguyễn A' && F.layNguoi(kho).sdt === '0901234567');
check('đọc người khi chưa có / hỏng', F.layNguoi({ getItem: () => 'rác{' }).ten === '' && F.layNguoi({ getItem: () => { throw new Error('x'); } }).ten === '');

console.log('\n' + (fail ? 'THẤT BẠI' : 'ĐẠT') + ': ' + pass + ' đạt, ' + fail + ' lỗi');
process.exit(fail ? 1 : 0);
