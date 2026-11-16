import React, { useState } from 'react';
import { api } from '../services/api';
import { Spinner, Loi, Tag, useTai } from '../ui';
import { fmtTien, fmtNgay, NHAN_LOAI, laKhach, tinhTrangHan } from '../utils/format';
import { SoDoiTac } from './ThanhToan';
import NutExcel from './XuatExcel';

/** Excel sổ công nợ: tổng theo đối tác + chi tiết từng khoản nợ (mỗi DO đã xuất kho) của các đối tác có chi tiết. */
function sheetCongNo(ds) {
  const cotTong = [{ key: 'code', nhan: 'Mã đối tác' }, { key: 'name', nhan: 'Tên' }, { nhan: 'Loại', lay: (r) => NHAN_LOAI[r.loai] }, { key: 'cha', nhan: 'Thuộc BHT' },
    { key: 'hanMuc', nhan: 'Hạn mức', kieu: 'tien' }, { key: 'tong', nhan: 'Đã giao', kieu: 'tien' }, { key: 'daTra', nhan: 'Đã trả', kieu: 'tien' }, { key: 'conNo', nhan: 'Còn nợ', kieu: 'tien' },
    { key: 'quaHan', nhan: 'Quá hạn', kieu: 'tien' }, { key: 'soNgayQuaHanMax', nhan: 'Quá hạn lâu nhất (ngày)', kieu: 'so' }, { key: 'sapDenHan', nhan: 'Sắp đến hạn', kieu: 'tien' },
    { key: 'choXacNhan', nhan: 'Điện chờ xác nhận', kieu: 'tien' }, { nhan: 'Tình trạng', lay: (r) => tinhTrangHan(r).nhan }];
  const khoan = [];
  ds.forEach((x) => (x.dons || []).forEach((dn) => (dn.khoans || []).forEach((k) => khoan.push({ doiTac: x.code, ma: dn.ma, soSap: dn.soSap, soDo: k.soDo, ngayPgi: k.ngayPgi, han: k.han,
    soTien: k.soTien, daTra: k.daTra, conNo: k.conNo, quaHanNgay: k.quaHanNgay }))));
  const out = [{ ten: 'Tổng theo đối tác', dong: ds, cot: cotTong }];
  if (khoan.length) out.push({ ten: 'Chi tiết khoản nợ', dong: khoan, cot: [{ key: 'doiTac', nhan: 'Đối tác' }, { key: 'ma', nhan: 'Đơn' }, { key: 'soSap', nhan: 'SO' }, { key: 'soDo', nhan: 'DO' },
    { key: 'ngayPgi', nhan: 'Ngày xuất kho', kieu: 'ngay' }, { key: 'han', nhan: 'Hạn', kieu: 'ngay' }, { key: 'soTien', nhan: 'Số tiền', kieu: 'tien' }, { key: 'daTra', nhan: 'Đã trả', kieu: 'tien' },
    { key: 'conNo', nhan: 'Còn nợ', kieu: 'tien' }, { key: 'quaHanNgay', nhan: 'Quá hạn (ngày)', kieu: 'so' }] });
  return out;
}

/**
 * Công nợ kênh BHT (pha 2). Ghi nợ theo DO đã xuất kho, hạn = ngày xuất kho + 5 ngày; tiền trả gắn với từng đơn, chỉ trừ nợ sau khi Kế toán xác nhận.
 *  - Đại lý: sổ của mình. BHT: tổng nhóm + sổ BHT tự đặt + từng đại lý.
 *  - Nội bộ (admin / kế toán / viewer): bảng tổng mọi đại lý; bấm một dòng để xem sổ chi tiết.
 */
export default function CongNo({ me }) {
  return laKhach(me.role) ? <CongNoKhach me={me} /> : <CongNoNoiBo me={me} />;
}

