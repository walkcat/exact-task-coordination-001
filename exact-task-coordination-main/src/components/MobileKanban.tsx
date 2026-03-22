import React from 'react';
import { Pencil, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { Task, isWarningTask, isDueSoon } from '@/types/task';

interface MobileKanbanProps {
  tasks: Task[];
  viewMode: 'professional' | 'taskSource' | 'creator';
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
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

const PROF_ORDER = ['建筑', '结构', '机电', '景观', '精装'];
const SRC_ORDER = ['设计管理', '招标管理', '合同管理', '配套管理', '施工管理', '变更管理'];

function getGroupKey(task: Task, mode: string): string {
  if (mode === 'professional') return getDisplayProfessional(task);
  if (mode === 'taskSource') return getDisplaySource(task);
  return task.creator || '未指定';
}

function groupTasks(tasks: Task[], mode: string): Map<string, Task[]> {
  const raw = new Map<string, Task[]>();
  const completed: Task[] = [];
  tasks.forEach(t => {
    if (t.status === '已完成') {
      completed.push(t);
      return;
    }
    const key = getGroupKey(t, mode);
    if (!raw.has(key)) raw.set(key, []);
    raw.get(key)!.push(t);
  });

  const order = mode === 'professional' ? PROF_ORDER : mode === 'taskSource' ? SRC_ORDER : [];
  const sorted = new Map<string, Task[]>();
  if (order.length > 0) {
    order.forEach(k => { if (raw.has(k)) { sorted.set(k, raw.get(k)!); raw.delete(k); } });
  }
  raw.forEach((v, k) => sorted.set(k, v));
  if (completed.length > 0) sorted.set('已完成', completed);
  return sorted;
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === '已完成' ? 'kanban-status-done' :
    status === '进行中' ? 'kanban-status-progress' :
    'kanban-status-pending';
  return <span className={`kanban-status-badge ${cls}`}>{status}</span>;
}

export default function MobileKanban({ tasks, viewMode, onEdit, onDelete, onRowClick, selectedIds, onSelectionChange }: MobileKanbanProps) {
  const hasBulk = !!selectedIds && !!onSelectionChange;
  const grouped = groupTasks(tasks, viewMode);

  const toggleOne = (id: string) => {
    if (!selectedIds || !onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  if (tasks.length === 0) {
    return <div className="kanban-empty">暂无任务</div>;
  }

  const groupLabel = viewMode === 'professional' ? '专业分类' : viewMode === 'taskSource' ? '事项来源' : '负责人';

  return (
    <div className="kanban-container">
      {Array.from(grouped.entries()).map(([group, groupTasks]) => (
        <div key={group} className="kanban-group">
          <div className="kanban-group-header">
            <span className="kanban-group-title">{groupLabel}：{group}</span>
            <span className="kanban-group-count">{groupTasks.length}</span>
          </div>
          <div className="kanban-cards">
            {groupTasks.map(task => {
              const warning = isWarningTask(task);
              const overdue = isDueSoon(task);
              const isChecked = hasBulk && selectedIds!.has(task.id);

              return (
                <div
                  key={task.id}
                  className={`kanban-card ${warning ? 'kanban-card-warning' : ''} ${overdue ? 'kanban-card-overdue' : ''} ${isChecked ? 'kanban-card-selected' : ''} ${task.status === '已完成' ? 'kanban-card-done' : ''}`}
                  onClick={() => onRowClick?.(task)}
                >
                  <div className="kanban-card-top">
                    {hasBulk && (
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(task.id)}
                        onClick={e => e.stopPropagation()}
                        className="kanban-card-checkbox"
                      />
                    )}
                    <span className="kanban-card-desc">{task.description || '无内容'}</span>
                    <StatusBadge status={task.status} />
                  </div>

                  {task.comments && (
                    <div className="kanban-card-comments">{task.comments}</div>
                  )}

                  <div className="kanban-card-meta">
                    <span className="kanban-meta-tag">{getDisplayProfessional(task)}</span>
                    <span className="kanban-meta-tag">{getDisplaySource(task)}</span>
                    <span className="kanban-meta-person">{task.creator || '—'}</span>
                  </div>

                  <div className="kanban-card-bottom">
                    <span className="kanban-card-dates">{task.createDate || '—'} ~ {task.planDate || '—'}</span>
                    <div className="kanban-card-icons">
                      {warning && !overdue && <Clock size={12} className="kanban-icon-warn" />}
                      {overdue && <AlertTriangle size={12} className="kanban-icon-overdue" />}
                    </div>
                    {(onEdit || onDelete) && (
                      <div className="kanban-card-actions" onClick={e => e.stopPropagation()}>
                        {onEdit && <button className="edit-btn icon-btn" title="编辑" onClick={() => onEdit(task)}><Pencil size={13} /></button>}
                        {onDelete && <button className="delete-btn icon-btn" title="删除" onClick={() => onDelete(task.id)}><Trash2 size={13} /></button>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
