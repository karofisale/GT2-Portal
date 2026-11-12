import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Field, Modal, Spinner, Loi, Tag, useLam, useUi } from '../ui';
import { fmtNgay, fmtTien, homNay, layNguoi, nhoNguoi, sdtHopLe, docTien, laTepHopLe, TEP_TOI_DA, NHAN_TT, TONE_TT, tinhTrangHan, hanGanNhat, laKhach } from '../utils/format';

/* ================= tệp điện ================= */

/** Đọc tệp người dùng chọn -> { ten, mime, base64 }. Ảnh lớn hơn 1,2 MB được thu nhỏ (cạnh dài ≤ 2000px, JPEG) cho nhẹ đường truyền. */
export async function docTep(file) {
  if (!file) throw new Error('Chưa chọn tệp.');
  if (!laTepHopLe(file.type)) throw new Error('Chỉ nhận ảnh (JPG, PNG, WEBP) hoặc PDF.');
  let blob = file, ten = file.name || 'dien-chuyen-tien';
  if (file.type !== 'application/pdf' && file.size > 1.2 * 1024 * 1024 && typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file);
      const tl = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement('canvas');
      cv.width = Math.round(bmp.width * tl); cv.height = Math.round(bmp.height * tl);
      cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
      const nen = await new Promise((r) => cv.toBlob(r, 'image/jpeg', 0.85));
      if (nen && nen.size < file.size) { blob = nen; ten = ten.replace(/\.[^.]+$/, '') + '.jpg'; }
    } catch { /* không thu nhỏ được thì gửi nguyên tệp */ }
  }
  if (blob.size > TEP_TOI_DA) throw new Error('Tệp quá lớn (' + Math.round(blob.size / 1024) + ' KB) — tối đa 4 MB. Chụp lại ảnh nhỏ hơn hoặc nén PDF.');
  const base64 = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).replace(/^data:[^,]*,/, '')); fr.onerror = () => rej(new Error('Không đọc được tệp.')); fr.readAsDataURL(blob); });
  return { ten, mime: blob.type || file.type, base64 };
}

function ChonTep({ tep, setTep, batBuoc }) {
  const { toast } = useUi();
  const [dang, setDang] = useState(false);
  async function chon(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!f) return;
    setDang(true);
    try { setTep(await docTep(f)); } catch (x) { toast(x.message, 'err'); } finally { setDang(false); }
  }
  return (
    <Field label={'Ảnh / PDF điện chuyển tiền' + (batBuoc ? ' *' : ' (không bắt buộc)')}>
      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={chon} />
      {dang && <Spinner text="Đang đọc tệp…" />}
      {tep && <span className="small muted">✔ {tep.ten} · {Math.round(tep.base64.length * 0.75 / 1024)} KB <button type="button" className="btn sm" onClick={() => setTep(null)}>Bỏ</button></span>}
    </Field>
  );
}

/** Xem điện chuyển tiền đã gửi (ảnh hiện ngay; PDF hiện trong khung + nút tải). */
export const XemDien = ({ id, onClose }) => <XemTep id={id} fn="getTepThanhToan" title="Điện chuyển tiền" onClose={onClose} />;

/** Xem một tệp lưu trong GT2 (fn = API trả { ten, mime, base64 }). */
export function XemTep({ id, fn, title, onClose }) {
  const [st, setSt] = useState({ loading: true, error: '', tep: null, url: '' });
  useEffect(() => {
    let url = '', huy = false;
    api(fn, id).then((t) => {
      const bin = atob(t.base64), arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      url = URL.createObjectURL(new Blob([arr], { type: t.mime }));
      if (!huy) setSt({ loading: false, error: '', tep: t, url });
    }).catch((e) => { if (!huy) setSt({ loading: false, error: e.message, tep: null, url: '' }); });
    return () => { huy = true; if (url) URL.revokeObjectURL(url); };
  }, [id, fn]);
  return (
    <Modal title={title || 'Tệp đính kèm'} wide onClose={onClose} actions={st.url ? <><a className="btn" href={st.url} download={st.tep.ten}>Tải về</a><button className="btn" onClick={onClose}>Đóng</button></> : null}>
      {st.loading ? <Spinner /> : st.error ? <Loi>{st.error}</Loi> : st.tep.mime === 'application/pdf'
        ? <iframe title={st.tep.ten} src={st.url} style={{ width: '100%', height: '70vh', border: '1px solid var(--line)', borderRadius: 8 }} />
        : <img alt={st.tep.ten} src={st.url} style={{ maxWidth: '100%', maxHeight: '75vh', display: 'block', margin: '0 auto', borderRadius: 8 }} />}
    </Modal>
  );
}

