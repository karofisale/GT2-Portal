/**
 * excel.js — xuất bảng ra .xlsx ngay trên trình duyệt (SheetJS, nạp khi bấm nút — không làm nặng lần mở app).
 * Phần dựng dữ liệu (bangXuat) là hàm thuần, có test (test/format.test.mjs).
 */

/**
 * Dựng mảng 2 chiều cho một sheet. cot = [{ key, nhan, kieu?: 'so' | 'tien' | 'ngay' | 'chu', lay?: (row) => giá trị }].
 * - 'ngay': 'YYYY-MM-DD[ HH:MM]' (giờ VN) -> Date theo giờ máy (SheetJS ghi Date theo giờ máy — dựng bằng UTC sẽ lệch +7 giờ); chuỗi lạ giữ nguyên.
 * - 'so' / 'tien': số; rỗng / không phải số -> ô trống.
 * Trả { aoa, kieu } — aoa[0] là tiêu đề.
 */
export function bangXuat(cot, dong) {
  const aoa = [cot.map((c) => c.nhan)];
  (dong || []).forEach((r) => {
    aoa.push(cot.map((c) => {
      const v = c.lay ? c.lay(r) : r[c.key];
      if (v === null || v === undefined || v === '') return null;
      if (c.kieu === 'so' || c.kieu === 'tien') return isFinite(Number(v)) ? Number(v) : null;
      if (c.kieu === 'ngay') {
        const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(v));
        return m ? new Date(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0) : String(v);   // giờ địa phương: SheetJS ghi Date theo giờ máy
      }
      return typeof v === 'number' || typeof v === 'boolean' ? v : String(v);
    }));
  });
  return { aoa, kieu: cot.map((c) => c.kieu || 'chu') };
}

/** Tên tệp an toàn: bỏ ký tự cấm của Windows, thêm ngày. */
export function tenTepExcel(ten, ngay) {
  const d = ngay || new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  return String(ten || 'GT2').replace(/[\\/:*?"<>|]+/g, '-').trim() + '_' + d + '.xlsx';
}

/** Xuất nhiều sheet: sheets = [{ ten, cot, dong }]. Tự đặt độ rộng cột, định dạng số / tiền / ngày, cố định dòng tiêu đề. */
export async function xuatExcel(tenTep, sheets) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  sheets.forEach((s) => {
    const { aoa, kieu } = bangXuat(s.cot, s.dong);
    const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
    ws['!cols'] = aoa[0].map((h, j) => {
      const dai = aoa.slice(0, 300).reduce((m, r) => Math.max(m, r[j] === null || r[j] === undefined ? 0 : (r[j] instanceof Date ? 10 : String(r[j]).length)), String(h).length);
      return { wch: Math.min(60, Math.max(8, dai + 2)) };
    });
    for (let i = 1; i < aoa.length; i++) {
      kieu.forEach((k, j) => {
        const o = ws[XLSX.utils.encode_cell({ r: i, c: j })];
        if (!o) return;
        if (k === 'tien') o.z = '#,##0';
        else if (k === 'so') o.z = '#,##0.##';
        else if (k === 'ngay' && o.v instanceof Date) o.z = (o.v.getHours() || o.v.getMinutes()) ? 'dd/mm/yyyy hh:mm' : 'dd/mm/yyyy';
      });
    }
    ws['!freeze'] = { xSplit: 0, ySplit: 1 };
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: Math.max(0, aoa.length - 1), c: aoa[0].length - 1 } }) };
    XLSX.utils.book_append_sheet(wb, ws, String(s.ten || 'Sheet').replace(/[\\/?*[\]:]/g, ' ').slice(0, 31));
  });
  XLSX.writeFile(wb, tenTep);
}
