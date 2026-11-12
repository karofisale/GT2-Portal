import React, { useEffect, useMemo, useState } from 'react';
import { api } from './services/api';
import { sessionGt2, appKhacDungDuoc, veCongSauDangXuat, duongDanCong } from './services/session';
import { Spinner, Loi, Modal, useTai } from './ui';
import { NHAN_VAI, NHAN_LOAI, menuTheoVai, laKhach } from './utils/format';
import DatHang from './views/DatHang';
import { DonList } from './views/Don';
import { TheoMa, DanhMucKhach } from './views/Khach';
import HvAdmin from './views/Admin';
import KeHoach from './views/KeHoach';
import KeToan from './views/KeToan';
import CaiDat from './views/CaiDat';
import CongNo from './views/CongNo';
import TraHang from './views/TraHang';

export default function App() {
  const ss = useMemo(() => sessionGt2(), []);
  const me = useTai(() => api('me'), []);
  // menu theo vai + loại đối tác (kênh BHT có thêm Công nợ) — loại biết sau khi tải 'me'
  const menu = ss ? menuTheoVai(ss.role, me.data && me.data.doiTac ? me.data.doiTac.loai : '') : [];
  const [tab, setTab] = useState(() => { try { return window.localStorage.getItem('gt2.tab') || ''; } catch { return ''; } });
  const [capApp, setCapApp] = useState(false);
  const tabHienTai = menu.some((m) => m.key === tab) ? tab : (menu[0] && menu[0].key);
  useEffect(() => { try { if (tabHienTai) window.localStorage.setItem('gt2.tab', tabHienTai); } catch { /* bộ nhớ bị chặn */ } }, [tabHienTai]);

  if (!ss) {
    const cong = duongDanCong();
    return (
      <main><div className="card"><h3>Cần đăng nhập</h3>
        <p>Bạn chưa đăng nhập, hoặc tài khoản chưa được cấp quyền vào GT2 Portal.</p>
        {cong ? <a className="btn pri" href={cong + '?next=' + encodeURIComponent(location.pathname)}>Đến cổng đăng nhập</a> : <p className="muted">Mở trang này từ cổng VHKD (sales.karofiglobal.com) sau khi đăng nhập.</p>}
      </div></main>
    );
  }
  if (me.loading && !me.data) return <main><Spinner text="Đang mở GT2 Portal…" /></main>;
  if (me.error) return <main><Loi onRetry={me.reload}>{me.error}</Loi></main>;
  const u = me.data;
  const khac = appKhacDungDuoc('GT2');

  return (
    <>
      <header className="top">
        <div className="brand">Karofi <b>GT2 Portal</b></div>
        {u.doiTac && <span className="tag tag-blue">{u.doiTac.name} · {NHAN_LOAI[u.doiTac.loai]}</span>}
        <div className="sp" />
        <div className="who"><strong>{u.name}</strong><br />{NHAN_VAI[u.role] || u.role}</div>
        {khac.length > 0 && <button className="btn sm" onClick={() => setCapApp(true)}>Ứng dụng</button>}
        <button className="btn sm" onClick={() => { if (!veCongSauDangXuat()) location.reload(); }}>Đăng xuất</button>
      </header>
      <nav className="navtabs">{menu.map((m) => <button key={m.key} className={tabHienTai === m.key ? 'on' : ''} onClick={() => setTab(m.key)}>{m.nhan}</button>)}</nav>
      <main>
        <Man tab={tabHienTai} me={u} chuyen={setTab} />
      </main>
      {capApp && (
        <Modal title="Chuyển ứng dụng" onClose={() => setCapApp(false)}>
          <div style={{ display: 'grid', gap: 8 }}>{khac.map((a) => <a key={a.key} className="btn" href={a.href}>{a.ten} <span className="muted small">— {a.mo_ta}</span></a>)}</div>
        </Modal>
      )}
    </>
  );
}

function Man({ tab, me, chuyen }) {
  switch (tab) {
    case 'datHang': return <DatHang me={me} onXong={() => chuyen('donCuaToi')} />;
    case 'donCuaToi': return <DonList me={me} />;
    case 'theoMa': return <TheoMa me={me} />;
    case 'danhMuc': return <DanhMucKhach me={me} />;
    case 'hvAdmin': return <HvAdmin me={me} />;
    case 'keHoach': return <KeHoach />;
    case 'keToan': return <KeToan me={me} />;
    case 'tatCaDon': return <DonList me={me} />;
    case 'caiDat': return <CaiDat me={me} />;
    case 'congNo': return <CongNo me={me} />;
    case 'traHang': return <TraHang me={me} />;
    default: return laKhach(me.role) ? <DatHang me={me} onXong={() => chuyen('donCuaToi')} /> : <DonList me={me} />;
  }
}
