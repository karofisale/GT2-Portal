import React, { useMemo, useState } from 'react';
import { api } from '../services/api';
import { Field, Modal, Spinner, Loi, useTai, useLam, useUi } from '../ui';
import { fmtNgay, fmtNum, NHAN_MIEN, homNay } from '../utils/format';

/** DO & xuất kho (Kế toán / admin): nhập số DO cho các dòng đã báo, rồi đánh dấu DO đã xuất kho (PGI) trên SAP = hoàn thành. */
export default function KeToan() {
  const { hoi } = useUi();
  const [dang, lam] = useLam();
  const hv = useTai(() => api('getHangViecKeToan'), []);
  const [chon, setChon] = useState({});
  const [mo, setMo] = useState(false);
  const d = hv.data;

  const dsChon = useMemo(() => (d ? d.choDo.filter((x) => chon[x.dongId]) : []), [d, chon]);
  const khacDt = new Set(dsChon.map((x) => x.doiTac)).size > 1;

  // DO đã nhập chờ xuất kho, gom theo số DO
  const theoDo = useMemo(() => {
    const m = new Map();
    (d ? d.choPgi : []).forEach((x) => { if (!m.has(x.soDo)) m.set(x.soDo, { soDo: x.soDo, ngayDo: x.ngayDo, doiTac: x.doiTac, dong: [] }); m.get(x.soDo).dong.push(x); });
    return [...m.values()];
  }, [d]);

  async function pgi(g) {
    const ngay = await hoi({ title: 'DO ' + g.soDo + ' đã xuất kho (PGI)?', msg: 'Xác nhận DO đã xuất kho trên SAP — các dòng đủ SL sẽ chuyển HOÀN THÀNH. Ngày xuất kho (YYYY-MM-DD):', input: true, okText: 'Đã xuất kho', cancelText: 'Chưa' });
    if (ngay === null || ngay === false) return;
    if (await lam(() => api('markPgi', { soDo: g.soDo, ngayPgi: /^\d{4}-\d{2}-\d{2}$/.test(ngay) ? ngay : homNay() }), 'Đã ghi xuất kho DO ' + g.soDo + '.')) hv.reload();
  }
  async function xoa(g) {
    if (!(await hoi({ title: 'Xoá DO ' + g.soDo + '?', msg: 'Chỉ dùng khi nhập nhầm. DO chưa xuất kho nên xoá được.', okText: 'Xoá DO', danger: true }))) return;
    if (await lam(() => api('deleteDo', { soDo: g.soDo }), 'Đã xoá DO ' + g.soDo + '.')) hv.reload();
  }

  if (hv.loading && !d) return <Spinner />;
  if (hv.error) return <Loi onRetry={hv.reload}>{hv.error}</Loi>;
  return (
    <div>
      <div className="card">
        <h3>Chờ tạo DO ({d.choDo.length})</h3>
        <div className="tablewrap"><table>
          <thead><tr><th /><th>Đơn</th><th>SO</th><th>Điểm giao</th><th>Mã / tên</th><th className="num">SL</th><th>Ngày giao dự kiến</th></tr></thead>
          <tbody>
            {d.choDo.map((x) => (
              <tr key={x.dongId}>
                <td><input type="checkbox" checked={!!chon[x.dongId]} onChange={(e) => setChon({ ...chon, [x.dongId]: e.target.checked })} /></td>
                <td><b>{x.ma}</b><div className="small muted">{x.doiTac} {NHAN_MIEN[x.mien]}</div></td><td>{x.soSap}</td><td className="small">{x.diemTen}</td>
                <td><b>{x.sku}</b><div className="small muted">{x.ten}</div></td><td className="num">{fmtNum(x.qty)}</td><td>{fmtNgay(x.ngayGiaoDk)}</td>
              </tr>
            ))}
            {!d.choDo.length && <tr><td colSpan={7} className="muted">Không có dòng nào chờ tạo DO.</td></tr>}
          </tbody>
        </table></div>
        {khacDt && <div className="notice warn" style={{ marginTop: 8 }}>Các dòng đã chọn thuộc nhiều đối tác — một DO chỉ giao cho MỘT đối tác, hãy chọn riêng từng đối tác.</div>}
        <div className="actions"><button className="btn pri" disabled={dang || !dsChon.length || khacDt} onClick={() => setMo(true)}>Nhập DO cho {dsChon.length} dòng đã chọn</button></div>
      </div>

      <div className="card">
        <h3>DO đã nhập — chờ xuất kho ({theoDo.length})</h3>
        <div className="tablewrap"><table>
          <thead><tr><th>Số DO</th><th>Ngày DO</th><th>Đối tác</th><th>Các dòng</th><th /></tr></thead>
          <tbody>
            {theoDo.map((g) => (
              <tr key={g.soDo}>
                <td><b>{g.soDo}</b></td><td>{fmtNgay(g.ngayDo)}</td><td>{g.doiTac}</td>
                <td className="small">{g.dong.map((x) => <div key={x.giaoId}>{x.ma} (SO {x.soSap}) · <b>{x.sku}</b> × {fmtNum(x.sl)}</div>)}</td>
                <td className="right nowrap"><button className="btn sm pri" disabled={dang} onClick={() => pgi(g)}>Đã xuất kho (PGI)</button> <button className="btn sm" disabled={dang} onClick={() => xoa(g)}>Xoá</button></td>
              </tr>
            ))}
            {!theoDo.length && <tr><td colSpan={5} className="muted">Không có DO nào chờ xuất kho.</td></tr>}
          </tbody>
        </table></div>
      </div>
      {mo && <FormDo dong={dsChon} onClose={() => setMo(false)} onXong={() => { setMo(false); setChon({}); hv.reload(); }} />}
    </div>
  );
}

function FormDo({ dong, onClose, onXong }) {
  const [dang, lam] = useLam();
  const [soDo, setSoDo] = useState('');
  const [ngay, setNgay] = useState(homNay());
  const [sl, setSl] = useState(() => Object.fromEntries(dong.map((x) => [x.dongId, x.qty])));
  async function luu() {
    const items = dong.map((x) => ({ dongId: x.dongId, sl: Number(sl[x.dongId]) }));
    if (await lam(() => api('saveDo', { soDo, ngayDo: ngay, items }), 'Đã nhập DO ' + soDo + '.')) onXong();
  }
  return (
    <Modal title="Nhập DO" onClose={onClose} wide actions={<><button className="btn" onClick={onClose}>Đóng</button><button className="btn pri" disabled={dang || !soDo.trim()} onClick={luu}>Lưu DO</button></>}>
      <div className="row">
        <Field label="Số DO (SAP, 8–12 chữ số)"><input autoFocus value={soDo} onChange={(e) => setSoDo(e.target.value)} /></Field>
        <Field label="Ngày DO"><input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} /></Field>
      </div>
      <div className="tablewrap"><table>
        <thead><tr><th>Đơn</th><th>Mã</th><th className="num">SL đặt</th><th className="num">SL trong DO</th></tr></thead>
        <tbody>{dong.map((x) => <tr key={x.dongId}><td>{x.ma}</td><td><b>{x.sku}</b></td><td className="num">{fmtNum(x.qty)}</td>
          <td className="num"><input type="number" min="0" style={{ width: 100, textAlign: 'right' }} value={sl[x.dongId]} onChange={(e) => setSl({ ...sl, [x.dongId]: e.target.value })} /></td></tr>)}</tbody>
      </table></div>
      <p className="small muted">SL trong DO không được vượt SL còn lại của dòng. Giao một phần: nhập SL nhỏ hơn, DO sau giao nốt.</p>
    </Modal>
  );
}
