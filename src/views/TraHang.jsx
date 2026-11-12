import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Field, Modal, Spinner, Loi, Tag, useTai, useLam, useUi } from '../ui';
import { fmtNgay, fmtNum, fmtTien, homNay, layNguoi, nhoNguoi, sdtHopLe, docTien, laKhach, laNoiBo, TONE_TRA, NHAN_NGUON_GIA, docDongTra } from '../utils/format';
import { docTep, XemTep } from './ThanhToan';

const TRANG_THAI = [['', 'Tất cả'], ['moi', 'Chờ xét'], ['da_duyet', 'Chờ kho / QC'], ['da_kiem', 'Đã kiểm xong'], ['tu_choi', 'Bị từ chối'], ['huy', 'Đã huỷ']];

/**
 * Trả hàng 3T (pha 3). 3T gửi phiếu (mã, SL, số HĐ / DO gốc, lý do, ảnh) → Karofi xét ngưỡng % doanh thu kỳ đã kết thúc → kho / QC tiếp nhận + kết luận
 * từng mã → 3T thấy kết quả.
 */
export default function TraHang({ me }) {
  const khach = laKhach(me.role);
  const [st, setSt] = useState(me.role === 'qc' ? 'da_duyet' : me.role === 'admin' ? 'moi' : '');
  const [mo, setMo] = useState(null);
  const [tao, setTao] = useState(false);
  const ds = useTai(() => api('getTraHangs', { status: st }), [st]);
  return (
    <div>
      {khach && <div className="notice">Hàng trả được Karofi xét theo ngưỡng % doanh thu của kỳ đã kết thúc gần nhất. Ghi đúng số hoá đơn / DO gốc và chụp ảnh tình trạng hàng để xét nhanh.</div>}
      <div className="row">
        <div className="tabs" style={{ marginBottom: 0 }}>{TRANG_THAI.map(([k, t]) => <button key={k} className={st === k ? 'on' : ''} onClick={() => setSt(k)}>{t}</button>)}</div>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={ds.reload}>Tải lại</button>
        {khach && <button className="btn pri" onClick={() => setTao(true)}>+ Gửi phiếu trả hàng</button>}
      </div>
      <div style={{ marginTop: 10 }}>
        {ds.loading && !ds.data ? <Spinner /> : ds.error ? <Loi onRetry={ds.reload}>{ds.error}</Loi> : (
          <div className="tablewrap"><table>
            <thead><tr><th>Phiếu</th>{!khach && <th>Đối tác</th>}<th>Kỳ so sánh</th><th className="num">Dòng</th><th className="num">Tổng SL</th>{!khach && <th className="num">Giá trị</th>}<th className="num">Tỷ lệ</th><th>Trạng thái</th><th>Ngày gửi</th></tr></thead>
            <tbody>
              {ds.data.items.map((x) => (
                <tr key={x.id} className="click" onClick={() => setMo(x.id)}>
                  <td className="nowrap"><b>{x.ma}</b>{x.ngoaiLe && <span title="Duyệt ngoại lệ (vượt ngưỡng)" style={{ marginLeft: 4 }}>⚠️</span>}</td>
                  {!khach && <td>{x.doiTac}</td>}
                  <td>{x.kyNhan}</td><td className="num">{x.soDong}</td><td className="num">{fmtNum(x.tongSl)}</td>
                  {!khach && <td className="num">{x.giaTri === null ? '—' : fmtTien(x.giaTri)}</td>}
                  <td className="num">{x.tyLePct === null ? '—' : fmtNum(x.tyLePct) + '%'}</td>
                  <td><Tag tone={TONE_TRA[x.status]}>{x.nhan}</Tag></td>
                  <td className="nowrap">{fmtNgay(x.taoLuc)}<div className="small muted">{x.nguoi}</div></td>
                </tr>
              ))}
              {!ds.data.items.length && <tr><td colSpan={9} className="muted">Không có phiếu nào.</td></tr>}
            </tbody>
          </table></div>
        )}
      </div>
      {tao && <FormPhieu onClose={() => setTao(false)} onXong={() => { setTao(false); ds.reload(); }} />}
      {mo && <ChiTietPhieu id={mo} me={me} onClose={() => setMo(null)} onDoi={ds.reload} />}
    </div>
  );
}

/* ================= 3T gửi / sửa phiếu ================= */

const dongTrong = () => ({ sku: '', sl: '', soHd: '', lyDo: '' });

