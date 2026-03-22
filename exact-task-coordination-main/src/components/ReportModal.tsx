import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Task } from '@/types/task';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

interface ReportModalProps {
  type: 'weekly' | 'monthly';
  tasks: Task[];
  onClose: () => void;
}

function getWeekOptions(year: number): { value: number; label: string }[] {
  const options: { value: number; label: string }[] = [];
  const jan1 = new Date(year, 0, 1);
  const dec31 = new Date(year, 11, 31);
  const totalDays = Math.ceil((dec31.getTime() - jan1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const totalWeeks = Math.ceil(totalDays / 7);
  for (let i = 1; i <= totalWeeks; i++) {
    options.push({ value: i, label: `第${i}周` });
  }
  return options;
}

function getWeekOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 1);
  const diff = date.getTime() - start.getTime();
  return Math.ceil((diff / (1000 * 60 * 60 * 24) + start.getDay() + 1) / 7);
}

function getDisplayProfessional(task: Task): string {
  return task.professional === '自定义' ? task.customProfessional || '自定义' : task.professional;
}

function getDisplaySource(task: Task): string {
  return task.taskSource === '自定义' ? task.customTaskSource || '自定义' : task.taskSource;
}

export default function ReportModal({ type, tasks, onClose }: ReportModalProps) {
  const currentYear = new Date().getFullYear();
  const [reportYear, setReportYear] = useState(currentYear);
  const [reportWeek, setReportWeek] = useState(getWeekOfYear(new Date()));
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [generated, setGenerated] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = currentYear; y >= currentYear - 5; y--) arr.push(y);
    return arr;
  }, [currentYear]);

  const weekOptions = useMemo(() => getWeekOptions(reportYear), [reportYear]);

  const filteredTasks = useMemo(() => {
    if (!generated) return [];
    return tasks.filter(t => {
      const cd = t.createDate ? new Date(t.createDate) : null;
      const pd = t.planDate ? new Date(t.planDate) : null;
      const refDate = cd || pd;
      if (!refDate) return false;
      if (refDate.getFullYear() !== reportYear) return false;
      if (type === 'weekly') {
        return getWeekOfYear(refDate) === reportWeek;
      } else {
        return refDate.getMonth() + 1 === reportMonth;
      }
    });
  }, [generated, tasks, reportYear, reportWeek, reportMonth, type]);

  const summary = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === '已完成').length;
    const inProgress = filteredTasks.filter(t => t.status === '进行中').length;
    const notStarted = filteredTasks.filter(t => t.status === '未开始').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, notStarted, completionRate };
  }, [filteredTasks]);

  const periodLabel = type === 'weekly'
    ? `${reportYear}年 第${reportWeek}周`
    : `${reportYear}年 ${reportMonth}月`;

  const exportExcel = useCallback(() => {
    const data = filteredTasks.map((t) => ({
      '专业分类': getDisplayProfessional(t),
      '事项来源': getDisplaySource(t),
      '任务内容': t.description,
      '任务进展': t.comments,
      '负责人': t.creator,
      '协作人': t.collaborators,
      '开始日期': t.createDate,
      '完成日期': t.planDate,
      '完成状态': t.status
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === 'weekly' ? '周报' : '月报');
    XLSX.writeFile(wb, `${type === 'weekly' ? '周报' : '月报'}_${periodLabel}.xlsx`);
  }, [filteredTasks, type, periodLabel]);

  const exportPDF = useCallback(async () => {
    if (!reportRef.current) return;
    try {
      const el = reportRef.current;

      // Clone the content into a temporary off-screen container with enough width
      const clone = el.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.left = '-9999px';
      clone.style.top = '0';
      clone.style.width = '1200px';
      clone.style.maxWidth = 'none';
      clone.style.overflow = 'visible';
      clone.style.height = 'auto';
      clone.style.maxHeight = 'none';
      clone.style.padding = '24px';
      clone.style.background = '#ffffff';
      clone.style.color = '#333';
      document.body.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        width: 1200,
        scrollY: 0, scrollX: 0,
      });

      document.body.removeChild(clone);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfPageH = pdf.internal.pageSize.getHeight();
      const imgW = pdfW;
      const imgH = canvas.height * pdfW / canvas.width;

      let position = 0;
      let remaining = imgH;
      let pageIndex = 0;
      while (remaining > 0) {
        if (pageIndex > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -position, imgW, imgH);
        position += pdfPageH;
        remaining -= pdfPageH;
        pageIndex++;
      }

      pdf.save(`${type === 'weekly' ? '周报' : '月报'}_${periodLabel}.pdf`);
    } catch {
      alert('导出PDF失败，请稍后再试');
    }
  }, [type, periodLabel]);

  const exportWord = useCallback(async () => {
    const headers = ['专业分类', '事项来源', '任务内容', '任务进展', '负责人', '协作人', '开始日期', '完成日期', '完成状态'];
    const headerRow = new TableRow({
      children: headers.map(h => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20, font: 'Microsoft YaHei' })] })],
        width: { size: 100 / headers.length, type: WidthType.PERCENTAGE },
      })),
      tableHeader: true,
    });
    const dataRows = filteredTasks.map(t => new TableRow({
      children: [
        getDisplayProfessional(t), getDisplaySource(t), t.description, t.comments,
        t.creator, t.collaborators, t.createDate, t.planDate, t.status,
      ].map(val => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: val || '', size: 18, font: 'Microsoft YaHei' })] })],
      })),
    }));

    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: `${type === 'weekly' ? '周报' : '月报'} - ${periodLabel}`,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            children: [new TextRun({ text: `总任务：${summary.total}  已完成：${summary.completed}  进行中：${summary.inProgress}  未开始：${summary.notStarted}  完成率：${summary.completionRate}%`, size: 20, font: 'Microsoft YaHei' })],
            spacing: { before: 200, after: 200 },
          }),
          new Table({
            rows: [headerRow, ...dataRows],
            width: { size: 100, type: WidthType.PERCENTAGE },
          }),
        ],
      }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${type === 'weekly' ? '周报' : '月报'}_${periodLabel}.docx`);
  }, [filteredTasks, type, periodLabel, summary]);

  const statusColor = (status: string) => {
    if (status === '已完成') return { bg: 'var(--success-color)', text: '#fff' };
    if (status === '进行中') return { bg: 'var(--primary-color)', text: '#fff' };
    return { bg: '#e0e0e0', text: '#555' };
  };

  return (
    <div
      className="report-drawer-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'var(--overlay-bg)',
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      <div
        className="report-drawer"
        style={{
          width: '560px', maxWidth: '90vw', height: '100vh',
          background: 'var(--card-bg)', color: 'var(--text-color)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.15)',
          display: 'flex', flexDirection: 'column',
          animation: 'slideInRight 0.25s ease-out',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '1px solid var(--border-color)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--text-color)' }}>
              {type === 'weekly' ? '📋 周报' : '📊 月报'}
            </h2>
            {generated && (
              <span style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, display: 'block' }}>
                {periodLabel}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22, cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 4,
          }}>✕</button>
        </div>

        {/* Filters */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--section-border)',
          display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        }}>
          <select value={reportYear} onChange={e => { setReportYear(Number(e.target.value)); setGenerated(false); }}
            style={selectStyle}>
            {years.map(y => <option key={y} value={y}>{y}年</option>)}
          </select>

          {type === 'weekly' ? (
            <select value={reportWeek} onChange={e => { setReportWeek(Number(e.target.value)); setGenerated(false); }}
              style={selectStyle}>
              {weekOptions.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          ) : (
            <select value={reportMonth} onChange={e => { setReportMonth(Number(e.target.value)); setGenerated(false); }}
              style={selectStyle}>
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{m}月</option>
              ))}
            </select>
          )}

          <button onClick={() => setGenerated(true)} style={{
            padding: '7px 18px', borderRadius: 6, border: 'none',
            background: 'var(--primary-color)', color: '#fff',
            fontWeight: 600, fontSize: 13, cursor: 'pointer',
          }}>
            生成报告
          </button>

          {generated && filteredTasks.length > 0 && (
            <>
              <button onClick={exportExcel} style={exportBtnStyle('#f59e0b')}>导出Excel</button>
              <button onClick={exportWord} style={exportBtnStyle('#2563eb')}>导出Word</button>
              <button onClick={exportPDF} style={exportBtnStyle('#8b5cf6')}>导出PDF</button>
            </>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }} ref={reportRef}>
          {!generated && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{type === 'weekly' ? '📋' : '📊'}</div>
              <p style={{ fontSize: 15 }}>选择时间范围后点击「生成报告」</p>
            </div>
          )}

          {generated && (
            <>
              {/* Summary Cards */}
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20,
              }}>
                <SummaryCard label="总任务" value={summary.total} color="var(--primary-color)" />
                <SummaryCard label="已完成" value={summary.completed} color="var(--success-color)" />
                <SummaryCard label="进行中" value={summary.inProgress} color="var(--edit-color)" />
                <SummaryCard label="未开始" value={summary.notStarted} color="var(--text-muted)" />
              </div>

              {/* Completion Rate Bar */}
              {summary.total > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6, color: 'var(--text-muted)' }}>
                    <span>完成率</span>
                    <span style={{ fontWeight: 600, color: 'var(--success-color)' }}>{summary.completionRate}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: 'var(--section-bg)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 4,
                      width: `${summary.completionRate}%`,
                      background: `linear-gradient(90deg, var(--success-color), var(--primary-color))`,
                      transition: 'width 0.5s ease',
                    }} />
                  </div>
                </div>
              )}

              {/* Table */}
              <div style={{ borderRadius: 8, border: '1px solid var(--border-color)', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, tableLayout: 'auto' }}>
                  <thead>
                    <tr style={{ background: 'var(--primary-light)' }}>
                      {['专业', '来源', '任务内容', '进展', '负责人', '日期', '状态'].map(h => (
                        <th key={h} style={{
                          padding: '10px 8px', textAlign: 'left', fontWeight: 600,
                          fontSize: 12, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)',
                          whiteSpace: 'nowrap',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px 12px', color: 'var(--text-muted)' }}>该时段无任务数据</td></tr>
                    ) : filteredTasks.map((task, i) => {
                      const sc = statusColor(task.status);
                      return (
                        <tr key={task.id} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--row-even)' }}>
                          <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{getDisplayProfessional(task)}</td>
                          <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{getDisplaySource(task)}</td>
                          <td style={cellStyle}>{task.description}</td>
                          <td style={cellStyle}>{task.comments}</td>
                          <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{task.creator}</td>
                          <td style={{ ...cellStyle, fontSize: 11, whiteSpace: 'nowrap' }}>{task.createDate || '-'}</td>
                          <td style={cellStyle}>
                            <span style={{
                              display: 'inline-block', padding: '2px 8px', borderRadius: 10,
                              fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
                              background: sc.bg, color: sc.text,
                            }}>{task.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0.8; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      padding: '14px 12px', borderRadius: 8,
      background: 'var(--section-bg)', border: '1px solid var(--section-border)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  padding: '7px 12px', borderRadius: 6,
  border: '1px solid var(--input-border-color)',
  background: 'var(--card-bg)', color: 'var(--text-color)',
  fontSize: 13, cursor: 'pointer',
};

const cellStyle: React.CSSProperties = {
  padding: '9px 8px', borderBottom: '1px solid var(--section-border)',
};

const exportBtnStyle = (color: string): React.CSSProperties => ({
  padding: '7px 14px', borderRadius: 6, border: 'none',
  background: color, color: '#fff',
  fontWeight: 600, fontSize: 12, cursor: 'pointer',
});