/* ================= các form ================= */

/** Đại lý / BHT gửi điện chuyển tiền cho MỘT đơn. don = { donId, ma, conNo }. */
export function FormGuiDien({ don, onClose, onXong }) {
  const [dang, lam] = useLam();
  const [soTien, setSoTien] = useState(don.conNo > 0 ? String(Math.round(don.conNo)) : '');
  const [ngay, setNgay] = useState(homNay());
  const [noiDung, setNoiDung] = useState('');
  const [tep, setTep] = useState(null);
  const [nguoi, setNguoi] = useState(() => layNguoi(window.localStorage));
  const tien = docTien(soTien);
  const hopLe = tien > 0 && ngay && tep && nguoi.ten.trim().length >= 2 && sdtHopLe(nguoi.sdt);
  async function gui() {
    nhoNguoi(window.localStorage, nguoi);
    if (await lam(() => api('guiDienThanhToan', { donId: don.donId, soTien: tien, ngayChuyen: ngay, noiDung, nguoi, tep }), 'Đã gửi điện — chờ Kế toán Karofi xác nhận khi tiền về.')) onXong();
  }
  return (
    <Modal title={'Gửi điện chuyển tiền — đơn ' + don.ma} onClose={onClose} actions={<><button className="btn" onClick={onClose}>Đóng</button><button className="btn pri" disabled={dang || !hopLe} onClick={gui}>Gửi điện</button></>}>
      {don.conNo > 0 && <div className="notice">Đơn còn nợ <b>{fmtTien(don.conNo)}</b>. Một đơn trả được nhiều lần — nhập đúng số tiền của lần chuyển này.</div>}
      <div className="row">
        <Field label="Số tiền đã chuyển (đ) *"><input inputMode="numeric" value={soTien} onChange={(e) => setSoTien(e.target.value)} style={{ width: 180 }} />{tien > 0 && <span className="small muted">{fmtTien(tien)}</span>}</Field>
        <Field label="Ngày chuyển *"><input type="date" value={ngay} max={homNay()} onChange={(e) => setNgay(e.target.value)} /></Field>
      </div>
      <ChonTep tep={tep} setTep={setTep} batBuoc />
      <Field label="Nội dung chuyển khoản / ghi chú"><input value={noiDung} onChange={(e) => setNoiDung(e.target.value)} maxLength={300} /></Field>
      <div className="row">
        <Field label="Người gửi *"><input value={nguoi.ten} onChange={(e) => setNguoi({ ...nguoi, ten: e.target.value })} /></Field>
        <Field label="Số điện thoại *"><input value={nguoi.sdt} onChange={(e) => setNguoi({ ...nguoi, sdt: e.target.value })} /></Field>
      </div>
      <p className="small muted">Khoản này chỉ được trừ vào công nợ sau khi Kế toán Karofi xác nhận tiền đã về. Gửi nhầm thì rút lại được khi chưa xác nhận.</p>
    </Modal>
  );
}

/** Kế toán / admin ghi một khoản đã thu không qua điện của khách (ghi là đã xác nhận). */
export function FormGhiTay({ don, onClose, onXong }) {
  const [dang, lam] = useLam();
  const [soTien, setSoTien] = useState(don.conNo > 0 ? String(Math.round(don.conNo)) : '');
  const [ngay, setNgay] = useState(homNay());
  const [noiDung, setNoiDung] = useState('');
  const [tep, setTep] = useState(null);
  const tien = docTien(soTien);
  async function luu() {
    if (await lam(() => api('ghiThanhToanTay', { donId: don.donId, soTien: tien, ngayTienVe: ngay, noiDung, tep: tep || undefined }), 'Đã ghi khoản thu ' + fmtTien(tien) + ' cho đơn ' + don.ma + '.')) onXong();
  }
  return (
    <Modal title={'Ghi thanh toán — đơn ' + don.ma} onClose={onClose} actions={<><button className="btn" onClick={onClose}>Đóng</button><button className="btn pri" disabled={dang || !(tien > 0) || !ngay} onClick={luu}>Ghi đã thu</button></>}>
      <div className="notice warn">Dùng khi tiền đã về mà khách không gửi điện qua portal. Khoản này được tính là <b>đã xác nhận</b> ngay.</div>
      <div className="row">
        <Field label="Số tiền thực nhận (đ) *"><input inputMode="numeric" value={soTien} onChange={(e) => setSoTien(e.target.value)} style={{ width: 180 }} />{tien > 0 && <span className="small muted">{fmtTien(tien)}</span>}</Field>
        <Field label="Ngày tiền về *"><input type="date" value={ngay} max={homNay()} onChange={(e) => setNgay(e.target.value)} /></Field>
      </div>
      <Field label="Nội dung / số chứng từ"><input value={noiDung} onChange={(e) => setNoiDung(e.target.value)} maxLength={300} /></Field>
      <ChonTep tep={tep} setTep={setTep} />
    </Modal>
  );
}

