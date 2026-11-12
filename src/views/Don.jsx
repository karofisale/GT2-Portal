import React, { useState } from 'react';
import { api } from '../services/api';
import { Field, Modal, Spinner, Loi, Tag, useTai, useLam, useUi } from '../ui';
import { fmtNgay, fmtNum, fmtTien, NHAN_MIEN, NHAN_LOAI, NHAN_DONG, laNoiBo } from '../utils/format';
import DatHang from './DatHang';
import { MucThanhToanDon } from './ThanhToan';

const TRANG_THAI = [['', 'Tất cả trạng thái'], ['moi', 'Mới — chờ duyệt'], ['da_duyet', 'Đã duyệt / đang giao'], ['hoan_thanh', 'Hoàn thành'], ['huy', 'Đã huỷ']];

/** Danh sách đơn (khách: đơn của mình + đại lý; nội bộ: tất cả). */
export function DonList({ me, trangThaiMd }) {
  const [st, setSt] = useState(trangThaiMd || '');
  const [q, setQ] = useState('');
  const [dt, setDt] = useState('');
  const [mo, setMo] = useState(null);
  const ds = useTai(() => api('getDons', { status: st, q, doiTac: dt }), [st, q, dt]);
  const noiBo = laNoiBo(me.role);
  const nhieuDt = noiBo || me.doiTac.loai === 'bht';
  return (
    <div>
      <div className="row">
        <Field label="Trạng thái"><select value={st} onChange={(e) => setSt(e.target.value)}>{TRANG_THAI.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select></Field>
        <Field label="Tìm (mã đơn, PO, SO, điểm giao)" style={{ minWidth: 240 }}><input value={q} onChange={(e) => setQ(e.target.value)} /></Field>
        {nhieuDt && <Field label="Mã đối tác"><input value={dt} onChange={(e) => setDt(e.target.value)} style={{ width: 110 }} /></Field>}
        <button className="btn" onClick={ds.reload} style={{ marginBottom: 8 }}>Tải lại</button>
      </div>
      {ds.loading && !ds.data ? <Spinner /> : ds.error ? <Loi onRetry={ds.reload}>{ds.error}</Loi> : (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Mã đơn</th>{nhieuDt && <th>Đối tác</th>}<th>Miền</th><th>PO / SO</th><th>Điểm giao</th><th className="num">Dòng</th><th className="num">Giá trị</th><th>Trạng thái</th><th>Ngày đặt</th></tr></thead>
            <tbody>
              {ds.data.items.map((d) => (
                <tr key={d.id} className="click" onClick={() => setMo(d.id)}>
                  <td className="nowrap"><b>{d.ma}</b>{d.coCanhBao && <span title="Duyệt dù có cảnh báo hạn mức" style={{ marginLeft: 4 }}>⚠️</span>}</td>
                  {nhieuDt && <td>{d.doiTac}<div className="small muted">{NHAN_LOAI[d.loai]}</div></td>}
                  <td>{d.mienNhan}</td>
                  <td>{d.poKhach}{d.soSap && <div className="small muted">SO {d.soSap}</div>}</td>
                  <td>{d.diemTen}</td>
                  <td className="num">{d.soDong}</td>
                  <td className="num">{fmtTien(d.tong)}</td>
                  <td><Tag tone={d.trangThai.tone}>{d.trangThai.nhan}</Tag></td>
                  <td className="nowrap">{fmtNgay(d.taoLuc)}</td>
                </tr>
              ))}
              {!ds.data.items.length && <tr><td colSpan={9} className="muted">Không có đơn nào.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {mo && <DonChiTiet id={mo} me={me} onClose={() => setMo(null)} onDoi={ds.reload} />}
    </div>
  );
}

/** Chi tiết một đơn + các thao tác theo vai (khách sửa / huỷ khi chưa duyệt; admin duyệt / SO / huỷ). */
export function DonChiTiet({ id, me, onClose, onDoi }) {
  const { hoi, toast } = useUi();
  const [dang, lam] = useLam();
  const [sua, setSua] = useState(false);
  const [soMo, setSoMo] = useState(false);
  const ct = useTai(() => api('getDon', id), [id]);
  const d = ct.data;
  const coGiaBht = !!(d && d.don && 'tongGiaBht' in d.don);   // đơn đại lý, người xem là BHT / nội bộ
  const xong = () => { ct.reload(); onDoi && onDoi(); };

  async function huyKhach() {
    const ly = await hoi({ title: 'Huỷ đơn ' + d.don.ma, msg: 'Đơn chưa duyệt nên huỷ được. Ghi lý do huỷ:', input: true, min: 3, okText: 'Huỷ đơn', cancelText: 'Giữ đơn', danger: true });
    if (ly) { if (await lam(() => api('cancelDonKhach', id, ly), 'Đã huỷ đơn ' + d.don.ma + '.')) xong(); }
  }
  async function huyAdmin() {
    const ly = await hoi({ title: 'Huỷ đơn ' + d.don.ma, msg: 'Khách sẽ thấy lý do này. Ghi lý do huỷ:', input: true, min: 3, okText: 'Huỷ đơn', cancelText: 'Giữ đơn', danger: true });
    if (ly) { if (await lam(() => api('cancelDonAdmin', id, ly), 'Đã huỷ đơn ' + d.don.ma + '.')) xong(); }
  }
  async function duyet() {
    let r = await lam(() => api('approveDon', id, {}));
    if (!r) return;
    if (!r.daDuyet) {
      const cb = r.canhBao;
      const ok = await hoi({ title: '⚠️ Cảnh báo hạn mức công nợ', msg: cb.lyDo.join('\n') + '\n\nChỉ cảnh báo — bạn quyết định. Vẫn duyệt đơn này?', okText: 'Vẫn duyệt', cancelText: 'Chưa duyệt', danger: true });
      if (!ok) return;
      r = await lam(() => api('approveDon', id, { xacNhanVuotHanMuc: true }));
      if (!r || !r.daDuyet) return;
    }
    toast('Đã duyệt đơn ' + d.don.ma + ' — đồng hồ xác nhận ngày giao của Kế hoạch bắt đầu chạy.', 'ok');
    xong();
  }

  if (sua) return (
    <Modal title={'Sửa đơn ' + (d ? d.don.ma : '')} wide onClose={() => setSua(false)}>
      <DatHang me={me} suaId={id} onXong={() => { setSua(false); xong(); }} />
    </Modal>
  );

  return (
    <Modal title={d ? 'Đơn ' + d.don.ma : 'Đơn'} wide onClose={onClose}>
      {ct.loading && !d ? <Spinner /> : ct.error ? <Loi onRetry={ct.reload}>{ct.error}</Loi> : (
        <>
          <div style={{ marginBottom: 10 }}><Tag tone={d.don.trangThai.tone}>{d.don.trangThai.nhan}</Tag>
            {d.don.canhBaoHanMuc && <span className="tag tag-amber" style={{ marginLeft: 6 }} title={d.don.canhBaoHanMuc}>⚠️ Duyệt dù có cảnh báo hạn mức</span>}</div>
          <dl className="kv">
            <dt>Đối tác</dt><dd>{d.don.doiTacTen} ({d.don.doiTac}) · {NHAN_LOAI[d.don.loai]}{d.don.mienNhan && ' · ' + d.don.mienNhan}</dd>
            <dt>Số PO</dt><dd>{d.don.poKhach || '—'}</dd>
            <dt>Số SO (SAP)</dt><dd>{d.don.soSap ? d.don.soSap + (d.don.soNgay ? ' · ngày ' + fmtNgay(d.don.soNgay) : '') : <span className="muted">chưa có</span>}</dd>
            <dt>Điểm giao</dt><dd>{[d.don.diem.ten, d.don.diem.lienHe, d.don.diem.sdt, d.don.diem.diaChi].filter(Boolean).join(' · ') || '—'}</dd>
            <dt>Ngày cần hàng</dt><dd>{fmtNgay(d.don.ngayCan) || '—'}</dd>
            <dt>Người đặt</dt><dd>{d.don.nguoi.ten} {d.don.nguoi.sdt} <span className="muted small">· đặt lúc {fmtNgay(d.don.taoLuc)}</span></dd>
            {d.don.ghiChu && <><dt>Ghi chú</dt><dd>{d.don.ghiChu}</dd></>}
            {d.don.huyLuc && <><dt>Đã huỷ</dt><dd>{fmtNgay(d.don.huyLuc)} — {d.don.huyLyDo}</dd></>}
          </dl>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Mã</th><th>Tên</th><th className="num">SL</th><th className="num">{coGiaBht ? 'Giá đại lý' : 'Đơn giá'}</th><th className="num">Thành tiền</th>{coGiaBht && <th className="num" title="Giá Karofi bán BHT — SO sold-to Puresys">Giá Karofi→BHT</th>}<th>Ngày giao dự kiến</th><th className="num">Đã giao</th><th>DO</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {d.dongs.map((l) => (
                  <tr key={l.id}>
                    <td><b>{l.sku}</b></td><td>{l.ten}</td><td className="num">{fmtNum(l.qty)}</td><td className="num">{fmtTien(l.gia)}</td><td className="num">{fmtTien(l.thanhTien)}</td>
                    {coGiaBht && <td className="num">{l.giaBht === null ? <span className="small" style={{ color: 'var(--rose)' }}>chưa có</span> : fmtTien(l.giaBht)}</td>}
                    <td>{l.ngayGiaoDk ? fmtNgay(l.ngayGiaoDk) : l.lyDo ? <span className="muted">Chưa có ngày{l.ghiChuKh ? ' — ' + l.ghiChuKh : ''}</span> : <span className="muted">—</span>}</td>
                    <td className="num">{l.daGiao ? fmtNum(l.daGiao) + ' / ' + fmtNum(l.qty) : ''}</td>
                    <td className="small">{l.giao.map((g) => <div key={g.id}>{g.soDo} · {fmtNum(g.sl)} {g.pgi ? '✔ xuất ' + fmtNgay(g.ngayPgi) : '(chờ xuất kho)'}</div>)}</td>
                    <td className="small">{NHAN_DONG[l.trangThai]}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr><td colSpan={4} className="right"><b>Tổng giá trị</b></td><td className="num"><b>{fmtTien(d.don.tong)}</b></td>
                {coGiaBht && <td className="num" title="Tổng theo giá Karofi bán BHT"><b>{d.don.tongGiaBht === null ? '—' : fmtTien(d.don.tongGiaBht)}</b></td>}<td colSpan={4} /></tr></tfoot>
            </table>
          </div>
          {d.thanhToan && <MucThanhToanDon don={d.don} tt={d.thanhToan} me={me} onDoi={xong} />}
          <details style={{ marginTop: 10 }}>
            <summary className="muted">Lịch sử đơn ({d.log.length})</summary>
            <table><tbody>{d.log.map((l, i) => <tr key={i}><td className="nowrap small">{fmtNgay(l.at)}</td><td className="small">{l.by} <span className="muted">({l.vai})</span></td><td className="small">{l.noiBo && '🔒 '}{l.chiTiet}</td></tr>)}</tbody></table>
          </details>
          <div className="actions">
            {d.don.choHuy && <button className="btn" disabled={dang} onClick={huyKhach}>Huỷ đơn</button>}
            {d.don.choSua && <button className="btn pri" disabled={dang} onClick={() => setSua(true)}>Sửa đơn</button>}
            {me.role === 'admin' && d.don.status === 'moi' && <button className="btn pri" disabled={dang} onClick={duyet}>Duyệt đơn</button>}
            {me.role === 'admin' && d.don.status === 'da_duyet' && <button className="btn" disabled={dang} onClick={() => setSoMo(true)}>{d.don.soSap ? 'Đổi số SO' : 'Nhập số SO'}</button>}
            {me.role === 'admin' && (d.don.status === 'moi' || d.don.status === 'da_duyet') && <button className="btn dan" disabled={dang} onClick={huyAdmin}>Huỷ đơn</button>}
          </div>
          {soMo && <FormSo don={d.don} onClose={() => setSoMo(false)} onXong={() => { setSoMo(false); xong(); }} />}
        </>
      )}
    </Modal>
  );
}

export function FormSo({ don, onClose, onXong }) {
  const [dang, lam] = useLam();
  const [so, setSo] = useState(don.soSap || '');
  const [ngay, setNgay] = useState(don.soNgay || '');
  async function luu() { if (await lam(() => api('setSoSap', don.id, { so, ngay }), 'Đã lưu số SO.')) onXong(); }
  return (
    <Modal title={'Số SO — đơn ' + don.ma} onClose={onClose} actions={<><button className="btn" onClick={onClose}>Đóng</button><button className="btn pri" disabled={dang || !so.trim()} onClick={luu}>Lưu</button></>}>
      <Field label="Số SO trên SAP (8–12 chữ số)"><input autoFocus value={so} onChange={(e) => setSo(e.target.value)} /></Field>
      <Field label="Ngày SO (bỏ trống = hôm nay)"><input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} /></Field>
      <p className="small muted">Mỗi số SO chỉ thuộc một đơn.</p>
    </Modal>
  );
}