function NhomBht({ ds }) {
  if (!ds.length) return null;
  const coBht = ds.some((g) => 'giaoGiaBht' in g);
  return (
    <div className="card">
      <h3>Tổng kênh BHT (chỉ để xem — không đối chiếu số dư Puresys)</h3>
      <p className="small muted">"Đã giao / Còn nợ" của đại lý tính theo giá BHT bán đại lý (số đại lý trả); cột "theo giá Karofi→BHT" là giá trị Karofi bán cho kênh BHT.</p>
      <div className="tablewrap"><table>
        <thead><tr><th>BHT</th><th className="num">Số đại lý</th><th className="num">Đã giao</th>{coBht && <th className="num" title="Giá trị đã giao tính theo giá Karofi bán BHT (doanh thu Karofi của kênh)">Đã giao theo giá Karofi→BHT</th>}<th className="num">Còn nợ</th><th className="num">Quá hạn</th><th className="num">Sắp đến hạn</th><th className="num">Điện chờ xác nhận</th></tr></thead>
        <tbody>{ds.map((g) => (
          <tr key={g.bht}><td><b>{g.bht}</b> <span className="muted">{g.ten}</span></td><td className="num">{g.soDaiLy}</td><td className="num">{fmtTien(g.tong)}</td>
            {coBht && <td className="num">{fmtTien(g.giaoGiaBht)}{g.thieuGiaBht && <div className="small" style={{ color: 'var(--amber)' }} title="Có dòng chưa có giá Karofi bán BHT — tạm tính theo giá đại lý">⚠ thiếu giá BHT</div>}</td>}
            <td className="num"><b>{fmtTien(g.conNo)}</b></td><td className="num" style={g.quaHan > 0 ? { color: 'var(--rose)' } : null}>{g.quaHan > 0 ? fmtTien(g.quaHan) : '—'}</td>
            <td className="num">{g.sapDenHan > 0 ? fmtTien(g.sapDenHan) : '—'}</td><td className="num">{g.choXacNhan > 0 ? fmtTien(g.choXacNhan) : '—'}</td></tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}

function CongNoKhach({ me }) {
  const so = useTai(() => api('getCongNo', {}), []);
  const [mo, setMo] = useState(me.doiTac ? me.doiTac.code : '');
  if (so.loading && !so.data) return <Spinner />;
  if (so.error) return <Loi onRetry={so.reload}>{so.error}</Loi>;
  const d = so.data;
  if (!d.doiTacs.length) return <div className="card muted">Tài khoản của bạn không có sổ công nợ trên GT2 Portal.</div>;
  const nhieu = d.doiTacs.length > 1;
  return (
    <div>
      {!d.coBangThanhToan && <div className="notice warn">Chức năng gửi điện chuyển tiền chưa được bật — tạm thời chỉ xem được phần nợ.</div>}
      {d.doiTacs.some((x) => x.quaHan > 0) && <div className="notice err">Đang có khoản <b>quá hạn</b> — vui lòng thanh toán và gửi điện chuyển tiền để Karofi xác nhận.</div>}
      <div className="row" style={{ justifyContent: 'flex-end' }}><NutExcel ten="Cong-no-GT2" lay={() => sheetCongNo(d.doiTacs)} /></div>
      {nhieu && <NhomBht ds={d.nhomBht} />}
      {d.doiTacs.map((x) => (
        <div key={x.code} className="card">
          <h3 className="click" style={{ cursor: nhieu ? 'pointer' : 'default' }} onClick={() => nhieu && setMo(mo === x.code ? '' : x.code)}>
            {x.code} — {x.name} <span className="muted small">{NHAN_LOAI[x.loai]}{x.loai === 'bht' ? ' (đơn BHT tự đặt)' : ''}</span>{' '}
            <Tag tone={tinhTrangHan(x).tone}>{tinhTrangHan(x).nhan}</Tag> <span className="small muted">còn nợ {fmtTien(x.conNo)}</span>
            {nhieu && <span className="small muted" style={{ marginLeft: 8 }}>{mo === x.code ? '▲ thu gọn' : '▼ xem sổ'}</span>}
          </h3>
          {(!nhieu || mo === x.code) && <SoDoiTac x={x} me={me} onDoi={so.reload} />}
        </div>
      ))}
      <p className="small muted">Số liệu đến ngày {fmtNgay(d.homNay)}. Nợ ghi theo DO đã xuất kho; hạn thanh toán = ngày xuất kho + số ngày theo thoả thuận (mặc định 5 ngày).</p>
    </div>
  );
}

function CongNoNoiBo({ me }) {
  const ds = useTai(() => api('getCongNo', {}), []);
  const [chon, setChon] = useState('');
  const [loc, setLoc] = useState('');
  const ct = useTai(() => (chon ? api('getCongNo', { doiTac: chon }) : Promise.resolve(null)), [chon]);
  if (ds.loading && !ds.data) return <Spinner />;
  if (ds.error) return <Loi onRetry={ds.reload}>{ds.error}</Loi>;
  const d = ds.data;
  const hien = d.doiTacs.filter((x) => !loc || (loc === 'qua_han' ? x.quaHan > 0 : loc === 'cho' ? x.choXacNhan > 0 : loc === 'vuot' ? x.vuotHanMuc > 0 : x.conNo > 0));
  const doi = () => { ds.reload(); ct.reload(); };
  const x = ct.data && ct.data.doiTacs[0];
  return (
    <div>
      {!d.coBangThanhToan && <div className="notice warn">Chưa chạy SQL đợt 33 (chay-dot33-gt2-cong-no) — sổ chỉ có phần nợ theo DO, chưa nhận / xác nhận điện chuyển tiền được.</div>}
      <NhomBht ds={d.nhomBht} />
      <div className="card">
        <div className="row"><h3 style={{ flex: 1 }}>Từng đối tác kênh BHT</h3>
          <NutExcel ten="Cong-no-BHT" lay={async () => { const ct2 = [];
            for (const y of d.doiTacs.filter((z) => z.tong > 0 || Math.abs(z.conNo) > 0.004)) { const c = await api('getCongNo', { doiTac: y.code }); if (c.doiTacs[0]) ct2.push(c.doiTacs[0]); }
            return sheetCongNo(ct2.length ? ct2 : d.doiTacs); }} /></div>
        <div className="tabs">{[['', 'Tất cả'], ['con_no', 'Còn nợ'], ['qua_han', 'Quá hạn'], ['vuot', 'Vượt hạn mức'], ['cho', 'Có điện chờ xác nhận']].map(([k, t]) =>
          <button key={k} className={loc === k ? 'on' : ''} onClick={() => setLoc(k)}>{t}</button>)}</div>
        <div className="tablewrap"><table>
          <thead><tr><th>Đối tác</th><th>Thuộc</th><th className="num">Hạn mức</th><th className="num">Đã giao</th><th className="num">Đã trả</th><th className="num">Còn nợ</th><th className="num">Quá hạn</th><th className="num">Chờ xác nhận</th><th>Tình trạng</th></tr></thead>
          <tbody>
            {hien.map((r) => { const tt = tinhTrangHan(r); return (
              <tr key={r.code} className={'click' + (r.quaHan > 0 ? ' late' : '')} onClick={() => setChon(r.code)}>
                <td><b>{r.code}</b> <span className="muted">{r.name}</span>{!r.active && <span className="small muted"> (ngừng)</span>}</td>
                <td>{r.loai === 'bht' ? <span className="muted small">BHT tự đặt</span> : r.cha}</td>
                <td className="num">{r.hanMuc === null ? '—' : fmtTien(r.hanMuc)}{r.vuotHanMuc > 0 && <div className="small" style={{ color: 'var(--rose)' }}>vượt {fmtTien(r.vuotHanMuc)}</div>}</td>
                <td className="num">{fmtTien(r.tong)}</td><td className="num">{fmtTien(r.daTra)}</td><td className="num"><b>{fmtTien(r.conNo)}</b></td>
                <td className="num">{r.quaHan > 0 ? fmtTien(r.quaHan) + ' · ' + r.soNgayQuaHanMax + 'n' : '—'}</td>
                <td className="num">{r.choXacNhan > 0 ? fmtTien(r.choXacNhan) + ' (' + r.soDienCho + ')' : '—'}</td>
                <td><Tag tone={tt.tone}>{tt.nhan}</Tag></td>
              </tr>
            ); })}
            {!hien.length && <tr><td colSpan={9} className="muted">Không có đối tác nào.</td></tr>}
          </tbody>
        </table></div>
      </div>
      {chon && (
        <div className="card">
          <h3>Sổ {chon}{x ? ' — ' + x.name : ''} <button className="btn sm" style={{ marginLeft: 8 }} onClick={() => setChon('')}>Đóng</button></h3>
          {ct.loading && !ct.data ? <Spinner /> : ct.error ? <Loi onRetry={ct.reload}>{ct.error}</Loi> : x ? <SoDoiTac x={x} me={me} onDoi={doi} /> : <p className="muted">Không có dữ liệu.</p>}
        </div>
      )}
    </div>
  );
}