function FormPhieu({ cu, onClose, onXong }) {
  const { toast } = useUi();
  const [dang, lam] = useLam();
  const [dongs, setDongs] = useState(() => (cu ? cu.dongs.map((d) => ({ sku: d.sku, sl: String(d.sl), soHd: d.soHd, lyDo: d.lyDo })) : [dongTrong()]));
  const [lyDoChung, setLyDoChung] = useState('');
  const [ghiChu, setGhiChu] = useState(cu ? cu.phieu.ghiChu : '');
  const [nguoi, setNguoi] = useState(() => layNguoi(window.localStorage));
  const [tepMoi, setTepMoi] = useState([]);
  const [boTep, setBoTep] = useState([]);
  const [dan, setDan] = useState('');
  const conTepCu = cu ? cu.teps.filter((t) => boTep.indexOf(t.id) < 0) : [];
  const set = (i, k, v) => setDongs(dongs.map((d, j) => (j === i ? { ...d, [k]: v } : d)));
  function napDan() {
    const r = docDongTra(dan);
    if (r.loi.length) toast('Có ' + r.loi.length + ' dòng không đọc được: ' + r.loi.slice(0, 3).join(' | '), 'err');
    if (r.lines.length) { setDongs(dongs.filter((d) => d.sku.trim()).concat(r.lines.map((l) => ({ sku: l.sku, sl: String(l.sl), soHd: l.soHd, lyDo: l.lyDo })))); setDan(''); }
  }
  async function chonTep(e) {
    const fs = [...(e.target.files || [])];
    e.target.value = '';
    for (const f of fs) {
      if (conTepCu.length + tepMoi.length >= 10) { toast('Tối đa 10 ảnh / tệp mỗi phiếu.', 'err'); break; }
      try { const t = await docTep(f); setTepMoi((x) => x.concat({ ...t, ghiChu: '' })); } catch (x) { toast(f.name + ': ' + x.message, 'err'); }
    }
  }
  const lines = dongs.filter((d) => d.sku.trim()).map((d) => ({ sku: d.sku.trim(), sl: docTien(d.sl), soHd: d.soHd.trim(), lyDo: d.lyDo.trim() }));
  const hopLe = lines.length && lines.every((l) => l.sl > 0 && l.soHd && (l.lyDo || lyDoChung.trim())) && nguoi.ten.trim().length >= 2 && sdtHopLe(nguoi.sdt);
  async function gui() {
    nhoNguoi(window.localStorage, nguoi);
    const p = { lines, lyDoChung, ghiChu, nguoi, tep: tepMoi };
    const r = await lam(() => (cu ? api('updateTraHang', cu.phieu.id, { ...p, boTep }) : api('createTraHang', p)), cu ? 'Đã sửa phiếu.' : 'Đã gửi phiếu trả hàng — chờ Karofi xét.');
    if (r) onXong(r);
  }
  return (
    <Modal title={cu ? 'Sửa phiếu ' + cu.phieu.ma : 'Gửi phiếu trả hàng'} wide onClose={onClose}
      actions={<><button className="btn" onClick={onClose}>Đóng</button><button className="btn pri" disabled={dang || !hopLe} onClick={gui}>{cu ? 'Lưu phiếu' : 'Gửi phiếu'}</button></>}>
      <details style={{ marginBottom: 10 }}>
        <summary className="muted">Dán nhanh từ Excel (mã · SL · số HĐ / DO gốc · lý do)</summary>
        <textarea value={dan} onChange={(e) => setDan(e.target.value)} placeholder={'1000101\t10\tHD0001234\tRò nước'} />
        <div className="actions"><button className="btn" disabled={!dan.trim()} onClick={napDan}>Thêm vào bảng</button></div>
      </details>
      <div className="tablewrap"><table>
        <thead><tr><th>Mã hàng *</th><th className="num">SL *</th><th>Số HĐ / DO gốc *</th><th>Lý do trả</th><th /></tr></thead>
        <tbody>{dongs.map((d, i) => (
          <tr key={i}>
            <td><input value={d.sku} onChange={(e) => set(i, 'sku', e.target.value)} style={{ width: 120 }} /></td>
            <td className="num"><input inputMode="numeric" value={d.sl} onChange={(e) => set(i, 'sl', e.target.value)} style={{ width: 80, textAlign: 'right' }} /></td>
            <td><input value={d.soHd} onChange={(e) => set(i, 'soHd', e.target.value)} style={{ width: 140 }} /></td>
            <td><input value={d.lyDo} onChange={(e) => set(i, 'lyDo', e.target.value)} placeholder={lyDoChung ? '(dùng lý do chung)' : ''} style={{ width: '100%', minWidth: 180 }} /></td>
            <td><button className="btn sm" onClick={() => setDongs(dongs.length > 1 ? dongs.filter((_, j) => j !== i) : [dongTrong()])}>✕</button></td>
          </tr>
        ))}</tbody>
      </table></div>
      <div className="actions" style={{ justifyContent: 'flex-start' }}><button className="btn sm" onClick={() => setDongs(dongs.concat(dongTrong()))}>+ Thêm dòng</button></div>
      <div className="row">
        <Field label="Lý do chung (cho dòng để trống lý do)" style={{ flex: 1 }}><input value={lyDoChung} onChange={(e) => setLyDoChung(e.target.value)} /></Field>
        <Field label="Ghi chú phiếu" style={{ flex: 1 }}><input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} maxLength={500} /></Field>
      </div>
      <Field label={'Ảnh / PDF tình trạng hàng (tối đa 10) — đang có ' + (conTepCu.length + tepMoi.length)}>
        <input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" onChange={chonTep} />
      </Field>
      <div className="small">
        {conTepCu.map((t) => <div key={'c' + t.id}>📎 {t.ten} {t.ghiChu && <span className="muted">— {t.ghiChu}</span>} <button className="btn sm" onClick={() => setBoTep(boTep.concat(t.id))}>Bỏ</button></div>)}
        {tepMoi.map((t, i) => <div key={'m' + i}>🆕 {t.ten} <input placeholder="ghi chú ảnh (vd mã hàng)" value={t.ghiChu} onChange={(e) => setTepMoi(tepMoi.map((x, j) => (j === i ? { ...x, ghiChu: e.target.value } : x)))} style={{ width: 220 }} /> <button className="btn sm" onClick={() => setTepMoi(tepMoi.filter((_, j) => j !== i))}>Bỏ</button></div>)}
      </div>
      <div className="row" style={{ marginTop: 8 }}>
        <Field label="Người gửi *"><input value={nguoi.ten} onChange={(e) => setNguoi({ ...nguoi, ten: e.target.value })} /></Field>
        <Field label="Số điện thoại *"><input value={nguoi.sdt} onChange={(e) => setNguoi({ ...nguoi, sdt: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

/* ================= chi tiết phiếu ================= */

function ChiTietPhieu({ id, me, onClose, onDoi }) {
  const { hoi } = useUi();
  const [dang, lam] = useLam();
  const [sua, setSua] = useState(false);
  const [xem, setXem] = useState(null);
  const ct = useTai(() => api('getTraHang', id), [id]);
  const d = ct.data;
  const xong = () => { ct.reload(); onDoi(); };
  async function huy() {
    const ly = await hoi({ title: 'Huỷ phiếu ' + d.phieu.ma, msg: 'Phiếu chưa được xét nên huỷ được. Ghi lý do:', input: true, min: 3, okText: 'Huỷ phiếu', danger: true });
    if (ly && await lam(() => api('cancelTraHang', id, ly), 'Đã huỷ phiếu.')) xong();
  }
  if (sua && d) return <FormPhieu cu={d} onClose={() => setSua(false)} onXong={() => { setSua(false); xong(); }} />;
  const coKetQua = d && d.dongs.some((x) => x.ketLuan || x.slNhan !== null);
  return (
    <Modal title={d ? 'Phiếu trả ' + d.phieu.ma : 'Phiếu trả'} wide onClose={onClose}>
      {ct.loading && !d ? <Spinner /> : ct.error ? <Loi onRetry={ct.reload}>{ct.error}</Loi> : (
        <>
          <div style={{ marginBottom: 10 }}><Tag tone={TONE_TRA[d.phieu.status]}>{d.phieu.nhan}</Tag>{d.phieu.ngoaiLe && <span className="tag tag-amber" style={{ marginLeft: 6 }}>⚠️ Duyệt ngoại lệ</span>}</div>
          <dl className="kv">
            <dt>Đối tác</dt><dd>{d.phieu.doiTacTen} ({d.phieu.doiTac})</dd>
            <dt>Kỳ so sánh</dt><dd>{d.phieu.ky.nhan} <span className="muted small">({fmtNgay(d.phieu.ky.tu)} – {fmtNgay(d.phieu.ky.den)})</span></dd>
            <dt>Người gửi</dt><dd>{d.phieu.nguoi.ten} {d.phieu.nguoi.sdt} <span className="muted small">· {fmtNgay(d.phieu.taoLuc)}</span></dd>
            {d.phieu.ghiChu && <><dt>Ghi chú</dt><dd>{d.phieu.ghiChu}</dd></>}
            {d.phieu.tyLePct !== null && <><dt>Kết quả xét</dt><dd>Hàng trả {fmtNum(d.phieu.tyLePct)}% doanh thu kỳ · ngưỡng {fmtNum(d.phieu.nguongPct)}% <span className="muted small">· {fmtNgay(d.phieu.xetLuc)}</span></dd></>}
            {d.phieu.lyDoTuChoi && <><dt>Lý do từ chối</dt><dd style={{ color: 'var(--rose)' }}>{d.phieu.lyDoTuChoi}</dd></>}
            {d.phieu.huyLyDo && <><dt>Đã huỷ</dt><dd>{fmtNgay(d.phieu.huyLuc)} — {d.phieu.huyLyDo}</dd></>}
            {d.phieu.qcNhanNgay && <><dt>Kho nhận hàng</dt><dd>{fmtNgay(d.phieu.qcNhanNgay)}</dd></>}
            {d.phieu.xetGhiChu && <><dt>Ghi chú xét (nội bộ)</dt><dd>{d.phieu.xetGhiChu}</dd></>}
          </dl>
          {!d.phieu.choXet && !d.phieu.choQc && (
            <div className="tablewrap"><table>
              <thead><tr><th>Mã</th><th>Tên</th><th className="num">SL trả</th><th>Số HĐ / DO gốc</th><th>Lý do</th>{laNoiBo(me.role) && <th className="num">Đơn giá (trước thuế)</th>}{coKetQua && <><th className="num">SL nhận</th><th>Kết luận QC</th></>}</tr></thead>
              <tbody>{d.dongs.map((x) => (
                <tr key={x.id}><td><b>{x.sku}</b></td><td>{x.ten}</td><td className="num">{fmtNum(x.sl)}</td><td>{x.soHd}</td><td className="small">{x.lyDo}</td>
                  {laNoiBo(me.role) && <td className="num">{fmtTien(x.donGia)}<div className="small muted">{NHAN_NGUON_GIA[x.nguonGia]}</div></td>}
                  {coKetQua && <><td className="num">{x.slNhan === null ? '—' : fmtNum(x.slNhan)}</td><td>{x.ketLuanTen || '—'}{x.qcGhiChu && <div className="small muted">{x.qcGhiChu}</div>}</td></>}</tr>
              ))}</tbody>
            </table></div>
          )}
          {d.phieu.choXet && <XetPhieu d={d} onXong={xong} />}
          {d.phieu.choQc && <QcPhieu d={d} onXong={xong} />}
          {d.teps.length > 0 && <div style={{ marginTop: 10 }}><b className="small">Ảnh / tệp kèm:</b> {d.teps.map((t) => <button key={t.id} className="btn sm" style={{ margin: 2 }} onClick={() => setXem(t.id)}>📎 {t.ten}{t.ghiChu ? ' — ' + t.ghiChu : ''}</button>)}</div>}
          <details style={{ marginTop: 10 }}>
            <summary className="muted">Lịch sử phiếu ({d.log.length})</summary>
            <table><tbody>{d.log.map((l, i) => <tr key={i}><td className="nowrap small">{fmtNgay(l.at)}</td><td className="small">{l.by} <span className="muted">({l.vai})</span></td><td className="small">{l.noiBo && '🔒 '}{l.chiTiet}</td></tr>)}</tbody></table>
          </details>
          {d.phieu.choSua && <div className="actions"><button className="btn" disabled={dang} onClick={huy}>Huỷ phiếu</button><button className="btn pri" disabled={dang} onClick={() => setSua(true)}>Sửa phiếu</button></div>}
          {xem && <XemTep id={xem} fn="getTepTraHang" title="Ảnh / tệp phiếu trả" onClose={() => setXem(null)} />}
        </>
      )}
    </Modal>
  );
}

/** Admin xét: sửa đơn giá từng dòng (trước thuế, theo hoá đơn gốc), doanh thu kỳ (SAP hoặc nhập tay), duyệt (ngoại lệ nếu vượt) / từ chối. */
function XetPhieu({ d, onXong }) {
  const { hoi, toast } = useUi();
  const [dang, lam] = useLam();
  const [gia, setGia] = useState({});
  const [dtTay, setDtTay] = useState('');
  const [ghiChu, setGhiChu] = useState('');
  const [x, setX] = useState(null);
  const [loi, setLoi] = useState('');
  const thamSo = () => { const g = {}; Object.keys(gia).forEach((k) => { if (String(gia[k]).trim() !== '') g[k] = docTien(gia[k]); }); return { gia: g, doanhThuTay: docTien(dtTay) > 0 ? docTien(dtTay) : undefined }; };
  async function tinh() {
    try { setLoi(''); setX(await api('previewXetTraHang', d.phieu.id, thamSo())); } catch (e) { setLoi(e.message); }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { tinh(); }, []);
  async function duyet() {
    let r = await lam(() => api('approveTraHang', d.phieu.id, { ...thamSo(), ghiChu }));
    if (!r) return;
    if (!r.daDuyet) {
      setX(r.xet);
      const ly = await hoi({ title: '⚠️ Vượt ngưỡng ' + r.xet.nguong + '%', msg: 'Hàng trả (cả phiếu đã duyệt cùng kỳ) = ' + r.xet.pct + '% doanh thu ' + r.xet.ky.nhan + '.\nDuyệt NGOẠI LỆ thì ghi lý do (≥ 5 ký tự):', input: true, min: 5, okText: 'Duyệt ngoại lệ', danger: true });
      if (!ly) return;
      r = await lam(() => api('approveTraHang', d.phieu.id, { ...thamSo(), ghiChu, ngoaiLe: true, lyDoNgoaiLe: ly }));
      if (!r || !r.daDuyet) return;
    }
    toast('Đã duyệt phiếu ' + d.phieu.ma + ' — chuyển kho / QC tiếp nhận.', 'ok');
    onXong();
  }
  async function tuChoi() {
    const ly = await hoi({ title: 'Từ chối phiếu ' + d.phieu.ma, msg: '3T sẽ thấy lý do. Ghi lý do từ chối:', input: true, min: 3, okText: 'Từ chối', danger: true });
    if (ly && await lam(() => api('rejectTraHang', d.phieu.id, ly), 'Đã từ chối phiếu.')) onXong();
  }
  return (
    <div className="card" style={{ marginTop: 10 }}>
      <h3>Xét ngưỡng trả hàng</h3>
      <div className="tablewrap"><table>
        <thead><tr><th>Mã</th><th>Tên</th><th className="num">SL</th><th>Số HĐ / DO gốc</th><th>Lý do</th><th className="num">Đơn giá trước thuế</th><th className="num">Giá trị</th></tr></thead>
        <tbody>{(x ? x.dongs : d.dongs.map((r) => ({ ...r, giaTri: r.giaTri }))).map((r) => { const g = d.dongs.find((y) => y.id === r.id) || {}; return (
          <tr key={r.id}><td><b>{r.sku}</b></td><td className="small">{r.ten}</td><td className="num">{fmtNum(r.sl)}</td><td>{g.soHd}</td><td className="small">{g.lyDo}</td>
            <td className="num"><input inputMode="numeric" style={{ width: 120, textAlign: 'right' }} placeholder={fmtNum(r.donGia)} value={gia[r.id] || ''} onChange={(e) => setGia({ ...gia, [r.id]: e.target.value })} />
              <div className="small muted">{NHAN_NGUON_GIA[r.nguonGia]}{!(r.donGia > 0) && <span style={{ color: 'var(--rose)' }}> — cần nhập</span>}</div></td>
            <td className="num">{fmtTien(r.giaTri)}</td></tr>
        ); })}</tbody>
      </table></div>
      {loi && <Loi>{loi}</Loi>}
      {x && (
        <div className="stats" style={{ marginTop: 8 }}>
          <div className="stat"><div className="small muted">Doanh thu {x.ky.nhan} ({x.doanhThuNguon === 'nhap_tay' ? 'nhập tay' : 'SAP ' + x.donVi + ', ' + x.soThangCoSo + '/' + x.soThangKy + ' tháng'})</div><b style={x.doanhThu > 0 ? null : { color: 'var(--rose)' }}>{x.doanhThu > 0 ? fmtTien(x.doanhThu) : 'Chưa có'}</b></div>
          <div className="stat"><div className="small muted">Phiếu này</div><b>{fmtTien(x.giaTriPhieu)}</b></div>
          <div className="stat"><div className="small muted">Đã duyệt cùng kỳ</div><b>{fmtTien(x.daDuyetCungKy)}</b></div>
          <div className="stat"><div className="small muted">Tỷ lệ / ngưỡng</div><b style={{ color: x.dat ? 'var(--emerald)' : 'var(--rose)' }}>{x.pct === null ? '—' : fmtNum(x.pct) + '%'} / {fmtNum(x.nguong)}%</b></div>
        </div>
      )}
      {x && x.doanhThuNguon === 'sap' && x.soThangCoSo < x.soThangKy && <div className="notice warn">Doanh thu SAP của kỳ mới có {x.soThangCoSo}/{x.soThangKy} tháng — kiểm lại, hoặc nhập doanh thu kỳ bằng tay.</div>}
      <div className="row">
        <Field label="Doanh thu kỳ nhập tay (đ, trước thuế) — để trống = dùng SAP"><input inputMode="numeric" value={dtTay} onChange={(e) => setDtTay(e.target.value)} style={{ width: 200 }} /></Field>
        <Field label="Ghi chú xét (nội bộ)" style={{ flex: 1 }}><input value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></Field>
        <button className="btn" style={{ marginBottom: 8 }} onClick={tinh}>Tính lại</button>
      </div>
      <div className="actions"><button className="btn dan" disabled={dang} onClick={tuChoi}>Từ chối</button><button className="btn pri" disabled={dang} onClick={duyet}>Duyệt</button></div>
    </div>
  );
}

/** Kho / QC: ngày nhận hàng, SL thực nhận + kết luận từng mã. Lưu nhiều lần; Hoàn tất khi đủ kết luận. */
function QcPhieu({ d, onXong }) {
  const [dang, lam] = useLam();
  const kl = useTai(() => api('getKetLuanQc'), []);
  const [ngay, setNgay] = useState(d.phieu.qcNhanNgay || homNay());
  const [v, setV] = useState(() => Object.fromEntries(d.dongs.map((x) => [x.id, { slNhan: x.slNhan === null ? '' : String(x.slNhan), ketLuan: x.ketLuan, ghiChu: x.qcGhiChu }])));
  const set = (id, k, val) => setV({ ...v, [id]: { ...v[id], [k]: val } });
  async function luu(hoanTat) {
    const dong = d.dongs.map((x) => ({ id: x.id, slNhan: v[x.id].slNhan === '' ? null : docTien(v[x.id].slNhan), ketLuan: v[x.id].ketLuan, ghiChu: v[x.id].ghiChu }));
    if (await lam(() => api('saveQcTraHang', d.phieu.id, { ngayNhan: ngay, dong, hoanTat }), hoanTat ? 'Đã hoàn tất kiểm tra — 3T thấy kết quả.' : 'Đã lưu kết quả.')) onXong();
  }
  const ds = kl.data ? kl.data.items.filter((x) => x.active) : [];
  return (
    <div className="card" style={{ marginTop: 10 }}>
      <h3>Kho / QC tiếp nhận & kiểm tra</h3>
      <Field label="Ngày kho nhận hàng"><input type="date" value={ngay} max={homNay()} onChange={(e) => setNgay(e.target.value)} /></Field>
      <div className="tablewrap"><table>
        <thead><tr><th>Mã</th><th>Tên</th><th className="num">SL trả</th><th>Lý do 3T</th><th className="num">SL thực nhận</th><th>Kết luận</th><th>Ghi chú QC</th></tr></thead>
        <tbody>{d.dongs.map((x) => (
          <tr key={x.id}><td><b>{x.sku}</b></td><td className="small">{x.ten}</td><td className="num">{fmtNum(x.sl)}</td><td className="small">{x.lyDo}</td>
            <td className="num"><input inputMode="numeric" style={{ width: 80, textAlign: 'right' }} value={v[x.id].slNhan} onChange={(e) => set(x.id, 'slNhan', e.target.value)} /></td>
            <td><select value={v[x.id].ketLuan} onChange={(e) => set(x.id, 'ketLuan', e.target.value)}><option value="">— chọn —</option>{ds.map((k) => <option key={k.code} value={k.code}>{k.ten}</option>)}</select></td>
            <td><input value={v[x.id].ghiChu} onChange={(e) => set(x.id, 'ghiChu', e.target.value)} style={{ width: '100%', minWidth: 160 }} /></td></tr>
        ))}</tbody>
      </table></div>
      <div className="actions"><button className="btn" disabled={dang} onClick={() => luu(false)}>Lưu</button><button className="btn pri" disabled={dang} onClick={() => luu(true)}>Hoàn tất kiểm tra</button></div>
    </div>
  );
}
