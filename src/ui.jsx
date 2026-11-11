import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { toneClass } from './utils/format';

/* ---------- thông báo + hộp thoại ---------- */
const Ctx = createContext(null);
export const useUi = () => useContext(Ctx);

export function UiProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dlg, setDlg] = useState(null);
  const seq = useRef(0);

  const toast = useCallback((msg, kind) => {
    const id = ++seq.current;
    setToasts((t) => t.concat({ id, msg, kind: kind || '' }));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === 'err' ? 9000 : 4500);
  }, []);

  /** hỏi xác nhận; opts.input = true thì có ô nhập (trả chuỗi) — trả false / null khi huỷ */
  const hoi = useCallback((opts) => new Promise((resolve) => setDlg({ ...opts, resolve })), []);
  const dong = (v) => { if (dlg) dlg.resolve(v); setDlg(null); };

  return (
    <Ctx.Provider value={{ toast, hoi }}>
      {children}
      <div className="toasts" aria-live="polite">{toasts.map((t) => <div key={t.id} className={'toast ' + t.kind}>{t.msg}</div>)}</div>
      {dlg && <HopThoai dlg={dlg} dong={dong} />}
    </Ctx.Provider>
  );
}

function HopThoai({ dlg, dong }) {
  const [val, setVal] = useState('');
  const ok = dlg.input ? val.trim().length >= (dlg.min || 1) : true;
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) dong(dlg.input ? null : false); }}>
      <div className="modal" role="dialog" aria-modal="true">
        <h2>{dlg.title || 'Xác nhận'}</h2>
        {dlg.msg && <div style={{ whiteSpace: 'pre-wrap', marginBottom: 10 }}>{dlg.msg}</div>}
        {dlg.input && <textarea autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder={dlg.placeholder || ''} style={{ minHeight: 70, fontFamily: 'inherit' }} />}
        <div className="actions">
          <button className="btn" onClick={() => dong(dlg.input ? null : false)}>{dlg.cancelText || 'Không'}</button>
          <button className={'btn ' + (dlg.danger ? 'dan' : 'pri')} disabled={!ok} onClick={() => dong(dlg.input ? val.trim() : true)}>{dlg.okText || 'Đồng ý'}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- thành phần nhỏ ---------- */
export const Tag = ({ tone, children }) => <span className={toneClass(tone)}>{children}</span>;
export const Spinner = ({ text }) => <span className="muted"><span className="spin" />{text || 'Đang tải…'}</span>;
export const Loi = ({ children, onRetry }) => <div className="notice err">{children}{onRetry && <> <button className="btn sm" onClick={onRetry}>Thử lại</button></>}</div>;

export function Modal({ title, onClose, wide, children, actions }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', k);
    return () => document.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true">
        <h2>{title}<button className="x" onClick={onClose} aria-label="Đóng">×</button></h2>
        {children}
        {actions && <div className="actions">{actions}</div>}
      </div>
    </div>
  );
}

export const Field = ({ label, children, style }) => <div className="field" style={style}><label>{label}</label>{children}</div>;

/** Tải dữ liệu: { data, loading, error, reload }. fn trả Promise; dùng lại khi deps đổi. */
export function useTai(fn, deps) {
  const [st, setSt] = useState({ data: null, loading: true, error: '' });
  const n = useRef(0);
  const chay = useCallback(() => {
    const id = ++n.current;
    setSt((s) => ({ ...s, loading: true, error: '' }));
    fn().then((d) => { if (id === n.current) setSt({ data: d, loading: false, error: '' }); })
      .catch((e) => { if (id === n.current) setSt({ data: null, loading: false, error: e.message || String(e) }); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { chay(); }, [chay]);
  return { ...st, reload: chay };
}

/** Chạy một thao tác ghi: khoá nút trong lúc chạy, báo lỗi bằng toast. */
export function useLam() {
  const { toast } = useUi();
  const [dang, setDang] = useState(false);
  const lam = useCallback(async (fn, okMsg) => {
    if (dang) return undefined;
    setDang(true);
    try { const r = await fn(); if (okMsg) toast(okMsg, 'ok'); return r === undefined ? true : r; }
    catch (e) { toast(e.message || String(e), 'err'); return undefined; }
    finally { setDang(false); }
  }, [dang, toast]);
  return [dang, lam];
}
