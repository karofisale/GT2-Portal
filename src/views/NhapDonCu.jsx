import React, { useState } from 'react';
import { api } from '../services/api';
import { Field, useLam, useUi } from '../ui';
import { COT_DON_CU, docBangDonCu, tachBangDan, fmtTien } from '../utils/format';
import { xuatExcel, tenTepExcel } from '../utils/excel';

/**
 * Nhập đơn cũ (đợt 38): đưa lịch sử đơn đang theo dõi bằng Excel / Google Sheet vào app MỘT lần lúc chuyển. Mỗi dòng = một mã hàng của một đơn cũ.
 * Chọn tệp Excel theo mẫu (hoặc dán từ Excel) -> Kiểm tra (không ghi) -> Ghi. Nhập lại cùng tệp vô hại (đơn đã có bỏ qua).
 */
export default function NhapDonCu() {
  const { toast } = useUi();
  const [dang, lam] = useLam();
  const [rows, setRows] = useState(null);
  const [dan, setDan] = useState('');
  const [kq, setKq] = useState(null);
  const [boQuaLoi, setBoQuaLoi] = useState(false);

  const nhan = (aoa, nguon) => {
    const r = docBangDonCu(aoa);
    if (r.thieuCot.length) { toast('Thiếu cột: ' + r.thieuCot.join(', ') + ' — tải mẫu để xem đúng tiêu đề.', 'err'); setRows(null); return; }
    setRows(r.rows); setKq(null);
    toast('Đã đọc ' + r.rows.length + ' dòng từ ' + nguon + '. Bấm "Kiểm tra".', 'ok');
  };
  async function chonTep(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      nhan(XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: '' }), f.name);
    } catch (err) { toast('Không đọc được tệp: ' + (err.message || String(err)), 'err'); }
  }
  const taiMau = () => xuatExcel(tenTepExcel('Mau-nhap-don-cu-GT2'), [{ ten: 'Đơn cũ', cot: COT_DON_CU.map(([k, n]) => ({ key: k, nhan: n })),
    dong: [Object.fromEntries(COT_DON_CU.map(([k, , v]) => [k, v])), { maCu: 'Asia 07', doiTac: 'ASIA', ngayDat: '05/10/2026', sku: '2000201', ten: 'Lõi PP', sl: 20, so: '1000400007', ngaySo: '05/10/2026', soDo: '6000400007', ngayXuat: '07/10/2026' }] }]);
  async function chay(xemTruoc) {
    if (!rows || !rows.length) { toast('Chưa có dòng nào — chọn tệp hoặc dán bảng.', 'err'); return; }
    const r = await lam(() => api('importDonCu', { rows, xemTruoc, boQuaLoi }));
    if (r) { setKq(r); if (r.daGhi) toast('Đã nhập ' + r.moi + ' đơn cũ.', 'ok'); }
  }

  return (
    <div>
      <p className="small muted">Dùng MỘT lần lúc chuyển sang app: lịch sử đơn NSKX / 3T / Toa BHT (Asia, Des…) đang ở Excel / Google Sheet. Mỗi dòng = một mã hàng của một đơn cũ.
        Có số DO + ngày xuất kho → coi như đã giao; giao đủ mọi dòng → đơn <b>Hoàn thành</b>, còn thiếu → <b>Đã duyệt</b> (vào hàng việc Kế hoạch / Kế toán).
        Đơn giá bỏ trống thì lấy giá hiện hành của đối tác. Kênh BHT: ghi "Đã thanh toán" để sổ công nợ không báo nợ ảo. Mã đơn trong app = <code>LS-</code> + mã cũ.</p>
      <div className="row">
        <button className="btn" onClick={taiMau}>⬇ Tải mẫu Excel</button>
        <label className="btn pri">Chọn tệp Excel…<input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={chonTep} /></label>
      </div>
      <Field label="…hoặc dán bảng từ Excel (gồm dòng tiêu đề)">
        <textarea value={dan} onChange={(e) => setDan(e.target.value)} style={{ minHeight: 90, fontFamily: 'monospace' }} placeholder={COT_DON_CU.map((c) => c[1]).join('\t')} />
      </Field>
      <div className="row">
        <button className="btn" disabled={!dan.trim()} onClick={() => nhan(tachBangDan(dan), 'ô dán')}>Đọc bảng dán</button>
        <label className="small"><input type="checkbox" checked={boQuaLoi} onChange={(e) => setBoQuaLoi(e.target.checked)} /> Bỏ qua dòng lỗi</label>
        <span className="sp" />
        {rows && <span className="small muted">{rows.length} dòng đã đọc</span>}
        <button className="btn" disabled={dang || !rows} onClick={() => chay(true)}>Kiểm tra</button>
        <button className="btn pri" disabled={dang || !rows || !kq || kq.daGhi || (kq.soLoi > 0 && !boQuaLoi)} onClick={() => chay(false)}>Ghi vào app</button>
      </div>
      {kq && (
        <div className={'notice ' + (kq.soLoi ? 'warn' : 'ok')} style={{ marginTop: 8 }}>
          {kq.daGhi ? <b>Đã ghi. </b> : <b>Kết quả kiểm tra (chưa ghi). </b>}
          {kq.soDon} đơn / {kq.soDong} dòng{kq.moi !== undefined && <> — mới {kq.moi} (hoàn thành {kq.hoanThanh}, đang giao {kq.dangGiao}), đã có {kq.daCo}, tổng giá trị {fmtTien(kq.tongGiaTri)}</>}.
          {kq.soThieuGia > 0 && <div>⚠️ {kq.soThieuGia} dòng chưa có giá (giá 0): {kq.thieuGia.join(', ')}</div>}
          {kq.trungSo && kq.trungSo.length > 0 && <div>⚠️ SO đã gắn đơn khác — bỏ SO ở: {kq.trungSo.join(', ')}</div>}
          {kq.soLoi > 0 && <div style={{ marginTop: 6 }}><b>{kq.soLoi} dòng lỗi{boQuaLoi ? ' (sẽ bỏ qua)' : ' — sửa tệp hoặc tick "Bỏ qua dòng lỗi"'}:</b><ul className="small">{kq.loi.map((l, i) => <li key={i}>{l}</li>)}</ul></div>}
          {kq.mau && kq.mau.length > 0 && !kq.daGhi && <div className="small muted">Ví dụ: {kq.mau.map((m) => m.ma + ' (' + m.doiTac + ', ' + m.soDong + ' dòng, ' + (m.status === 'hoan_thanh' ? 'hoàn thành' : 'đang giao') + ')').join(' · ')}</div>}
        </div>
      )}
    </div>
  );
}