/** Kế toán xác nhận tiền về — sửa được số tiền thực nhận / ngày nếu lệch điện. */
export function FormXacNhan({ tt, onClose, onXong }) {
  const [dang, lam] = useLam();
  const [soTien, setSoTien] = useState(String(Math.round(tt.soTien)));
  const [ngay, setNgay] = useState(homNay());
  const [xem, setXem] = useState(false);
  const tien = docTien(soTien);
  async function luu() { if (await lam(() => api('xacNhanThanhToan', tt.id, { soTien: tien, ngayTienVe: ngay }), 'Đã xác nhận ' + fmtTien(tien) + ' — đơn ' + tt.ma + '.')) onXong(); }
  return (
    <Modal title={'Xác nhận tiền về — đơn ' + tt.ma} onClose={onClose} actions={<><button className="btn" onClick={onClose}>Đóng</button><button className="btn pri" disabled={dang || !(tien > 0) || !ngay} onClick={luu}>Xác nhận đã nhận</button></>}>
      <dl className="kv">
        <dt>Đối tác</dt><dd>{tt.doiTacTen || tt.doiTac} ({tt.doiTac})</dd>
        <dt>Điện ghi</dt><dd><b>{fmtTien(tt.soTien)}</b> · chuyển ngày {fmtNgay(tt.ngayChuyen)}</dd>
        {tt.noiDung && <><dt>Nội dung</dt><dd>{tt.noiDung}</dd></>}
        <dt>Người gửi</dt><dd>{tt.nguoi.ten} {tt.nguoi.sdt}</dd>
        {tt.coTep && <><dt>Điện</dt><dd><button className="btn sm" onClick={() => setXem(true)}>Xem điện</button></dd></>}
      </dl>
      <div className="row">
        <Field label="Số tiền thực nhận (đ)"><input inputMode="numeric" value={soTien} onChange={(e) => setSoTien(e.target.value)} style={{ width: 180 }} />{tien > 0 && Math.abs(tien - tt.soTien) > 0.5 && <span className="small" style={{ color: 'var(--amber)' }}>Lệch điện {fmtTien(tien - tt.soTien)}</span>}</Field>
        <Field label="Ngày tiền về"><input type="date" value={ngay} max={homNay()} onChange={(e) => setNgay(e.target.value)} /></Field>
      </div>
      {xem && <XemDien id={tt.id} onClose={() => setXem(false)} />}
    </Modal>
  );
}

/* ================= bảng các lần trả ================= */

