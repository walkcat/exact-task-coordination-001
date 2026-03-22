import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { PROFESSIONALS, TASK_SOURCES, STATUSES, getToday } from '@/types/task';

interface ImportRow {
  professional: string;
  customProfessional: string;
  taskSource: string;
  customTaskSource: string;
  description: string;
  comments: string;
  creator: string;
  collaborators: string;
  createDate: string;
  planDate: string;
  isImportant: string;
  warningDays: number;
  priority: string;
  status: string;
}

interface BulkImportModalProps {
  onImport: (rows: ImportRow[]) => Promise<boolean>;
  onClose: () => void;
}

function parseExcelRow(row: any): ImportRow {
  const prof = String(row['专业分类'] || '建筑').trim();
  const src = String(row['事项来源'] || '设计管理').trim();
  return {
    professional: PROFESSIONALS.includes(prof) ? prof : '自定义',
    customProfessional: PROFESSIONALS.includes(prof) ? '' : prof,
    taskSource: TASK_SOURCES.includes(src) ? src : '自定义',
    customTaskSource: TASK_SOURCES.includes(src) ? '' : src,
    description: String(row['任务内容'] || '').trim(),
    comments: String(row['任务进展'] || '').trim(),
    creator: String(row['负责人'] || '').trim(),
    collaborators: String(row['协作人'] || '').trim(),
    createDate: parseDate(row['开始日期']) || getToday(),
    planDate: parseDate(row['完成日期']) || '',
    isImportant: String(row['是否重要'] || '').trim(),
    warningDays: parseInt(row['预警天数']) || 7,
    priority: String(row['优先级'] || '').trim(),
    status: STATUSES.includes(String(row['完成状态'] || '').trim()) ? String(row['完成状态']).trim() : '未开始',
  };
}

function parseDate(val: any): string {
  if (!val) return '';
  if (typeof val === 'number') {
    // Excel serial date - use UTC to avoid timezone shift
    const utcDays = val - 25569;
    const ms = utcDays * 86400 * 1000;
    const d = new Date(ms);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const s = String(val).trim();
  // Full date: 2026-03-09 or 2026/03/09
  const fullMatch = s.match(/(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (fullMatch) return `${fullMatch[1]}-${fullMatch[2].padStart(2, '0')}-${fullMatch[3].padStart(2, '0')}`;
  // Short date: 3/9 or 1/14 (month/day, assume current year)
  const shortMatch = s.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (shortMatch) {
    const year = new Date().getFullYear();
    return `${year}-${shortMatch[1].padStart(2, '0')}-${shortMatch[2].padStart(2, '0')}`;
  }
  return '';
}

export default function BulkImportModal({ onImport, onClose }: BulkImportModalProps) {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        if (!data.length) { setError('文件中没有数据'); return; }
        const parsed = data.map(parseExcelRow).filter(r => r.description);
        if (!parsed.length) { setError('未找到有效任务（任务内容不能为空）'); return; }
        setRows(parsed);
      } catch {
        setError('文件解析失败，请检查格式');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleImport = async () => {
    setImporting(true);
    const ok = await onImport(rows);
    setImporting(false);
    if (ok) onClose();
  };

  const removeRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" style={{ maxWidth: 900, maxHeight: '85vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="report-modal-header">
          <h3>批量导入任务</h3>
          <button className="report-close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '16px 20px' }}>
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
              请上传 Excel 文件（.xlsx/.xls），表头需包含：专业分类、事项来源、任务内容、任务进展、负责人、协作人、开始日期、完成日期、完成状态 等列。
            </p>
            <button
              type="button"
              className="export-btn"
              style={{ marginRight: 8 }}
              onClick={() => {
                const template = [{
                  '专业分类': '建筑', '事项来源': '设计管理', '任务内容': '示例任务',
                  '任务进展': '', '负责人': '张三', '协作人': '', '开始日期': getToday(),
                  '完成日期': '', '是否重要': '', '预警天数': 7, '优先级': '', '完成状态': '未开始'
                }];
                const ws = XLSX.utils.json_to_sheet(template);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, '任务模板');
                XLSX.writeFile(wb, '批量导入模板.xlsx');
              }}
            >
              下载模板
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFile}
              style={{ fontSize: 13 }}
            />
          </div>

          {error && <p style={{ color: 'red', fontSize: 13, marginBottom: 8 }}>{error}</p>}

          {rows.length > 0 && (
            <>
              <p style={{ fontSize: 13, marginBottom: 8, color: 'var(--text-color)' }}>
                共解析 <strong>{rows.length}</strong> 条任务，请确认后导入：
              </p>
              <div style={{ overflowX: 'auto', maxHeight: 400, border: '1px solid #ddd', borderRadius: 4 }}>
                <table className="task-table" style={{ fontSize: 12 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>专业分类</th>
                      <th>事项来源</th>
                      <th>任务内容</th>
                      <th>任务进展</th>
                      <th>负责人</th>
                      <th>开始日期</th>
                      <th>完成日期</th>
                      <th>状态</th>
                      <th style={{ width: 50 }}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{r.professional === '自定义' ? r.customProfessional : r.professional}</td>
                        <td>{r.taskSource === '自定义' ? r.customTaskSource : r.taskSource}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</td>
                        <td style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.comments}</td>
                        <td>{r.creator}</td>
                        <td>{r.createDate}</td>
                        <td>{r.planDate}</td>
                        <td>{r.status}</td>
                        <td><button type="button" style={{ color: 'red', cursor: 'pointer', border: 'none', background: 'none', fontSize: 12 }} onClick={() => removeRow(i)}>删除</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ marginTop: 12, textAlign: 'right' }}>
                <button type="button" className="cancel-edit-btn" onClick={onClose} style={{ marginRight: 8 }}>取消</button>
                <button
                  type="button"
                  className="form-submit-btn"
                  onClick={handleImport}
                  disabled={importing || rows.length === 0}
                >
                  {importing ? '导入中...' : `确认导入（${rows.length}条）`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
