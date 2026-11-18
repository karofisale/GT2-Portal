import React from 'react';
import { api } from '../services/api';
import { Spinner, Loi, Tag, useTai, useLam } from '../ui';
import { fmtNgay } from '../utils/format';

const TT = { ok: ['Thành công', 'emerald'], loi: ['Lỗi', 'rose'], dang_chay: ['Đang chạy', 'blue'], '': ['Chưa chạy', 'gray'] };

/**
 * Kết nối SAP (pha 1b): máy có SAP GUI (Scheduled Task Karofi-GT2-SAP, Scripts/gt2-sap-sync) tự lấy SO (VA05, PO = GT2-*), DO + xuất kho (ZSD450)
 * và tồn kho (MB52). Màn này cho xem lần chạy / lỗi của từng việc và bấm "Đồng bộ ngay" (admin). Lịch chạy sửa ở tab Tham số (sap_*).
 */
export default function KetNoiSap({ admin }) {
  const t = useTai(() => api('getKetNoiSap'), []);
  const [dang, lam] = useLam();
  const dongBo = async (job) => { if (await lam(() => api('yeuCauDongBoSap', { job }), 'Đã gửi yêu cầu — máy SAP nhận trong vòng 5 phút.')) t.reload(); };
  if (t.loading && !t.data) return <Spinner />;
  if (t.error) return <Loi onRetry={t.reload}>{t.error}</Loi>;
  const d = t.data;
  return (
    <div>
      {!d.coBang && <div className="notice warn">Chưa chạy SQL đợt 38 (chay-dot38-gt2-thong-bao-sap) — màn này chỉ xem được trạng thái cũ, chưa bấm "Đồng bộ ngay" được.</div>}
      <p className="small muted">
        Máy có SAP GUI tự lấy: <b>SO</b> từ VA05 (số PO = mã đơn GT2), <b>DO + xuất kho</b> từ ZSD450 (DO đã xuất hoá đơn), <b>tồn kho</b> từ MB52 — theo lịch: SO / DO thứ 2 – thứ 7
        từ {d.lich.batDau} đến {d.lich.ketThuc}, mỗi {d.lich.chuKy} phút; <b>tồn kho chỉ cào 1 lần lúc {d.lich.gioTon} mỗi ngày thứ 2 – thứ 6</b> (không thứ 7, chủ nhật, lễ); SO quét {d.lich.soNgayQuet} ngày gần nhất.
        Đổi lịch ở tab <b>Tham số</b> (sap_…). Nhập tay (SO, DO, xuất kho) vẫn dùng được song song.
      </p>
      <div className="row" style={{ gap: 16, marginBottom: 8 }}>
        <span className="tag tag-amber">Đơn chờ SO: {d.choSo}</span><span className="tag tag-blue">Đơn đang giao (có SO): {d.dangGiao}</span><span className="tag tag-gray">Kho theo dõi tồn: {d.soKho}</span>
      </div>
      <div className="tablewrap"><table>
        <thead><tr><th>Việc</th><th>Trạng thái</th><th>Lần chạy gần nhất</th><th>Lần thành công</th><th>Kết quả / lỗi</th><th>Yêu cầu chờ</th>{admin && <th />}</tr></thead>
        <tbody>{d.viec.map((v) => {
          const [nhan, tone] = TT[v.trangThai] || TT[''];
          return (
            <tr key={v.job}>
              <td><b>{v.nhan}</b></td><td><Tag tone={tone}>{nhan}</Tag></td><td className="nowrap">{fmtNgay(v.luc)}</td><td className="nowrap">{fmtNgay(v.okLuc)}</td>
              <td className="small">{v.trangThai === 'loi' ? <span style={{ color: 'var(--rose)' }}>{v.loi || v.ghiChu}</span> : v.ghiChu}</td>
              <td className="small">{v.yeuCau ? 'Có — ' + v.yeuCauBoi + ' lúc ' + fmtNgay(v.yeuCauLuc) : ''}</td>
              {admin && <td className="right"><button className="btn sm" disabled={dang || !d.coBang} onClick={() => dongBo(v.job)}>Đồng bộ ngay</button></td>}
            </tr>
          );
        })}</tbody>
      </table></div>
      <div className="actions">
        <button className="btn" onClick={t.reload}>Tải lại</button>
        {admin && <button className="btn pri" disabled={dang || !d.coBang} onClick={() => dongBo('tat_ca')}>Đồng bộ tất cả ngay</button>}
      </div>
      <details style={{ marginTop: 10 }}>
        <summary className="muted">Cài máy SAP (một lần)</summary>
        <ol className="small">
          <li>Trên máy có SAP GUI: chạy <code>D:\Operation\Claude\Scripts\gt2-sap-sync\cai-dat.cmd</code> (ghi config.json + đăng ký Scheduled Task <b>Karofi-GT2-SAP</b> mỗi 5 phút).</li>
          <li>Chạy lệnh nó in ra (<code>npx supabase secrets set GT2_STOCK_SECRET=…</code>) ở thư mục Karofi-ID.</li>
          <li>Admin tạo SO trên SAP với <b>số PO = mã đơn GT2</b> (vd GT2-2611-0007) để máy tự gắn SO.</li>
        </ol>
      </details>
    </div>
  );
}
