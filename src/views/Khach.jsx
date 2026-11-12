import React, { useState } from 'react';
import { api } from '../services/api';
import { Field, Spinner, Loi, Tag, useTai } from '../ui';
import { fmtNgay, fmtNum, fmtTien, NHAN_MIEN, NHAN_DONG, laNoiBo } from '../utils/format';

/** Theo mã hàng: một mã xuyên các đơn — SL đặt, đã giao, còn lại, ngày giao dự kiến, SO, DO, trạng thái. */
export function TheoMa({ me }) {
  const [ma, setMa] = useState('');
  const [chay, setChay] = useState('');
  const kq = useTai(() => (chay ? api('locTheoMa', { sku: chay }) : Promise.resolve(null)), [chay]);
  const nhieuDt = laNoiBo(me.role) || (me.doiTac && me.doiTac.loai === 'bht');
  return (
    <div>
      <form className="row" onSubmit={(e) => { e.preventDefault(); setChay(ma.trim()); }}>
        <Field label="Mã hàng" style={{ minWidth: 220 }}><input value={ma} onChange={(e) => setMa(e.target.value)} autoFocus placeholder="vd 1000123 (bỏ số 0 đầu cũng được)" /></Field>
        <button className="btn pri" style={{ marginBottom: 8 }} disabled={!ma.trim()}>Lọc</button>
      </form>
      {kq.loading && chay ? <Spinner /> : kq.error ? <Loi onRetry={kq.reload}>{kq.error}</Loi> : kq.data && (
        <>
          <p className="muted">Mã <b>{kq.data.sku}</b> — tổng SL đặt (các đơn chưa huỷ): <b>{fmtNum(kq.data.tong.dat)}</b></p>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Đơn</th>{nhieuDt && <th>Đối tác</th>}<th>Miền</th><th>PO / SO</th><th className="num">SL đặt</th><th className="num">Đã giao</th><th className="num">Còn lại</th><th>Ngày giao dự kiến</th><th>DO</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {kq.data.items.map((r, i) => (
                  <tr key={i}>
                    <td className="nowrap"><b>{r.ma}</b></td>{nhieuDt && <td>{r.doiTac}</td>}<td>{NHAN_MIEN[r.mien]}</td>
                    <td>{r.poKhach}{r.soSap && <div className="small muted">SO {r.soSap}</div>}</td>
                    <td className="num">{fmtNum(r.qty)}</td><td className="num">{fmtNum(r.daGiao)}</td><td className="num">{fmtNum(r.conLai)}</td>
                    <td>{r.ngayGiaoDk ? fmtNgay(r.ngayGiaoDk) : <span className="muted">{r.lyDo ? 'Chưa có ngày' : '—'}</span>}</td>
                    <td className="small">{r.do.map((x, j) => <div key={j}>{x.soDo} · {fmtNum(x.sl)} {x.pgi ? '✔' : ''}</div>)}</td>
                    <td><Tag tone={r.trangThai === 'hoan_thanh' ? 'emerald' : r.trangThai === 'co_do' ? 'blue' : 'amber'}>{NHAN_DONG[r.trangThai]}</Tag></td>
                  </tr>
                ))}
                {!kq.data.items.length && <tr><td colSpan={10} className="muted">Chưa có đơn nào chứa mã này.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** Danh mục + giá riêng + tồn kho của đối tác (khách thấy tồn kho riêng theo số, nhà máy chỉ "có / hết"). */
export function DanhMucKhach({ me }) {
  const coMien = me.doiTac && ['nskx', '3t'].indexOf(me.doiTac.loai) >= 0;
  const [mien, setMien] = useState(coMien ? 'bac' : '');
  const [q, setQ] = useState('');
  const ds = useTai(() => api('getSanPham', { mien }), [mien]);
  const loc = ds.data ? ds.data.items.filter((x) => !q.trim() || (x.sku + ' ' + x.name + ' ' + x.category).toLowerCase().indexOf(q.trim().toLowerCase()) >= 0) : [];
  const laBht = me.doiTac && me.doiTac.loai === 'bht';   // BHT: giá mua của Karofi + giá BHT bán đại lý
  return (
    <div>
      <div className="row">
        <Field label="Tìm mã / tên / nhóm" style={{ minWidth: 260 }}><input value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        {coMien && <Field label="Kho miền"><select value={mien} onChange={(e) => setMien(e.target.value)}><option value="bac">Miền Bắc</option><option value="nam">Miền Nam</option></select></Field>}
      </div>
      {ds.loading && !ds.data ? <Spinner /> : ds.error ? <Loi onRetry={ds.reload}>{ds.error}</Loi> : (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Mã</th><th>Tên</th><th>Nhóm</th><th className="num">{laBht ? 'Giá mua (Karofi)' : 'Đơn giá'}</th>{laBht && <th className="num">Giá bán đại lý</th>}<th className="num">Tồn kho riêng{coMien ? ' (' + NHAN_MIEN[mien] + ')' : ''}</th><th>Nhà máy</th></tr></thead>
            <tbody>
              {loc.map((x) => (
                <tr key={x.sku}><td><b>{x.sku}</b></td><td>{x.name}</td><td>{x.category}</td><td className="num">{fmtTien(x.gia)}</td>
                  {laBht && <td className="num">{x.giaDaiLy === null || x.giaDaiLy === undefined ? <span className="muted small">—</span> : fmtTien(x.giaDaiLy)}</td>}<td className="num">{fmtNum(x.tonRieng)}</td>
                  <td>{x.nhaMayCo ? <Tag tone="emerald">Có hàng</Tag> : <Tag tone="gray">Hết</Tag>}</td></tr>
              ))}
              {!loc.length && <tr><td colSpan={7} className="muted">Không có mã nào.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="small muted">Tồn kho cập nhật theo lần đồng bộ SAP gần nhất; "Có hàng" của nhà máy chưa phải cam kết giao — ngày giao dự kiến do Karofi xác nhận trên từng đơn.</p>
    </div>
  );
}
