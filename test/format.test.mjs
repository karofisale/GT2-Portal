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
check('menu khách: đặt hàng, đơn, theo mã, danh mục', F.menuTheoVai('partner', 'nskx').map((m) => m.key).join() === 'datHang,donCuaToi,theoMa,danhMuc' && F.menuTheoVai('partner', '3t').length === 5);
check('menu khách kênh BHT (BHT / đại lý): thêm Công nợ sau Đơn của tôi', F.menuTheoVai('dealer', 'dai_ly').map((m) => m.key).join() === 'datHang,donCuaToi,congNo,theoMa,danhMuc' && F.menuTheoVai('partner', 'bht').some((m) => m.key === 'congNo'));
check('menu Công nợ BHT: admin / kế toán / viewer có; planner không', ['admin', 'account', 'viewer'].every((r) => F.menuTheoVai(r).some((m) => m.key === 'congNo')) && !F.menuTheoVai('planner').some((m) => m.key === 'congNo'));
check('tinhTrangHan: quá hạn > sắp đến hạn > trong hạn > đã trả đủ / trả trước', F.tinhTrangHan({ conNo: 5, quaHanNgay: 3 }).nhan === 'Quá hạn 3 ngày' && F.tinhTrangHan({ conNo: 5, soNgayQuaHanMax: 2, sapDenHan: 9 }).tone === 'rose' &&
  F.tinhTrangHan({ conNo: 5, sapDenHan: 5 }).nhan === 'Sắp đến hạn' && F.tinhTrangHan({ conNo: 5, sapDenHan: false }).nhan === 'Trong hạn' && F.tinhTrangHan({ conNo: 0 }).nhan === 'Đã trả đủ' && F.tinhTrangHan({ conNo: 0, traTruoc: 9 }).nhan === 'Trả trước');
check('hanGanNhat: khoản đầu còn nợ', F.hanGanNhat({ khoans: [{ han: '2026-11-01', conNo: 0 }, { han: '2026-11-09', conNo: 10 }] }) === '2026-11-09' && F.hanGanNhat({ khoans: [] }) === '');
check('docTien: 1.250.000 / 1,250,000 / 1250000đ / 1250,5', F.docTien('1.250.000') === 1250000 && F.docTien('1,250,000') === 1250000 && F.docTien('1 250 000 đ') === 1250000 && F.docTien('1250,5') === 1250.5 && isNaN(F.docTien('abc')) && isNaN(F.docTien('')));
check('menu 3T có Trả hàng; đại lý không', F.menuTheoVai('partner', '3t').some((m) => m.key === 'traHang') && !F.menuTheoVai('dealer', 'dai_ly').some((m) => m.key === 'traHang'));
check('menu nội bộ Trả hàng 3T: admin / qc / viewer; kế toán / planner không', ['admin', 'qc', 'viewer'].every((r) => F.menuTheoVai(r).some((m) => m.key === 'traHang')) && !['account', 'planner'].some((r) => F.menuTheoVai(r).some((m) => m.key === 'traHang')));
const dt = F.docDongTra('1000101\t10\tHD001\tRò nước\n\n2000201 5 HD002 Hết hạn dùng\n3000301\t1.000\tDO9\t\nsai dòng\n4000401\t0\tHD1');

check('docDongTra: tab / khoảng trắng, lý do trống được, SL 1.000, dòng sai + SL 0 báo lỗi', dt.lines.length === 3 && dt.lines[0].lyDo === 'Rò nước' && dt.lines[1].soHd === 'HD002' && dt.lines[1].lyDo === 'Hết hạn dùng' &&
  dt.lines[2].sl === 1000 && dt.lines[2].lyDo === '' && dt.loi.length === 2, dt);
check('laTepHopLe: ảnh + PDF', F.laTepHopLe('image/png') && F.laTepHopLe('application/pdf') && !F.laTepHopLe('text/plain'));
check('menu admin có việc admin + kế hoạch + kế toán + cài đặt', ['hvAdmin', 'keHoach', 'keToan', 'caiDat'].every((k) => F.menuTheoVai('admin').some((m) => m.key === k)));
check('menu planner: kế hoạch + cài đặt, không có việc admin / kế toán', (() => { const k = F.menuTheoVai('planner').map((m) => m.key); return k.includes('keHoach') && k.includes('caiDat') && !k.includes('hvAdmin') && !k.includes('keToan'); })());
check('menu kế toán: DO, không có kế hoạch', (() => { const k = F.menuTheoVai('account').map((m) => m.key); return k.includes('keToan') && !k.includes('keHoach'); })());
check('menu viewer chỉ xem: công nợ + trả hàng + tất cả đơn + theo mã + báo cáo kênh', F.menuTheoVai('viewer').map((m) => m.key).join() === 'congNo,traHang,tatCaDon,theoMa,baoCao');
check('menu Báo cáo kênh: nội bộ trừ Kho / QC; khách không có', ['admin', 'planner', 'account', 'viewer'].every((r) => F.menuTheoVai(r).some((m) => m.key === 'baoCao'))
  && !F.menuTheoVai('qc').some((m) => m.key === 'baoCao') && !F.menuTheoVai('partner', 'nskx').some((m) => m.key === 'baoCao'));
