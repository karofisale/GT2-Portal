import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { Field, Spinner, Loi, useTai, useLam, useUi } from '../ui';
import { fmtNum, fmtTien, NHAN_MIEN, nhoNguoi, layNguoi, sdtHopLe, homNay } from '../utils/format';

const CO_MIEN = ['nskx', '3t'];

/**
 * Đặt đơn mới / sửa đơn chưa duyệt (suaId). Giỏ hàng gộp hai cách nhập: dán danh sách (xem trước ở máy chủ) và chọn từ danh mục.
 * NSKX / 3T: mỗi dòng một miền — nhiều miền thì máy chủ tự tách thành nhiều đơn.
 */
export default function DatHang({ me, suaId, onXong }) {
  const { toast } = useUi();
  const [dang, lam] = useLam();
  const loai = me.doiTac ? me.doiTac.loai : '';
  const coMien = CO_MIEN.indexOf(loai) >= 0;
  const sua = useTai(() => (suaId ? api('getDon', suaId) : Promise.resolve(null)), [suaId]);
  const cat = useTai(() => api('getSanPham', {}), []);
  const [lines, setLines] = useState([]);                 // [{ sku, ten, gia, qty, mien }]
  const [mienMd, setMienMd] = useState(coMien ? 'bac' : '');
  const [text, setText] = useState('');
  const [pv, setPv] = useState(null);
  const [loc, setLoc] = useState('');
  const [f, setF] = useState(() => ({ poKhach: '', ngayCan: '', ghiChu: '', diem: { ten: '', lienHe: '', sdt: '', diaChi: '' }, nguoi: layNguoi(window.localStorage) }));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const setDiem = (k, v) => setF((x) => ({ ...x, diem: { ...x.diem, [k]: v } }));

  // Sửa đơn: nạp sẵn dòng + thông tin giao
  useEffect(() => {
    const d = sua.data;
    if (!d) return;
    setLines(d.dongs.filter((x) => x.trangThai !== 'huy').map((x) => ({ sku: x.sku, ten: x.ten, gia: x.gia, qty: x.qty, mien: d.don.mien })));
    setMienMd(d.don.mien || '');
    setF((x) => ({ ...x, poKhach: d.don.poKhach, ngayCan: d.don.ngayCan, ghiChu: d.don.ghiChu, diem: { ten: d.don.diem.ten, lienHe: d.don.diem.lienHe, sdt: d.don.diem.sdt, diaChi: d.don.diem.diaChi }, nguoi: layNguoi(window.localStorage) }));
  }, [sua.data]);

  const items = (cat.data && cat.data.items) || [];
  const locDs = useMemo(() => {
    const q = loc.trim().toLowerCase();
    return items.filter((x) => !q || (x.sku + ' ' + x.name + ' ' + x.category).toLowerCase().indexOf(q) >= 0).slice(0, 60);
  }, [items, loc]);

  const them = (sp, qty) => setLines((ls) => {
    const i = ls.findIndex((l) => l.sku.toLowerCase() === sp.sku.toLowerCase() && l.mien === (coMien ? mienMd : ''));
    if (i >= 0) return ls.map((l, j) => (j === i ? { ...l, qty: l.qty + qty } : l));
    return ls.concat({ sku: sp.sku, ten: sp.name || sp.ten || '', gia: sp.gia, qty, mien: coMien ? mienMd : '' });
  });

  async function kiemTra() {
    const r = await lam(() => api('previewDon', { text }));
    if (!r) return;
    setPv(r);
    r.items.filter((x) => x.ok).forEach((x) => them({ sku: x.sku, name: x.ten, gia: x.gia }, x.qty));
    if (!r.coLoi) { setText(''); toast('Đã thêm ' + r.items.length + ' dòng vào đơn.', 'ok'); setPv(null); }
    else setText(r.loiDong.map((t) => t.split(' — ')[0]).concat(r.items.filter((x) => !x.ok).map((x) => x.sku + '\t' + x.qty)).join('\n'));   // chỉ giữ lại các dòng sai để sửa — bấm lại không cộng trùng dòng đúng
  }

  const tong = lines.reduce((a, l) => a + l.qty * l.gia, 0);
  async function gui() {
    if (!lines.length) { toast('Chưa có mã hàng nào trong đơn.', 'err'); return; }
    if (!f.nguoi.ten.trim()) { toast('Nhập TÊN người đặt hàng.', 'err'); return; }
    if (!sdtHopLe(f.nguoi.sdt)) { toast('Nhập SỐ ĐIỆN THOẠI người đặt hàng (8–15 chữ số).', 'err'); return; }
    if (f.ngayCan && f.ngayCan < homNay()) { toast('Ngày cần hàng không được ở quá khứ.', 'err'); return; }
    const body = { nguoi: f.nguoi, diem: f.diem, poKhach: f.poKhach, ngayCan: f.ngayCan || '', ghiChu: f.ghiChu, lines: lines.map((l) => ({ sku: l.sku, qty: l.qty, mien: l.mien })) };
    const r = await lam(() => (suaId ? api('updateDon', suaId, body) : api('createDon', body)));
    if (!r) return;
    nhoNguoi(window.localStorage, f.nguoi);
    toast(suaId ? 'Đã lưu thay đổi đơn ' + r.ma + '.' : 'Đã gửi ' + r.dons.length + ' đơn: ' + r.dons.map((d) => d.ma + (d.mien ? ' (' + NHAN_MIEN[d.mien] + ')' : '')).join(', ') + ' — chờ Karofi duyệt.', 'ok');
    onXong && onXong();
  }

  if (suaId && sua.loading) return <Spinner />;
  if (sua.error) return <Loi onRetry={sua.reload}>{sua.error}</Loi>;

  return (
    <div>
      {!suaId && <p className="muted">Chỉ đặt được các mã trong danh mục của bạn. Đơn chưa được Karofi duyệt thì còn sửa / huỷ được.</p>}
      <div className="card">
        <h3>Người đặt hàng <span className="small muted">(tài khoản dùng chung — ghi rõ ai thao tác)</span></h3>
        <div className="row">
          <Field label="Họ tên *" style={{ minWidth: 200 }}><input value={f.nguoi.ten} onChange={(e) => set('nguoi', { ...f.nguoi, ten: e.target.value })} /></Field>
          <Field label="Số điện thoại *" style={{ minWidth: 160 }}><input value={f.nguoi.sdt} onChange={(e) => set('nguoi', { ...f.nguoi, sdt: e.target.value })} inputMode="tel" /></Field>
          <Field label="Số PO của bạn"><input value={f.poKhach} onChange={(e) => set('poKhach', e.target.value)} /></Field>
          <Field label="Ngày cần hàng"><input type="date" value={f.ngayCan || ''} onChange={(e) => set('ngayCan', e.target.value)} /></Field>
        </div>
        <div className="row">
          <Field label={'Điểm giao hàng' + (coMien ? ' *' : '')} style={{ minWidth: 200 }}><input value={f.diem.ten} onChange={(e) => setDiem('ten', e.target.value)} /></Field>
          <Field label="Người liên hệ"><input value={f.diem.lienHe} onChange={(e) => setDiem('lienHe', e.target.value)} /></Field>
          <Field label="SĐT liên hệ"><input value={f.diem.sdt} onChange={(e) => setDiem('sdt', e.target.value)} inputMode="tel" /></Field>
          <Field label={'Địa chỉ giao' + (coMien ? ' *' : '')} style={{ flex: 1, minWidth: 240 }}><input value={f.diem.diaChi} onChange={(e) => setDiem('diaChi', e.target.value)} /></Field>
        </div>
        <Field label="Ghi chú"><input value={f.ghiChu} onChange={(e) => set('ghiChu', e.target.value)} /></Field>
      </div>

      {!suaId && (
        <div className="card">
          <h3>Thêm mã hàng</h3>
          {coMien && (
            <Field label="Miền giao của các dòng sắp thêm" style={{ maxWidth: 240 }}>
              <select value={mienMd} onChange={(e) => setMienMd(e.target.value)}><option value="bac">Miền Bắc</option><option value="nam">Miền Nam</option></select>
            </Field>
          )}
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div className="grow" style={{ minWidth: 280 }}>
              <Field label="Dán danh sách (mỗi dòng: Mã  Số lượng — copy từ Excel)">
                <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={'123456  10\n654321  4'} />
              </Field>
              <button className="btn pri" disabled={dang || !text.trim()} onClick={kiemTra}>Kiểm tra & thêm vào đơn</button>
              {pv && pv.coLoi && (
                <div className="notice warn" style={{ marginTop: 8 }}>
                  Các dòng đúng đã được thêm. Còn dòng chưa hợp lệ (sửa rồi dán lại):
                  <ul style={{ margin: '4px 0 0 18px', padding: 0 }}>
                    {pv.loiDong.map((t, i) => <li key={'l' + i}>{t}</li>)}
                    {pv.items.filter((x) => !x.ok).map((x, i) => <li key={'m' + i}>{x.sku}: {x.loi}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="grow" style={{ minWidth: 280 }}>
              <Field label="Hoặc tìm trong danh mục">
                <input value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="Mã / tên / nhóm hàng" />
              </Field>
              {cat.loading ? <Spinner /> : cat.error ? <Loi onRetry={cat.reload}>{cat.error}</Loi> : (
                <div className="tablewrap" style={{ maxHeight: 220, overflow: 'auto' }}>
                  <table>
                    <tbody>
                      {locDs.map((sp) => (
                        <tr key={sp.sku}>
                          <td><b>{sp.sku}</b><div className="small muted">{sp.name}</div></td>
                          <td className="num nowrap">{fmtTien(sp.gia)}</td>
                          <td className="right"><button className="btn sm" onClick={() => them(sp, 1)}>+ Thêm</button></td>
                        </tr>
                      ))}
                      {!locDs.length && <tr><td className="muted">Không có mã phù hợp.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Đơn hàng ({lines.length} dòng)</h3>
        {coMien && !suaId && <p className="small muted">Đơn có cả miền Bắc và miền Nam sẽ được tách thành 2 đơn riêng khi gửi.</p>}
        <div className="tablewrap">
          <table>
            <thead><tr><th>Mã</th><th>Tên</th>{coMien && <th>Miền</th>}<th className="num">SL</th><th className="num">Đơn giá</th><th className="num">Thành tiền</th><th /></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={l.sku + '|' + l.mien}>
                  <td><b>{l.sku}</b></td><td>{l.ten}</td>
                  {coMien && <td>{suaId ? NHAN_MIEN[l.mien] : (
                    <select value={l.mien} onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, mien: e.target.value } : x)))}><option value="bac">Bắc</option><option value="nam">Nam</option></select>)}</td>}
                  <td className="num"><input type="number" min="1" style={{ width: 90, textAlign: 'right' }} value={l.qty}
                    onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, qty: Number(e.target.value) } : x)))} /></td>
                  <td className="num">{fmtTien(l.gia)}</td>
                  <td className="num">{fmtTien(l.qty * l.gia)}</td>
                  <td className="right"><button className="btn sm" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>Xoá</button></td>
                </tr>
              ))}
              {!lines.length && <tr><td colSpan={7} className="muted">Chưa có dòng nào — dán danh sách hoặc chọn từ danh mục ở trên.</td></tr>}
            </tbody>
            {lines.length > 0 && <tfoot><tr><td colSpan={coMien ? 5 : 4} className="right"><b>Tổng (SL {fmtNum(lines.reduce((a, l) => a + l.qty, 0))})</b></td><td className="num"><b>{fmtTien(tong)}</b></td><td /></tr></tfoot>}
          </table>
        </div>
        <div className="actions">
          {onXong && suaId && <button className="btn" onClick={onXong}>Bỏ qua</button>}
          <button className="btn pri" disabled={dang || !lines.length} onClick={gui}>{suaId ? 'Lưu thay đổi' : 'Gửi đơn cho Karofi'}</button>
        </div>
      </div>
    </div>
  );
}
