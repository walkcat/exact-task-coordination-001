import React from 'react';
import { Pencil, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { Task, isWarningTask, isDueSoon } from '@/types/task';

interface TaskCardViewProps {
  tasks: Task[];
  viewMode: 'professional' | 'taskSource' | 'creator';
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onRowClick?: (task: Task) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

function getDisplayProfessional(task: Task): string {
  return task.professional === '自定义' ? task.customProfessional || '自定义' : task.professional;
}

function getDisplaySource(task: Task): string {
  return task.taskSource === '自定义' ? task.customTaskSource || '自定义' : task.taskSource;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === '已完成' ? 'mobile-status-done' :
    status === '进行中' ? 'mobile-status-progress' :
    'mobile-status-pending';
  return <span className={`mobile-status-badge ${cls}`}>{status}</span>;
}

export default function TaskCardView({ tasks, viewMode, onEdit, onDelete, onRowClick, selectedIds, onSelectionChange }: TaskCardViewProps) {
  const hasBulk = !!selectedIds && !!onSelectionChange;

  const toggleOne = (id: string) => {
    if (!selectedIds || !onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  if (tasks.length === 0) {
    return <div className="mobile-empty">暂无任务</div>;
  }

  return (
    <div className="mobile-card-list">
      {tasks.map(task => {
        const warning = isWarningTask(task);
        const overdue = isDueSoon(task);
        const isChecked = hasBulk && selectedIds!.has(task.id);

        return (
          <div
            key={task.id}
            className={`mobile-task-card ${warning ? 'mobile-card-warning' : ''} ${overdue ? 'mobile-card-overdue' : ''} ${isChecked ? 'mobile-card-selected' : ''}`}
            onClick={() => onRowClick?.(task)}
          >
            <div className="mobile-card-header">
              <div className="mobile-card-title-row">
                {hasBulk && (
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleOne(task.id)}
                    onClick={e => e.stopPropagation()}
                    className="mobile-card-checkbox"
                  />
                )}
                <span className="mobile-card-description">{task.description || '无内容'}</span>
              </div>
              <div className="mobile-card-badges">
                <StatusBadge status={task.status} />
                {warning && !overdue && (
                  <span className="mobile-badge-warn"><Clock size={10} /> 即将到期</span>
                )}
                {overdue && (
                  <span className="mobile-badge-overdue"><AlertTriangle size={10} /> 已逾期</span>
                )}
              </div>
            </div>

            <div className="mobile-card-meta">
              <span className="mobile-meta-item">
                <span className="mobile-meta-label">分类</span>
                <span>{getDisplayProfessional(task)}</span>
              </span>
              <span className="mobile-meta-item">
                <span className="mobile-meta-label">来源</span>
                <span>{getDisplaySource(task)}</span>
              </span>
              <span className="mobile-meta-item">
                <span className="mobile-meta-label">负责人</span>
                <span>{task.creator || '未指定'}</span>
              </span>
            </div>

            <div className="mobile-card-dates">
              <span>{task.createDate || '—'} ~ {task.planDate || '—'}</span>
            </div>

            {task.comments && (
              <div className="mobile-card-comments">{task.comments}</div>
            )}

            <div className="mobile-card-actions" onClick={e => e.stopPropagation()}>
              <button className="edit-btn icon-btn" title="编辑" onClick={() => onEdit(task)}><Pencil size={14} /></button>
              <button className="delete-btn icon-btn" title="删除" onClick={() => onDelete(task.id)}><Trash2 size={14} /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
