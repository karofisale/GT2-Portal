import React, { useState } from 'react';
import { api } from '../services/api';
import { Field, Modal, Spinner, Loi, Tag, useTai, useLam, useUi } from '../ui';
import { fmtNgay, fmtNum, fmtTien, NHAN_LOAI } from '../utils/format';

const TABS = [['doiTac', 'Đối tác'], ['kho', 'Kho'], ['sanPham', 'Sản phẩm & giá'], ['leadtime', 'Leadtime'], ['lyDo', 'Lý do chưa có ngày'], ['ngayNghi', 'Ngày nghỉ lễ'], ['thamSo', 'Tham số']];

/** Danh mục & cài đặt. Admin sửa tất cả; planner chỉ sửa leadtime (các mục khác chỉ xem). */
export default function CaiDat({ me }) {
  const [tab, setTab] = useState(me.role === 'planner' ? 'leadtime' : 'doiTac');
  const admin = me.role === 'admin';
  return (
    <div>
      <div className="tabs">{TABS.map(([k, t]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{t}</button>)}</div>
      {tab === 'doiTac' && <DoiTac admin={admin} />}
      {tab === 'kho' && <Kho admin={admin} />}
      {tab === 'sanPham' && <SanPham admin={admin} />}
      {tab === 'leadtime' && <Leadtime />}
      {tab === 'lyDo' && <LyDo admin={admin} />}
      {tab === 'ngayNghi' && <NgayNghi admin={admin} />}
      {tab === 'thamSo' && <ThamSo admin={admin} />}
    </div>
  );
}

function Khung({ t, children }) {
  if (t.loading && !t.data) return <Spinner />;
  if (t.error) return <Loi onRetry={t.reload}>{t.error}</Loi>;
  return children;
}

/* ---------- đối tác ---------- */
function DoiTac({ admin }) {
  const t = useTai(() => api('getDoiTac'), []);
  const [sua, setSua] = useState(null);
  return (
    <Khung t={t}>
      <div className="actions" style={{ marginTop: 0, marginBottom: 8 }}>{admin && <button className="btn pri" onClick={() => setSua({ code: '', name: '', loai: 'dai_ly', cha: '', soldTo: '', shipTo: '', hanMuc: '', hanThanhToanNgay: 5, active: true, moi: true })}>+ Thêm đối tác</button>}</div>
      <div className="tablewrap"><table>
        <thead><tr><th>Mã</th><th>Tên</th><th>Loại</th><th>Thuộc BHT</th><th>Sold-to / Ship-to SAP</th><th className="num">Hạn mức</th><th className="num">Hạn TT (ngày)</th><th>Hoạt động</th><th /></tr></thead>
        <tbody>
          {t.data && t.data.items.map((x) => (
            <tr key={x.code}><td><b>{x.code}</b></td><td>{x.name}</td><td>{NHAN_LOAI[x.loai]}</td><td>{x.cha}</td><td className="small">{x.soldTo} / {x.shipTo}</td>
              <td className="num">{x.hanMuc === null ? '—' : fmtTien(x.hanMuc)}</td><td className="num">{x.hanThanhToanNgay}</td><td>{x.active ? <Tag tone="emerald">Có</Tag> : <Tag tone="gray">Tắt</Tag>}</td>
              <td className="right">{admin && <button className="btn sm" onClick={() => setSua({ ...x, hanMuc: x.hanMuc === null ? '' : x.hanMuc })}>Sửa</button>}</td></tr>
          ))}
        </tbody>
      </table></div>
      {sua && <FormDoiTac v={sua} ds={t.data.items} onClose={() => setSua(null)} onXong={() => { setSua(null); t.reload(); }} />}
    </Khung>
  );
}
function FormDoiTac({ v, ds, onClose, onXong }) {
  const [dang, lam] = useLam();
  const [f, setF] = useState(v);
  const set = (k, x) => setF((o) => ({ ...o, [k]: x }));
  const luu = async () => { if (await lam(() => api('saveDoiTac', { ...f, hanMuc: f.hanMuc === '' ? null : Number(f.hanMuc) }), 'Đã lưu đối tác.')) onXong(); };
  return (
    <Modal title={v.moi ? 'Thêm đối tác' : 'Sửa ' + v.code} onClose={onClose} actions={<><button className="btn" onClick={onClose}>Đóng</button><button className="btn pri" disabled={dang} onClick={luu}>Lưu</button></>}>
      <div className="row">
        <Field label="Mã đối tác *"><input value={f.code} disabled={!v.moi} onChange={(e) => set('code', e.target.value)} /></Field>
        <Field label="Loại *"><select value={f.loai} onChange={(e) => set('loai', e.target.value)}>{Object.entries(NHAN_LOAI).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Field>
      </div>
      <Field label="Tên *"><input value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
      {f.loai === 'dai_ly' && (
        <div className="row">
          <Field label="Thuộc BHT *"><select value={f.cha} onChange={(e) => set('cha', e.target.value)}><option value="">—</option>{ds.filter((x) => x.loai === 'bht').map((x) => <option key={x.code} value={x.code}>{x.code}</option>)}</select></Field>
          <Field label="Hạn mức công nợ (đ) — chỉ cảnh báo"><input type="number" value={f.hanMuc} onChange={(e) => set('hanMuc', e.target.value)} /></Field>
        </div>
      )}
      <div className="row">
        <Field label="Sold-to SAP"><input value={f.soldTo} onChange={(e) => set('soldTo', e.target.value)} /></Field>
        <Field label="Ship-to SAP"><input value={f.shipTo} onChange={(e) => set('shipTo', e.target.value)} /></Field>
        <Field label="Hạn thanh toán (ngày sau PGI)"><input type="number" value={f.hanThanhToanNgay} onChange={(e) => set('hanThanhToanNgay', e.target.value)} style={{ width: 90 }} /></Field>
      </div>
      <label><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Đang hoạt động</label>
    </Modal>
  );
}

/* ---------- kho ---------- */
function Kho({ admin }) {
  const t = useTai(() => api('getKho'), []);
  const dt = useTai(() => api('getDoiTac'), []);
  const [sua, setSua] = useState(null);
  return (
    <Khung t={t}>
      <p className="small muted">Danh sách kho chưa cứng trong hệ thống — thêm / sửa ở đây khi có danh sách đầy đủ. Kho "nhà máy" dùng chung; kho "riêng" gắn với một đối tác (và một miền với NSKX / 3T). Đại lý BHT dùng kho riêng của BHT cha.</p>
      <div className="actions" style={{ marginTop: 0, marginBottom: 8 }}>{admin && <button className="btn pri" onClick={() => setSua({ plant: '', sloc: '', loai: 'rieng', doiTac: '', mien: '', ten: '', active: true, moi: true })}>+ Thêm kho</button>}</div>
      <div className="tablewrap"><table>
        <thead><tr><th>Plant</th><th>Sloc</th><th>Loại</th><th>Đối tác</th><th>Miền</th><th>Tên</th><th>Hoạt động</th><th /></tr></thead>
        <tbody>{t.data && t.data.items.map((x) => (
          <tr key={x.plant + x.sloc}><td>{x.plant}</td><td>{x.sloc}</td><td>{x.loai === 'nha_may' ? 'Nhà máy' : 'Riêng'}</td><td>{x.doiTac}</td><td>{x.mien === 'bac' ? 'Bắc' : x.mien === 'nam' ? 'Nam' : ''}</td><td>{x.ten}</td><td>{x.active ? 'Có' : 'Tắt'}</td>
            <td className="right">{admin && <button className="btn sm" onClick={() => setSua(x)}>Sửa</button>}</td></tr>))}
          {t.data && !t.data.items.length && <tr><td colSpan={8} className="muted">Chưa có kho nào.</td></tr>}
        </tbody>
      </table></div>
      {sua && <FormKho v={sua} dts={dt.data ? dt.data.items : []} onClose={() => setSua(null)} onXong={() => { setSua(null); t.reload(); }} />}
    </Khung>
  );
}
function FormKho({ v, dts, onClose, onXong }) {
  const [dang, lam] = useLam();
  const [f, setF] = useState(v);
  const set = (k, x) => setF((o) => ({ ...o, [k]: x }));
  const luu = async () => { if (await lam(() => api('saveKho', f), 'Đã lưu kho.')) onXong(); };
  return (
    <Modal title={v.moi ? 'Thêm kho' : 'Sửa kho ' + v.plant + '/' + v.sloc} onClose={onClose} actions={<><button className="btn" onClick={onClose}>Đóng</button><button className="btn pri" disabled={dang} onClick={luu}>Lưu</button></>}>
      <div className="row">
        <Field label="Plant *"><input value={f.plant} disabled={!v.moi} onChange={(e) => set('plant', e.target.value)} style={{ width: 90 }} /></Field>
        <Field label="Sloc *"><input value={f.sloc} disabled={!v.moi} onChange={(e) => set('sloc', e.target.value)} style={{ width: 90 }} /></Field>
        <Field label="Loại"><select value={f.loai} onChange={(e) => set('loai', e.target.value)}><option value="rieng">Kho riêng</option><option value="nha_may">Nhà máy</option></select></Field>
      </div>
      {f.loai === 'rieng' && (
        <div className="row">
          <Field label="Đối tác *"><select value={f.doiTac} onChange={(e) => set('doiTac', e.target.value)}><option value="">—</option>{dts.map((x) => <option key={x.code} value={x.code}>{x.code}</option>)}</select></Field>
          <Field label="Miền"><select value={f.mien} onChange={(e) => set('mien', e.target.value)}><option value="">(không chia miền)</option><option value="bac">Bắc</option><option value="nam">Nam</option></select></Field>
        </div>
      )}
      <Field label="Tên kho"><input value={f.ten} onChange={(e) => set('ten', e.target.value)} /></Field>
      <label><input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} /> Đang dùng</label>
    </Modal>
  );
}

/* ---------- sản phẩm & giá ---------- */
function SanPham({ admin }) {
  const { hoi } = useUi();
  const [dang, lam] = useLam();
  const dt = useTai(() => api('getDoiTac'), []);
  const [ma, setMa] = useState('');
  const sp = useTai(() => (ma ? api('getSanPham', { doiTac: ma }) : Promise.resolve(null)), [ma]);
  const [text, setText] = useState('');
  const [thayThe, setThayThe] = useState(false);

  async function nap() {
    const rows = text.split('\n').map((l) => l.replace(/\r/g, '')).filter((l) => l.trim()).map((l) => {
      const c = l.indexOf('\t') >= 0 ? l.split('\t') : l.split(';');
      return { sku: (c[0] || '').trim(), name: (c[1] || '').trim(), category: (c[2] || '').trim(), gia: Number(String(c[3] || '').replace(/[.,\s]/g, '')) };
    }).filter((r) => r.sku.toLowerCase() !== 'mã' && r.sku.toLowerCase() !== 'sku');
    if (!rows.length) return;
    if (!(await hoi({ title: 'Nạp danh mục cho ' + ma, msg: rows.length + ' mã' + (thayThe ? '. Mã không có trong lần nạp này sẽ bị TẮT cho đối tác.' : ' (cập nhật + thêm mới).'), okText: 'Nạp' }))) return;
    if (await lam(() => api('importDanhMuc', { doiTac: ma, rows, thayThe }), 'Đã nạp ' + rows.length + ' mã.')) { setText(''); sp.reload(); }
  }
  return (
    <div>
      <Field label="Đối tác" style={{ maxWidth: 260 }}>
        <select value={ma} onChange={(e) => setMa(e.target.value)}><option value="">— chọn —</option>{dt.data && dt.data.items.map((x) => <option key={x.code} value={x.code}>{x.code} — {x.name}</option>)}</select>
      </Field>
      {ma && (sp.loading && !sp.data ? <Spinner /> : sp.error ? <Loi onRetry={sp.reload}>{sp.error}</Loi> : sp.data && (
        <>
          <div className="tablewrap" style={{ maxHeight: 360, overflow: 'auto' }}><table>
            <thead><tr><th>Mã</th><th>Tên</th><th>Nhóm</th><th className="num">Giá</th><th className="num">Tồn riêng</th><th className="num">Tồn nhà máy</th></tr></thead>
            <tbody>{sp.data.items.map((x) => <tr key={x.sku}><td><b>{x.sku}</b></td><td>{x.name}</td><td>{x.category}</td><td className="num">{fmtTien(x.gia)}</td><td className="num">{fmtNum(x.tonRieng)}</td><td className="num">{fmtNum(x.tonNhaMay)}</td></tr>)}
              {!sp.data.items.length && <tr><td colSpan={6} className="muted">Đối tác này chưa có danh mục.</td></tr>}</tbody>
          </table></div>
          {admin && (
            <div className="card" style={{ marginTop: 12 }}>
              <h3>Nạp / cập nhật danh mục + giá (dán từ Excel)</h3>
              <p className="small muted">Mỗi dòng: <b>Mã</b> ⇥ <b>Tên</b> ⇥ <b>Nhóm (category — dùng cho leadtime)</b> ⇥ <b>Giá</b>. Cột phân cách là Tab (copy từ Excel) hoặc dấu chấm phẩy.</p>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={'1000123\tMáy lọc A\tMáy\t1250000'} />
              <label className="small"><input type="checkbox" checked={thayThe} onChange={(e) => setThayThe(e.target.checked)} /> Thay thế toàn bộ — tắt các mã của đối tác không có trong lần nạp này</label>
              <div className="actions"><button className="btn pri" disabled={dang || !text.trim()} onClick={nap}>Nạp danh mục</button></div>
            </div>
          )}
        </>
      ))}
    </div>
  );
}

/* ---------- leadtime ---------- */
function Leadtime() {
  const t = useTai(() => api('getLeadtime'), []);
  const [dang, lam] = useLam();
  const [cat, setCat] = useState('');
  const [ngay, setNgay] = useState('');
  const luu = async (c, n) => { if (await lam(() => api('saveLeadtime', { category: c, ngay: Number(n) }), 'Đã lưu leadtime ' + c + '.')) { setCat(''); setNgay(''); t.reload(); } };
  return (
    <Khung t={t}>
      <p className="small muted">Leadtime chuẩn (số ngày LỊCH) theo category sản phẩm — dùng gợi ý ngày giao khi không đủ tồn. Mọi thay đổi được lưu lịch sử. Rà soát hằng tuần.</p>
      <div className="tablewrap"><table>
        <thead><tr><th>Category</th><th className="num">Ngày</th><th>Cập nhật bởi</th><th>Lúc</th><th /></tr></thead>
        <tbody>{t.data && t.data.items.map((x) => (
          <tr key={x.category}><td><b>{x.category}</b></td><td className="num"><input type="number" min="0" defaultValue={x.ngay} style={{ width: 80, textAlign: 'right' }} onBlur={(e) => { if (Number(e.target.value) !== x.ngay) luu(x.category, e.target.value); }} /></td><td>{x.by}</td><td>{fmtNgay(x.at)}</td><td /></tr>))}
          {t.data && !t.data.items.length && <tr><td colSpan={5} className="muted">Chưa có leadtime nào.</td></tr>}
        </tbody>
      </table></div>
      <div className="card" style={{ marginTop: 12 }}>
        <h3>Thêm / đổi leadtime</h3>
        <div className="row">
          <Field label="Category"><input list="gt2-cat" value={cat} onChange={(e) => setCat(e.target.value)} /><datalist id="gt2-cat">{t.data && t.data.categories.map((c) => <option key={c} value={c} />)}</datalist></Field>
          <Field label="Số ngày"><input type="number" min="0" value={ngay} onChange={(e) => setNgay(e.target.value)} style={{ width: 90 }} /></Field>
          <button className="btn pri" style={{ marginBottom: 8 }} disabled={dang || !cat.trim() || ngay === ''} onClick={() => luu(cat.trim(), ngay)}>Lưu</button>
        </div>
      </div>
    </Khung>
  );
}

/* ---------- lý do ---------- */
function LyDo({ admin }) {
  const t = useTai(() => api('getLyDo'), []);
  const [dang, lam] = useLam();
  const [f, setF] = useState({ code: '', ten: '' });
  const luu = async (x) => { if (await lam(() => api('saveLyDo', x), 'Đã lưu.')) { setF({ code: '', ten: '' }); t.reload(); } };
  return (
    <Khung t={t}>
      <div className="tablewrap"><table>
        <thead><tr><th>Mã</th><th>Lý do (khách không thấy mã)</th><th>Đang dùng</th><th /></tr></thead>
        <tbody>{t.data && t.data.items.map((x) => <tr key={x.code}><td>{x.code}</td><td>{x.ten}</td><td>{x.active ? 'Có' : 'Tắt'}</td>
          <td className="right">{admin && <button className="btn sm" onClick={() => luu({ ...x, active: !x.active })}>{x.active ? 'Tắt' : 'Bật'}</button>}</td></tr>)}</tbody>
      </table></div>
      {admin && <div className="card" style={{ marginTop: 12 }}><h3>Thêm lý do</h3><div className="row">
        <Field label="Mã (a-z, 0-9, _)"><input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <Field label="Tên lý do" style={{ minWidth: 280 }}><input value={f.ten} onChange={(e) => setF({ ...f, ten: e.target.value })} /></Field>
        <button className="btn pri" style={{ marginBottom: 8 }} disabled={dang || !f.code.trim() || !f.ten.trim()} onClick={() => luu(f)}>Thêm</button></div></div>}
    </Khung>
  );
}

/* ---------- ngày nghỉ ---------- */
function NgayNghi({ admin }) {
  const t = useTai(() => api('getNgayNghi'), []);
  const [dang, lam] = useLam();
  const [ngay, setNgay] = useState('');
  const [gc, setGc] = useState('');
  const them = async () => { if (await lam(() => api('saveNgayNghi', { ngay: [ngay], ghiChu: gc }), 'Đã thêm ngày nghỉ.')) { setNgay(''); setGc(''); t.reload(); } };
  const bo = async (n) => { if (await lam(() => api('saveNgayNghi', { xoa: [n] }), 'Đã bỏ ngày nghỉ.')) t.reload(); };
  return (
    <Khung t={t}>
      <p className="small muted">Ngày làm việc = thứ 2 đến thứ 7, trừ các ngày nghỉ lễ của công ty khai ở đây. Dùng cho hạn xác nhận ngày giao của Kế hoạch và gợi ý ngày giao.</p>
      <div className="tablewrap"><table>
        <thead><tr><th>Ngày</th><th>Ghi chú</th><th /></tr></thead>
        <tbody>{t.data && t.data.items.map((x) => <tr key={x.ngay}><td>{fmtNgay(x.ngay)}</td><td>{x.ghiChu}</td><td className="right">{admin && <button className="btn sm" onClick={() => bo(x.ngay)}>Bỏ</button>}</td></tr>)}
          {t.data && !t.data.items.length && <tr><td colSpan={3} className="muted">Chưa khai ngày nghỉ nào.</td></tr>}</tbody>
      </table></div>
      {admin && <div className="card" style={{ marginTop: 12 }}><h3>Thêm ngày nghỉ</h3><div className="row">
        <Field label="Ngày"><input type="date" value={ngay} onChange={(e) => setNgay(e.target.value)} /></Field>
        <Field label="Ghi chú"><input value={gc} onChange={(e) => setGc(e.target.value)} /></Field>
        <button className="btn pri" style={{ marginBottom: 8 }} disabled={dang || !ngay} onClick={them}>Thêm</button></div></div>}
    </Khung>
  );
}

/* ---------- tham số ---------- */
function ThamSo({ admin }) {
  const t = useTai(() => api('getCaiDat'), []);
  const [dang, lam] = useLam();
  const luu = async (khoa, giaTri) => { if (await lam(() => api('saveCaiDat', { khoa, giaTri }), 'Đã lưu.')) t.reload(); };
  return (
    <Khung t={t}>
      <div className="tablewrap"><table>
        <thead><tr><th>Tham số</th><th>Giá trị</th><th>Ý nghĩa</th><th>Sửa bởi</th></tr></thead>
        <tbody>{t.data && t.data.items.map((x) => (
          <tr key={x.khoa}><td><code>{x.khoa}</code></td>
            <td>{admin ? (x.khoa === 'tra_hang_ky'
              ? <select defaultValue={x.giaTri} disabled={dang} onChange={(e) => luu(x.khoa, e.target.value)}><option value="quy">quý</option><option value="6thang">6 tháng</option></select>
              : <input defaultValue={x.giaTri} style={{ width: 90 }} disabled={dang} onBlur={(e) => { if (e.target.value.trim() !== x.giaTri) luu(x.khoa, e.target.value.trim()); }} />) : x.giaTri}</td>
            <td className="small">{x.ghiChu}</td><td className="small">{x.by} {fmtNgay(x.at)}</td></tr>))}
        </tbody>
      </table></div>
    </Khung>
  );
}