check('laNoiBo / laKhach', F.laNoiBo('planner') && !F.laNoiBo('partner') && F.laKhach('dealer') && !F.laKhach('admin'));
check('toneClass: tone lạ -> gray', F.toneClass('xyz') === 'tag tag-gray' && F.toneClass('amber') === 'tag tag-amber');
check('demDongDan bỏ dòng trống', F.demDongDan('a 1\n\n b 2\n  \n') === 2);
check('homNay theo giờ Việt Nam (17:30 UTC = sang ngày kế)', F.homNay('2026-11-11T17:30:00Z') === '2026-11-12' && F.homNay('2026-11-11T16:30:00Z') === '2026-11-11');
check('sdtHopLe', F.sdtHopLe('0901 234 567') && F.sdtHopLe('+84901234567') && !F.sdtHopLe('abc') && !F.sdtHopLe('123'));
const kho = (() => { const m = new Map(); return { setItem: (k, v) => m.set(k, v), getItem: (k) => (m.has(k) ? m.get(k) : null) }; })();
F.nhoNguoi(kho, { ten: 'Nguyễn A', sdt: '0901234567' });
check('nhớ / đọc người thao tác', F.layNguoi(kho).ten === 'Nguyễn A' && F.layNguoi(kho).sdt === '0901234567');
check('đọc người khi chưa có / hỏng', F.layNguoi({ getItem: () => 'rác{' }).ten === '' && F.layNguoi({ getItem: () => { throw new Error('x'); } }).ten === '');

// ---- đợt 38: nhập đơn cũ, báo cáo, Excel ----
const bd = F.docBangDonCu([['Mã đơn cũ', 'Mã đối tác', 'Ngày đặt', 'Mã hàng', 'SL', 'Đơn giá (bỏ trống = giá hiện hành)', 'Ngày xuất kho'], ['Asia 07', 'ASIA', new Date(2026, 9, 5), '1000101', 3, '', '07/10/2026'], ['', '', '', '', '', '', '']]);
check('docBangDonCu: khớp tiêu đề không dấu / bỏ ngoặc, ngày Date -> ISO, bỏ dòng trống', bd.thieuCot.length === 0 && bd.rows.length === 1 && bd.rows[0].ngayDat === '2026-10-05' && bd.rows[0].sl === 3 && bd.rows[0].donGia === '' && bd.rows[0].ngayXuat === '07/10/2026', bd);
check('docBangDonCu: báo thiếu cột bắt buộc', F.docBangDonCu([['ma don cu', 'SL'], ['x', 1]]).thieuCot.join() === 'Mã đối tác,Ngày đặt,Mã hàng', F.docBangDonCu([['ma don cu', 'SL'], ['x', 1]]));
check('tachBangDan: tách tab, bỏ dòng trống', JSON.stringify(F.tachBangDan('a\tb\n\nc\td\r\n')) === JSON.stringify([['a', 'b'], ['c', 'd']]));
check('fmtPct', F.fmtPct(30) === '30%' && F.fmtPct(null) === '—' && F.fmtPct(12.34).startsWith('12,3'));
const X = await import('../src/utils/excel.js');
const bx = X.bangXuat([{ key: 'ma', nhan: 'Mã' }, { key: 'sl', nhan: 'SL', kieu: 'so' }, { key: 'ngay', nhan: 'Ngày', kieu: 'ngay' }, { nhan: 'Tính', lay: (r) => r.sl * 2 }],
  [{ ma: 'A', sl: '3', ngay: '2026-11-16 08:30' }, { ma: 'B', sl: '', ngay: 'lạ' }]);
check('bangXuat: tiêu đề, số, ngày -> Date, ô rỗng, cột tính', bx.aoa[0].join() === 'Mã,SL,Ngày,Tính' && bx.aoa[1][1] === 3 && bx.aoa[1][2] instanceof Date && bx.aoa[1][2].getHours() === 8 && bx.aoa[1][2].getDate() === 16
  && bx.aoa[2][1] === null && bx.aoa[2][2] === 'lạ' && bx.aoa[1][3] === 6 && bx.kieu[1] === 'so');
check('tenTepExcel: bỏ ký tự cấm, thêm ngày', X.tenTepExcel('Đơn: GT2/11', '2026-11-16') === 'Đơn- GT2-11_2026-11-16.xlsx');

console.log('\n' + (fail ? 'THẤT BẠI' : 'ĐẠT') + ': ' + pass + ' đạt, ' + fail + ' lỗi');
process.exit(fail ? 1 : 0);
