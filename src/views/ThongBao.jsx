import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { useUi } from '../ui';
import { fmtNgay } from '../utils/format';
import { DonChiTiet } from './Don';

const CHU_KY_MS = 60000;
/** Thông báo trỏ tới đâu: đơn -> mở chi tiết đơn; còn lại -> chuyển màn. */
const MAN_CUA = { tra_hang: 'traHang', cong_no: 'congNo', ke_toan: 'keToan', sap: 'caiDat' };

/**
 * Chuông ở thanh trên: số chưa đọc, danh sách (chưa đọc lên trước) + nhắc tính tươi (công nợ quá hạn, điện chờ xác nhận, máy SAP lỗi).
 * Tự tải lại mỗi phút và khi quay lại tab trình duyệt. Bấm một thông báo = đánh dấu đã đọc + mở đúng chỗ.
 */
export default function Chuong({ me, chuyen, menu }) {
  const { toast } = useUi();
  const [d, setD] = useState(null);
  const [mo, setMo] = useState(false);
  const [don, setDon] = useState(null);
  const khung = useRef(null);
  const tai = useCallback(() => { api('getThongBao', {}).then(setD).catch(() => { /* chuông lỗi thì thôi — không làm phiền */ }); }, []);

  useEffect(() => {
    tai();
    const t = setInterval(() => { if (!document.hidden) tai(); }, CHU_KY_MS);
    const vis = () => { if (!document.hidden) tai(); };
    document.addEventListener('visibilitychange', vis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', vis); };
  }, [tai]);
  useEffect(() => {
    if (!mo) return undefined;
    const ngoai = (e) => { if (khung.current && !khung.current.contains(e.target)) setMo(false); };
    document.addEventListener('mousedown', ngoai);
    return () => document.removeEventListener('mousedown', ngoai);
  }, [mo]);

  const coMan = (k) => (menu || []).some((m) => m.key === k);
  async function bam(x) {
    setMo(false);
    if (x.id && !x.daDoc) { api('docThongBao', { ids: [x.id] }).then(tai).catch(() => {}); setD((v) => v && { ...v, chuaDoc: Math.max(0, v.chuaDoc - 1), items: v.items.map((y) => (y.id === x.id ? { ...y, daDoc: true } : y)) }); }
    if (x.loaiRef === 'don' && x.refId) { setDon(x.refId); return; }
    const man = MAN_CUA[x.loaiRef];
    if (man === 'caiDat') { try { window.localStorage.setItem('gt2.caiDat.tab', 'ketNoiSap'); } catch { /* bộ nhớ bị chặn */ } }
    if (man && coMan(man)) chuyen(man);
  }
  async function docHet() {
    try { await api('docThongBao', { tatCa: true }); tai(); } catch (e) { toast(e.message || String(e), 'err'); }
  }

  const so = d ? d.chuaDoc + (d.nhac ? d.nhac.length : 0) : 0;
  return (
    <div className="chuong" ref={khung}>
      <button className="btn sm" onClick={() => { setMo(!mo); if (!mo) tai(); }} aria-label={'Thông báo' + (so ? ' — ' + so + ' mới' : '')} title="Thông báo">
        🔔{so > 0 && <span className="badge">{so > 99 ? '99+' : so}</span>}
      </button>
      {mo && (
        <div className="popover" role="dialog" aria-label="Thông báo">
          <div className="pop-head"><b>Thông báo</b><span className="sp" />{d && d.chuaDoc > 0 && <button className="btn sm" onClick={docHet}>Đánh dấu đã đọc hết</button>}</div>
          {!d ? <div className="muted small pad">Đang tải…</div> : (
            <div className="pop-list">
              {(d.nhac || []).map((x, i) => (
                <button key={'n' + i} className={'pop-item nhac ' + (x.muc === 'warn' ? 'warn' : '')} onClick={() => bam(x)}>
                  <div className="t">{x.muc === 'warn' ? '⚠️ ' : '⏰ '}{x.tieuDe}</div>{x.noiDung && <div className="small muted">{x.noiDung}</div>}
                </button>
              ))}
              {d.items.map((x) => (
                <button key={x.id} className={'pop-item' + (x.daDoc ? ' doc' : '') + (x.muc === 'warn' ? ' warn' : '')} onClick={() => bam(x)}>
                  <div className="t">{!x.daDoc && <span className="cham" />}{x.tieuDe}</div>
                  {x.noiDung && <div className="small muted">{x.noiDung}</div>}
                  <div className="small muted">{fmtNgay(x.at)}</div>
                </button>
              ))}
              {!d.items.length && !(d.nhac || []).length && <div className="muted small pad">{d.coBang === false ? 'Chuông chưa bật (chờ quản trị chạy SQL đợt 38).' : 'Chưa có thông báo nào.'}</div>}
            </div>
          )}
        </div>
      )}
      {don && <DonChiTiet id={don} me={me} onClose={() => setDon(null)} onDoi={tai} />}
    </div>
  );
}