/** Danh sách các lần trả (mọi trạng thái). Khách rút được điện đang chờ; kế toán xác nhận / từ chối. */
export function BangThanhToan({ ds, me, onDoi, anMaDon }) {
  const { hoi } = useUi();
  const [dang, lam] = useLam();
  const [xem, setXem] = useState(null);
  const [xn, setXn] = useState(null);
  const keToan = me.role === 'account' || me.role === 'admin';
  async function rut(t) {
    if (!(await hoi({ title: 'Rút điện ' + fmtTien(t.soTien) + '?', msg: 'Chỉ rút khi gửi nhầm. Điện chưa được Kế toán xác nhận nên rút được.', okText: 'Rút điện', danger: true }))) return;
    if (await lam(() => api('rutDienThanhToan', t.id), 'Đã rút điện.')) onDoi();
  }
  async function tuChoi(t) {
    const ly = await hoi({ title: 'Từ chối điện ' + fmtTien(t.soTien) + ' — đơn ' + t.ma, msg: 'Khách sẽ thấy lý do. Ghi lý do từ chối:', input: true, min: 3, okText: 'Từ chối', danger: true });
    if (ly) { if (await lam(() => api('tuChoiThanhToan', t.id, ly), 'Đã từ chối điện.')) onDoi(); }
  }
  if (!ds.length) return <p className="muted small">Chưa có lần trả nào.</p>;
  return (
    <>
      <div className="tablewrap"><table>
        <thead><tr>{!anMaDon && <th>Đơn</th>}<th className="num">Số tiền</th><th>Ngày chuyển</th><th>Trạng thái</th><th>Người gửi / ghi</th><th /></tr></thead>
        <tbody>{ds.map((t) => (
          <tr key={t.id}>
            {!anMaDon && <td className="nowrap"><b>{t.ma}</b>{t.soSap && <div className="small muted">SO {t.soSap}</div>}</td>}
            <td className="num nowrap">{fmtTien(t.soTien)}{t.soTienXn !== null && Math.abs(t.soTienXn - t.soTien) > 0.5 && <div className="small" style={{ color: 'var(--amber)' }}>thực nhận {fmtTien(t.soTienXn)}</div>}</td>
            <td className="nowrap">{fmtNgay(t.ngayChuyen)}{t.ngayTienVe && <div className="small muted">tiền về {fmtNgay(t.ngayTienVe)}</div>}</td>
            <td><Tag tone={TONE_TT[t.trangThai]}>{t.nguon === 'tay' ? 'Kế toán ghi' : NHAN_TT[t.trangThai]}</Tag>{t.lyDoTuChoi && <div className="small" style={{ color: 'var(--rose)' }}>{t.lyDoTuChoi}</div>}{t.noiDung && <div className="small muted">{t.noiDung}</div>}</td>
            <td className="small">{t.nguoi.ten ? t.nguoi.ten + ' ' + t.nguoi.sdt : (t.nhapBoi || '')}<div className="muted">{fmtNgay(t.nhapLuc)}</div></td>
            <td className="right nowrap">
              {t.coTep && <button className="btn sm" onClick={() => setXem(t.id)}>Xem điện</button>}
              {laKhach(me.role) && t.trangThai === 'cho' && <> <button className="btn sm" disabled={dang} onClick={() => rut(t)}>Rút</button></>}
              {keToan && t.trangThai === 'cho' && <> <button className="btn sm pri" disabled={dang} onClick={() => setXn(t)}>Xác nhận</button> <button className="btn sm" disabled={dang} onClick={() => tuChoi(t)}>Từ chối</button></>}
            </td>
          </tr>
        ))}</tbody>
      </table></div>
      {xem && <XemDien id={xem} onClose={() => setXem(null)} />}
      {xn && <FormXacNhan tt={xn} onClose={() => setXn(null)} onXong={() => { setXn(null); onDoi(); }} />}
    </>
  );
}

/* ================= sổ một đối tác ================= */

export function TheSo({ x }) {
  const o = [['Đã giao (xuất kho)', fmtTien(x.tong)], ['Đã trả (đã xác nhận)', fmtTien(x.daTra)], ['Còn nợ', fmtTien(x.conNo), x.conNo > 0 ? 'var(--navy)' : ''],
    ['Quá hạn', x.quaHan > 0 ? fmtTien(x.quaHan) + ' · ' + x.soNgayQuaHanMax + ' ngày' : '—', x.quaHan > 0 ? 'var(--rose)' : ''], ['Sắp đến hạn', x.sapDenHan > 0 ? fmtTien(x.sapDenHan) : '—', x.sapDenHan > 0 ? 'var(--amber)' : ''],
    ['Điện chờ xác nhận', x.choXacNhan > 0 ? fmtTien(x.choXacNhan) + ' (' + x.soDienCho + ')' : '—']];
  if (x.loai === 'dai_ly' && x.giaoGiaBht !== undefined) o.push(['Đã giao theo giá Karofi→BHT', fmtTien(x.giaoGiaBht) + (x.thieuGiaBht ? ' ⚠' : '')]);
  if (x.hanMuc !== null && x.hanMuc !== undefined) o.push(['Hạn mức', fmtTien(x.hanMuc) + (x.vuotHanMuc > 0 ? ' · vượt ' + fmtTien(x.vuotHanMuc) : ''), x.vuotHanMuc > 0 ? 'var(--rose)' : '']);
  return <div className="stats">{o.map(([k, v, mau]) => <div key={k} className="stat"><div className="small muted">{k}</div><b style={mau ? { color: mau } : null}>{v}</b></div>)}</div>;
}

