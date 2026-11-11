import React, { useState } from 'react';
import { api } from '../services/api';
import { Spinner, Loi, Tag, useTai, useLam, useUi } from '../ui';
import { fmtNgay, fmtNum, NHAN_MIEN, homNay } from '../utils/format';

const NGUON = { co_san: 'Đủ tồn kho riêng', nha_may: 'Từ nhà máy', leadtime: 'Theo leadtime', khong_co: 'Chưa có cơ sở' };

/**
 * Kế hoạch giao hàng: (1) dòng chờ xác nhận ngày giao — hạn 1 ngày làm việc tính từ lúc admin duyệt, có gợi ý từ tồn kho + leadtime;
 * (2) dòng cần cập nhật (ngày giao đã quá lâu chưa cập nhật). Planner chốt NGÀY hoặc chọn LÝ DO chưa có ngày.
 */
export default function KeHoach() {
  const { toast } = useUi();
  const [dang, lam] = useLam();
  const [tab, setTab] = useState('cho');
  const hv = useTai(() => api('getHangViecKeHoach'), []);
  const ld = useTai(() => api('getLyDo'), []);
  const [nhap, setNhap] = useState({});          // dongId -> { ngay, lyDo, ghiChu }
  const d = hv.data;
  const lyDo = ld.data ? ld.data.items.filter((x) => x.active) : [];
  const set = (id, k, v) => setNhap((n) => ({ ...n, [id]: { ...(n[id] || {}), [k]: v } }));
  const dungGoiY = (x) => setNhap((n) => ({ ...n, [x.id]: x.goiY.ngay ? { ngay: x.goiY.ngay, lyDo: '', ghiChu: '' } : { ngay: '', lyDo: x.goiY.lyDoGoiY || '', ghiChu: '' } }));
  const dungGoiYTatCa = () => setNhap((n) => { const m = { ...n }; d.choXacNhan.forEach((x) => { if (x.goiY.ngay && !(m[x.id] && (m[x.id].ngay || m[x.id].lyDo))) m[x.id] = { ngay: x.goiY.ngay, lyDo: '', ghiChu: '' }; }); return m; });

  async function luu() {
    const items = Object.keys(nhap).map((id) => ({ dongId: Number(id), ngay: (nhap[id].ngay || '').trim(), lyDo: nhap[id].ngay ? '' : (nhap[id].lyDo || ''), ghiChu: nhap[id].ghiChu || '' }))
      .filter((it) => it.ngay || it.lyDo);
    if (!items.length) { toast('Chưa nhập ngày / lý do cho dòng nào.', 'err'); return; }
    const r = await lam(() => api('setNgayGiao', { items }), 'Đã lưu ' + items.length + ' dòng.');
    if (r) { setNhap({}); hv.reload(); }
  }

  if (hv.loading && !d) return <Spinner />;
  if (hv.error) return <Loi onRetry={hv.reload}>{hv.error}</Loi>;
  const ds = tab === 'cho' ? d.choXacNhan : d.canCapNhat;
  const soNhap = Object.values(nhap).filter((x) => x.ngay || x.lyDo).length;

  return (
    <div>
      <div className="tabs">
        <button className={tab === 'cho' ? 'on' : ''} onClick={() => setTab('cho')}>Chờ xác nhận ngày giao ({d.choXacNhan.length}{d.choXacNhan.some((x) => x.quaHan) ? ' · có quá hạn' : ''})</button>
        <button className={tab === 'capnhat' ? 'on' : ''} onClick={() => setTab('capnhat')}>Cần cập nhật tuần ({d.canCapNhat.length})</button>
      </div>
      <p className="small muted">Hạn xác nhận: {d.cauHinh.soNgay} ngày làm việc (thứ 2–thứ 7, trừ lịch nghỉ lễ) kể từ lúc admin duyệt. Ngày giao dự kiến quá {d.cauHinh.capNhat} ngày chưa cập nhật sẽ vào tab "Cần cập nhật".</p>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Đơn</th><th>Mã / tên</th><th className="num">SL</th><th className="num">Tồn riêng</th><th className="num">Nhà máy</th>{tab === 'cho' && <th>Hạn</th>}<th>Gợi ý</th><th>Ngày giao dự kiến</th><th>Hoặc lý do chưa có ngày</th><th>Ghi chú</th></tr></thead>
          <tbody>
            {ds.map((x) => {
              const n = nhap[x.id] || {};
              return (
                <tr key={x.id} className={x.quaHan ? 'late' : ''}>
                  <td className="nowrap"><b>{x.ma}</b><div className="small muted">{x.doiTac} {NHAN_MIEN[x.mien]}</div></td>
                  <td><b>{x.sku}</b><div className="small muted">{x.ten} · {x.category}</div></td>
                  <td className="num">{fmtNum(x.qty)}</td><td className="num">{fmtNum(x.tonRieng)}</td><td className="num">{fmtNum(x.tonNhaMay)}</td>
                  {tab === 'cho' && <td className="nowrap small">{fmtNgay(x.han)}{x.quaHan && <div><Tag tone="rose">Quá hạn</Tag></div>}</td>}
                  <td className="small">{x.goiY ? <><Tag tone={x.goiY.ngay ? 'blue' : 'amber'}>{NGUON[x.goiY.nguon]}</Tag>{x.goiY.ngay && <div>{fmtNgay(x.goiY.ngay)}</div>}<div className="muted">{x.goiY.giaiThich}</div><button className="btn sm" onClick={() => dungGoiY(x)}>Dùng gợi ý</button></> : <>Đang: {x.ngayGiaoDk ? fmtNgay(x.ngayGiaoDk) : 'chưa có ngày'}{x.capNhatCach ? <div className="muted">{x.capNhatCach} ngày chưa cập nhật</div> : null}</>}</td>
                  <td><input type="date" min={homNay()} value={n.ngay || ''} onChange={(e) => set(x.id, 'ngay', e.target.value)} /></td>
                  <td><select disabled={!!n.ngay} value={n.lyDo || (tab === 'capnhat' && !x.ngayGiaoDk ? x.lyDo : '') || ''} onChange={(e) => set(x.id, 'lyDo', e.target.value)}><option value="">—</option>{lyDo.map((l) => <option key={l.code} value={l.code}>{l.ten}</option>)}</select></td>
                  <td><input value={n.ghiChu !== undefined ? n.ghiChu : (tab === 'capnhat' ? x.ghiChuKh : '')} onChange={(e) => set(x.id, 'ghiChu', e.target.value)} placeholder="Khách sẽ thấy" style={{ width: 150 }} /></td>
                </tr>
              );
            })}
            {!ds.length && <tr><td colSpan={10} className="muted">{tab === 'cho' ? 'Không có dòng nào chờ xác nhận.' : 'Không có dòng nào cần cập nhật.'}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="actions">
        {tab === 'cho' && <button className="btn" onClick={dungGoiYTatCa}>Dùng gợi ý cho các dòng đủ tồn / có leadtime</button>}
        <button className="btn pri" disabled={dang || !soNhap} onClick={luu}>Lưu {soNhap ? soNhap + ' dòng đã nhập' : ''}</button>
      </div>
    </div>
  );
}
