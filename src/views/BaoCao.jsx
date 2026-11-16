import React, { useState } from 'react';
import { api } from '../services/api';
import { Field, Spinner, Loi, Tag, useTai } from '../ui';
import { fmtNum, fmtTien, fmtPct, NHAN_NGUON_KH } from '../utils/format';
import NutExcel from './XuatExcel';

const thangNay = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 7);
const tonePct = (v) => (v === null || v === undefined ? 'gray' : v >= 95 ? 'emerald' : v >= 70 ? 'amber' : 'rose');

/**
 * Báo cáo kênh (pha 4): theo đơn vị FC (NSKX, 3T, GT2 = kênh BHT) — kế hoạch FC (cùng bản mà app FC dùng), GT2 đặt (đơn duyệt trong tháng),
 * GT2 xuất kho (PGI trong tháng), SAP thực bán (số FC đã lấy từ ZSD450). Chi tiết theo mã + xu hướng 6 tháng; xuất Excel.
 */
export default function BaoCao() {
  const [thang, setThang] = useState(thangNay());
  const [dv, setDv] = useState('');
  const bc = useTai(() => api('getBaoCaoKenh', { thang, donVi: dv }), [thang, dv]);
  const d = bc.data;
  const xuat = () => [
    { ten: 'Tổng theo đơn vị', dong: d.donVis, cot: [{ key: 'code', nhan: 'Đơn vị' }, { key: 'name', nhan: 'Tên' }, { key: 'fcSl', nhan: 'Kế hoạch FC (SL)', kieu: 'so' },
      { key: 'datSl', nhan: 'GT2 đặt (SL)', kieu: 'so' }, { key: 'datGt', nhan: 'GT2 đặt (giá trị)', kieu: 'tien' }, { key: 'giaoSl', nhan: 'GT2 xuất kho (SL)', kieu: 'so' },
      { key: 'giaoGt', nhan: 'GT2 xuất kho (giá trị)', kieu: 'tien' }, { key: 'sapSl', nhan: 'SAP thực bán (SL)', kieu: 'so' }, { key: 'sapDt', nhan: 'SAP doanh thu thuần', kieu: 'tien' },
      { key: 'pctDatFc', nhan: '% đặt / FC', kieu: 'so' }, { key: 'pctSapFc', nhan: '% SAP / FC', kieu: 'so' }, { nhan: 'Kế hoạch lấy từ', lay: (r) => NHAN_NGUON_KH[r.keHoachNguon] }] },
    { ten: 'Chi tiết theo mã', dong: d.chiTiet, cot: [{ key: 'donVi', nhan: 'Đơn vị' }, { key: 'sku', nhan: 'Mã' }, { key: 'ten', nhan: 'Tên' }, { key: 'fcSl', nhan: 'Kế hoạch FC', kieu: 'so' },
      { key: 'datSl', nhan: 'GT2 đặt', kieu: 'so' }, { key: 'giaoSl', nhan: 'GT2 xuất kho', kieu: 'so' }, { key: 'sapSl', nhan: 'SAP thực bán', kieu: 'so' }, { key: 'sapDt', nhan: 'SAP doanh thu', kieu: 'tien' },
      { key: 'chenhDatFc', nhan: 'Đặt − FC', kieu: 'so' }, { key: 'pctDatFc', nhan: '% đặt / FC', kieu: 'so' }] },
    { ten: 'Xu hướng', dong: d.xuHuong, cot: [{ key: 'thang', nhan: 'Tháng' }, { key: 'donVi', nhan: 'Đơn vị' }, { key: 'fcSl', nhan: 'Kế hoạch FC', kieu: 'so' }, { key: 'datSl', nhan: 'GT2 đặt', kieu: 'so' },
      { key: 'giaoSl', nhan: 'GT2 xuất kho', kieu: 'so' }, { key: 'sapSl', nhan: 'SAP thực bán', kieu: 'so' }, { key: 'sapDt', nhan: 'SAP doanh thu', kieu: 'tien' }] }];
  const thangs = d ? [...new Set(d.xuHuong.map((x) => x.thang))] : [];
  return (
    <div>
      <div className="row">
        <Field label="Tháng"><input type="month" value={thang} onChange={(e) => e.target.value && setThang(e.target.value)} /></Field>
        <Field label="Chi tiết đơn vị"><select value={dv} onChange={(e) => setDv(e.target.value)}><option value="">Tất cả</option>{d && d.donVis.map((x) => <option key={x.code} value={x.code}>{x.code}</option>)}</select></Field>
        <button className="btn" style={{ marginBottom: 8 }} onClick={bc.reload}>Tải lại</button>
        {d && <span style={{ marginBottom: 8 }}><NutExcel ten={'Bao-cao-kenh-GT2-' + d.thang} lay={xuat} /></span>}
      </div>
      <p className="small muted">Kế hoạch = bản FC đã duyệt (không có thì bản chốt) của chu kỳ phủ tháng, cùng luật với app FC. GT2 đặt = đơn được duyệt trong tháng; xuất kho = DO có ngày PGI trong tháng;
        giá trị theo giá Karofi bán (đơn đại lý: giá Karofi bán BHT). SAP thực bán = số FC đã lấy từ ZSD450 — GT2 không đẩy thêm số vào FC.</p>
      {bc.loading && !d ? <Spinner /> : bc.error ? <Loi onRetry={bc.reload}>{bc.error}</Loi> : (
        <>
          <div className="tablewrap"><table>
            <thead><tr><th>Đơn vị</th><th className="num">Kế hoạch FC</th><th className="num">GT2 đặt</th><th className="num">Giá trị đặt</th><th className="num">GT2 xuất kho</th><th className="num">SAP thực bán</th><th className="num">SAP doanh thu</th><th>% đặt / FC</th><th>% SAP / FC</th><th>Kế hoạch</th></tr></thead>
            <tbody>{d.donVis.map((x) => (
              <tr key={x.code} className="click" onClick={() => setDv(dv === x.code ? '' : x.code)}>
                <td><b>{x.code}</b><div className="small muted">{x.name} · {x.doiTacs.join(', ')}</div></td>
                <td className="num">{fmtNum(x.fcSl)}</td><td className="num">{fmtNum(x.datSl)}</td><td className="num">{fmtTien(x.datGt)}</td><td className="num">{fmtNum(x.giaoSl)}</td>
                <td className="num">{fmtNum(x.sapSl)}</td><td className="num">{fmtTien(x.sapDt)}</td>
                <td><Tag tone={tonePct(x.pctDatFc)}>{fmtPct(x.pctDatFc)}</Tag></td><td><Tag tone={tonePct(x.pctSapFc)}>{fmtPct(x.pctSapFc)}</Tag></td>
                <td className="small">{NHAN_NGUON_KH[x.keHoachNguon]}</td>
              </tr>))}
              {!d.donVis.length && <tr><td colSpan={10} className="muted">Chưa có đối tác nào gắn được với đơn vị FC.</td></tr>}
            </tbody>
          </table></div>

          <h3 style={{ marginTop: 16 }}>Xu hướng {thangs.length} tháng (SL)</h3>
          <div className="tablewrap"><table>
            <thead><tr><th>Đơn vị</th>{thangs.map((t) => <th key={t} className="num">{t.slice(5)}/{t.slice(0, 4)}</th>)}</tr></thead>
            <tbody>{d.donVis.map((x) => (
              <tr key={x.code}><td><b>{x.code}</b><div className="small muted">FC · đặt · SAP</div></td>
                {thangs.map((t) => { const r = d.xuHuong.find((y) => y.thang === t && y.donVi === x.code) || {}; return <td key={t} className="num small">{fmtNum(r.fcSl) || '0'}<br />{fmtNum(r.datSl) || '0'}<br />{fmtNum(r.sapSl) || '0'}</td>; })}
              </tr>))}</tbody>
          </table></div>

          <h3 style={{ marginTop: 16 }}>Chi tiết theo mã {dv ? '— ' + dv : ''} ({d.chiTiet.length})</h3>
          <div className="tablewrap"><table>
            <thead><tr><th>Đơn vị</th><th>Mã / tên</th><th className="num">Kế hoạch FC</th><th className="num">GT2 đặt</th><th className="num">Xuất kho</th><th className="num">SAP thực bán</th><th className="num">Đặt − FC</th><th>% đặt / FC</th></tr></thead>
            <tbody>{d.chiTiet.slice(0, 500).map((x) => (
              <tr key={x.donVi + x.sku}><td>{x.donVi}</td><td><b>{x.sku}</b><div className="small muted">{x.ten}</div></td>
                <td className="num">{fmtNum(x.fcSl)}</td><td className="num">{fmtNum(x.datSl)}</td><td className="num">{fmtNum(x.giaoSl)}</td><td className="num">{fmtNum(x.sapSl)}</td>
                <td className="num" style={{ color: x.chenhDatFc < 0 ? 'var(--rose)' : undefined }}>{fmtNum(x.chenhDatFc)}</td><td><Tag tone={tonePct(x.pctDatFc)}>{fmtPct(x.pctDatFc)}</Tag></td></tr>))}
              {!d.chiTiet.length && <tr><td colSpan={8} className="muted">Không có số nào trong tháng.</td></tr>}
            </tbody>
          </table></div>
          {d.chiTiet.length > 500 && <p className="small muted">Hiện 500 dòng đầu — tải Excel để xem đủ {d.chiTiet.length} dòng.</p>}
        </>
      )}
    </div>
  );
}