/** Sổ chi tiết của MỘT đối tác: các đơn có nợ / có trả + các lần trả. x = phần tử doiTacs của getCongNo (có dons, thanhToan). */
export function SoDoiTac({ x, me, onDoi }) {
  const [gui, setGui] = useState(null);
  const [ghi, setGhi] = useState(null);
  const khach = laKhach(me.role), keToan = me.role === 'account' || me.role === 'admin';
  return (
    <>
      <TheSo x={x} />
      <h4 style={{ margin: '12px 0 6px' }}>Theo đơn</h4>
      <div className="tablewrap"><table>
        <thead><tr><th>Đơn</th><th className="num">Đã giao</th><th className="num">Đã trả</th><th className="num">Còn nợ</th><th>Hạn gần nhất</th><th>Tình trạng</th><th /></tr></thead>
        <tbody>
          {x.dons.map((d) => { const tt = tinhTrangHan(d); return (
            <tr key={d.donId} className={d.quaHan > 0 ? 'late' : ''}>
              <td className="nowrap"><b>{d.ma}</b>{d.soSap && <div className="small muted">SO {d.soSap}</div>}</td>
              <td className="num">{fmtTien(d.tong)}<div className="small muted">{d.khoans.map((k) => k.soDo + ' · ' + fmtNgay(k.ngayPgi)).join(', ')}</div></td>
              <td className="num">{fmtTien(d.daTra)}{d.traTruoc > 0 && <div className="small muted">trả trước {fmtTien(d.traTruoc)}</div>}</td>
              <td className="num"><b>{fmtTien(d.conNo)}</b></td>
              <td className="nowrap">{fmtNgay(hanGanNhat(d)) || '—'}</td>
              <td><Tag tone={tt.tone}>{tt.nhan}</Tag></td>
              <td className="right nowrap">
                {khach && <button className="btn sm pri" onClick={() => setGui({ donId: d.donId, ma: d.ma, conNo: d.conNo })}>Gửi điện</button>}
                {keToan && <button className="btn sm" onClick={() => setGhi({ donId: d.donId, ma: d.ma, conNo: d.conNo })}>Ghi thanh toán</button>}
              </td>
            </tr>
          ); })}
          {!x.dons.length && <tr><td colSpan={7} className="muted">Chưa có đơn nào đã xuất kho hoặc đã trả tiền.</td></tr>}
        </tbody>
      </table></div>
      {khach && <p className="small muted">Muốn trả trước cho đơn chưa giao: mở đơn ở "Đơn của tôi" → mục Thanh toán → Gửi điện.</p>}
      <h4 style={{ margin: '14px 0 6px' }}>Các lần trả</h4>
      <BangThanhToan ds={x.thanhToan} me={me} onDoi={onDoi} />
      {gui && <FormGuiDien don={gui} onClose={() => setGui(null)} onXong={() => { setGui(null); onDoi(); }} />}
      {ghi && <FormGhiTay don={ghi} onClose={() => setGhi(null)} onXong={() => { setGhi(null); onDoi(); }} />}
    </>
  );
}

/** Mục "Thanh toán" trong chi tiết một đơn kênh BHT. tt = getDon().thanhToan. */
export function MucThanhToanDon({ don, tt, me, onDoi }) {
  const [gui, setGui] = useState(false);
  const [ghi, setGhi] = useState(false);
  const tinh = tinhTrangHan(tt);
  const d = { donId: don.id, ma: don.ma, conNo: tt.conNo };
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <h3>Thanh toán <Tag tone={tinh.tone}>{tinh.nhan}</Tag></h3>
      {!tt.coBangThanhToan && <div className="notice warn">Chức năng thanh toán chưa được bật (Karofi chưa cài đặt xong) — tạm thời chỉ xem được phần nợ.</div>}
      <TheSo x={{ ...tt, soDienCho: tt.ds.filter((t) => t.trangThai === 'cho').length, hanMuc: null }} />
      {tt.khoans.length > 0 && <p className="small muted">Ghi nợ theo DO đã xuất kho: {tt.khoans.map((k) => k.soDo + ' xuất ' + fmtNgay(k.ngayPgi) + ' · ' + fmtTien(k.soTien) + ' · hạn ' + fmtNgay(k.han)).join(' | ')}</p>}
      <BangThanhToan ds={tt.ds} me={me} onDoi={onDoi} anMaDon />
      <div className="actions">
        {tt.choUpload && <button className="btn pri" onClick={() => setGui(true)}>Gửi điện chuyển tiền</button>}
        {tt.choGhiTay && <button className="btn" onClick={() => setGhi(true)}>Ghi thanh toán</button>}
      </div>
      {gui && <FormGuiDien don={d} onClose={() => setGui(false)} onXong={() => { setGui(false); onDoi(); }} />}
      {ghi && <FormGhiTay don={d} onClose={() => setGhi(false)} onXong={() => { setGhi(false); onDoi(); }} />}
    </div>
  );
}
