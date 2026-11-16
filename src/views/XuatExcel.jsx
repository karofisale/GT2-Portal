import React, { useState } from 'react';
import { useUi } from '../ui';
import { xuatExcel, tenTepExcel } from '../utils/excel';

/**
 * Nút "⬇ Excel". lay() trả (hoặc Promise trả) [{ ten, cot, dong }] — dữ liệu lấy lúc bấm (có thể gọi API lấy bản đầy đủ). ten = tên tệp (không đuôi).
 */
export default function NutExcel({ ten, lay, nhan, disabled, className }) {
  const { toast } = useUi();
  const [dang, setDang] = useState(false);
  async function bam() {
    if (dang) return;
    setDang(true);
    try {
      const sheets = await lay();
      if (!sheets || !sheets.some((s) => s.dong && s.dong.length)) { toast('Không có dòng nào để xuất.', 'err'); return; }
      await xuatExcel(tenTepExcel(ten), sheets);
    } catch (e) {
      toast('Chưa xuất được Excel: ' + (e.message || String(e)), 'err');
    } finally { setDang(false); }
  }
  return <button className={'btn ' + (className || '')} disabled={dang || disabled} onClick={bam} title="Tải bảng này về Excel">{dang ? 'Đang xuất…' : (nhan || '⬇ Excel')}</button>;
}
