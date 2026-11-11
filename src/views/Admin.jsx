import React, { useState } from 'react';
import { api } from '../services/api';
import { Spinner, Loi, Tag, useTai, useLam, useUi } from '../ui';
import { fmtNgay, fmtNum, NHAN_MIEN } from '../utils/format';
import { DonChiTiet, FormSo } from './Don';

/** Việc của Admin: đơn chờ duyệt, đơn đã duyệt chưa có SO, dòng sẵn sàng báo kế toán tạo DO. */
export default function HvAdmin({ me }) {
  const { toast, hoi } = useUi();
  const [dang, lam] = useLam();
  const hv = useTai(() => api('getHangViecAdmin'), []);
  const [mo, setMo] = useState(null);
  const [so, setSo] = useState(null);
  const [chon, setChon] = useState({});
  const d = hv.data;

  async function duyetNhanh(x) {
    let r = await lam(() => api('approveDon', x.id, {}));
    if (!r) return;
    if (!r.daDuyet) {
      const ok = await hoi({ title: '⚠️ Cảnh báo hạn mức — ' + x.ma, msg: r.canhBao.lyDo.join('\n') + '\n\nChỉ cảnh báo — bạn quyết định. Vẫn duyệt?', okText: 'Vẫn duyệt', cancelText: 'Chưa duyệt', danger: true });
      if (!ok) return;
      r = await lam(() => api('approveDon', x.id, { xacNhanVuotHanMuc: true }));
      if (!r || !r.daDuyet) return;
    }
    toast('Đã duyệt ' + x.ma + '.', 'ok');
    hv.reload();
  }
  async function baoDo() {
    const ids = Object.keys(chon).filter((k) => chon[k]).map(Number);
    if (!ids.length) return;
    if (await lam(() => api('requestDo', { dongIds: ids }), 'Đã báo kế toán tạo DO cho ' + ids.length + ' dòng.')) { setChon({}); hv.reload(); }
  }

  if (hv.loading && !d) return <Spinner />;
  if (hv.error) return <Loi onRetry={hv.reload}>{hv.error}</Loi>;
  return (
    <div>
      <div className="card">
        <h3>Đơn chờ duyệt ({d.choDuyet.length})</h3>
        <div className="tablewrap"><table>
          <thead><tr><th>Mã đơn</th><th>Đối tác</th><th>Miền</th><th>PO</th><th className="num">Dòng</th><th className="num">Giá trị</th><th>Đặt lúc</th><th /></tr></thead>
          <tbody>
            {d.choDuyet.map((x) => (
              <tr key={x.id}>
                <td><a href="#" onClick={(e) => { e.preventDefault(); setMo(x.id); }}><b>{x.ma}</b></a></td><td>{x.doiTac}</td><td>{x.mienNhan}</td><td>{x.poKhach}</td>
                <td className="num">{x.soDong}</td><td className="num">{fmtNum(x.tong)}</td><td className="nowrap">{fmtNgay(x.taoLuc)}</td>
                <td className="right"><button className="btn sm pri" disabled={dang} onClick={() => duyetNhanh(x)}>Duyệt</button></td>
              </tr>
            ))}
            {!d.choDuyet.length && <tr><td colSpan={8} className="muted">Không có đơn nào chờ duyệt.</td></tr>}
          </tbody>
        </table></div>
      </div>

      <div className="card">
        <h3>Đã duyệt — chưa có số SO ({d.chuaCoSo.length})</h3>
        <div className="tablewrap"><table>
          <thead><tr><th>Mã đơn</th><th>Đối tác</th><th>Miền</th><th>PO</th><th>Duyệt lúc</th><th /></tr></thead>
          <tbody>
            {d.chuaCoSo.map((x) => (
              <tr key={x.id}><td><a href="#" onClick={(e) => { e.preventDefault(); setMo(x.id); }}><b>{x.ma}</b></a></td><td>{x.doiTac}</td><td>{x.mienNhan}</td><td>{x.poKhach}</td><td className="nowrap">{fmtNgay(x.duyetLuc)}</td>
                <td className="right"><button className="btn sm" onClick={() => setSo({ id: x.id, ma: x.ma, soSap: '', soNgay: '' })}>Nhập SO</button></td></tr>
            ))}
            {!d.chuaCoSo.length && <tr><td colSpan={6} className="muted">Đơn nào đã duyệt cũng đã có SO.</td></tr>}
          </tbody>
        </table></div>
      </div>

      <div className="card">
        <h3>Sẵn sàng báo kế toán tạo DO ({d.choBaoDo.length}) <span className="small muted">— dòng đã có SO + ngày giao dự kiến</span></h3>
        <div className="tablewrap"><table>
          <thead><tr><th /><th>Đơn</th><th>SO</th><th>Mã</th><th>Tên</th><th className="num">SL</th><th>Ngày giao dự kiến</th></tr></thead>
          <tbody>
            {d.choBaoDo.map((x) => (
              <tr key={x.dongId}>
                <td><input type="checkbox" checked={!!chon[x.dongId]} onChange={(e) => setChon({ ...chon, [x.dongId]: e.target.checked })} /></td>
                <td><b>{x.ma}</b> <span className="muted small">{x.doiTac} {NHAN_MIEN[x.mien]}</span></td><td>{x.soSap}</td><td><b>{x.sku}</b></td><td>{x.ten}</td><td className="num">{fmtNum(x.qty)}</td><td>{fmtNgay(x.ngayGiaoDk)}</td>
              </tr>
            ))}
            {!d.choBaoDo.length && <tr><td colSpan={7} className="muted">Không có dòng nào chờ báo.</td></tr>}
          </tbody>
        </table></div>
        <div className="actions"><button className="btn pri" disabled={dang || !Object.values(chon).some(Boolean)} onClick={baoDo}>Báo kế toán tạo DO cho các dòng đã chọn</button></div>
      </div>
      {mo && <DonChiTiet id={mo} me={me} onClose={() => setMo(null)} onDoi={hv.reload} />}
      {so && <FormSo don={{ id: so.id, ma: so.ma, soSap: '', soNgay: '' }} onClose={() => setSo(null)} onXong={() => { setSo(null); hv.reload(); }} />}
    </div>
  );
}

export { Tag };
