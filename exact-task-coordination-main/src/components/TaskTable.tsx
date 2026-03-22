import React from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { Task, isWarningTask, isDueSoon } from '@/types/task';

interface TaskTableProps {
  tasks: Task[];
  viewMode: 'professional' | 'taskSource' | 'creator';
  isFullScreen: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onRowClick?: (task: Task) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

function getStatusClass(status: string): string {
  if (status === '已完成') return 'status-completed';
  if (status === '进行中') return 'status-in-progress';
  return 'status-not-started';
}

function getQuadrantClass(task: Task): string {
  if (task.isImportant === '是' && task.priority === '高') return 'quadrant-1';
  if (task.isImportant === '是') return 'quadrant-2';
  if (task.priority === '高') return 'quadrant-3';
  return '';
}

function getDisplayProfessional(task: Task): string {
  return task.professional === '自定义' ? task.customProfessional || '自定义' : task.professional;
}

function getDisplaySource(task: Task): string {
  return task.taskSource === '自定义' ? task.customTaskSource || '自定义' : task.taskSource;
}

const PROF_ORDER = ['建筑', '结构', '机电', '景观', '精装'];
const SRC_ORDER = ['设计管理', '招标管理', '合同管理', '配套管理', '施工管理', '变更管理'];

function sortIndex(value: string, order: string[]): number {
  const idx = order.indexOf(value);
  return idx === -1 ? order.length : idx;
}

function compareDateStr(a: string, b: string): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b);
}

function sortTasksInGroup(tasks: Task[], mode: 'professional' | 'taskSource' | 'creator'): Task[] {
  return [...tasks].sort((a, b) => {
    // Primary: sort by createDate ascending
    const dateDiff = compareDateStr(a.createDate, b.createDate);
    if (dateDiff !== 0) return dateDiff;

    if (mode === 'taskSource') {
      return sortIndex(getDisplayProfessional(a), PROF_ORDER) - sortIndex(getDisplayProfessional(b), PROF_ORDER);
    }
    if (mode === 'professional') {
      return sortIndex(getDisplaySource(a), SRC_ORDER) - sortIndex(getDisplaySource(b), SRC_ORDER);
    }
    const srcDiff = sortIndex(getDisplaySource(a), SRC_ORDER) - sortIndex(getDisplaySource(b), SRC_ORDER);
    if (srcDiff !== 0) return srcDiff;
    return sortIndex(getDisplayProfessional(a), PROF_ORDER) - sortIndex(getDisplayProfessional(b), PROF_ORDER);
  });
}

function groupTasks(tasks: Task[], mode: 'professional' | 'taskSource' | 'creator'): Map<string, Task[]> {
  const raw = new Map<string, Task[]>();
  const completed: Task[] = [];
  tasks.forEach(t => {
    if (t.status === '已完成') {
      completed.push(t);
      return;
    }
    let key: string;
    if (mode === 'professional') key = getDisplayProfessional(t);
    else if (mode === 'taskSource') key = getDisplaySource(t);
    else key = t.creator || '未指定';
    if (!raw.has(key)) raw.set(key, []);
    raw.get(key)!.push(t);
  });

  const order = mode === 'professional' ? PROF_ORDER : mode === 'taskSource' ? SRC_ORDER : [];
  const sorted = new Map<string, Task[]>();
  if (order.length > 0) {
    order.forEach(k => { if (raw.has(k)) { sorted.set(k, sortTasksInGroup(raw.get(k)!, mode)); raw.delete(k); } });
  }
  raw.forEach((v, k) => sorted.set(k, sortTasksInGroup(v, mode)));
  if (completed.length > 0) {
    sorted.set('已完成', completed.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  }
  return sorted;
}

export default function TaskTable({ tasks, viewMode, isFullScreen, onEdit, onDelete, onRowClick, selectedIds, onSelectionChange }: TaskTableProps) {
  const grouped = groupTasks(tasks, viewMode);
  const hasBulk = !!selectedIds && !!onSelectionChange;
  const allSelected = hasBulk && tasks.length > 0 && tasks.every(t => selectedIds.has(t.id));
  const colSpan = hasBulk ? 11 : 10;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(tasks.map(t => t.id)));
    }
  };

  const toggleOne = (id: string) => {
    if (!selectedIds || !onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  return (
    <table className="task-table" id="taskTable">
      <colgroup>
        {hasBulk && <col className="col-checkbox" />}
        <col className="col-professional" />
        <col className="col-source" />
        <col className="col-description" />
        <col className="col-comments" />
        <col className="col-creator" />
        <col className="col-collaborators" />
        <col className="col-start-date" />
        <col className="col-end-date" />
        <col className="col-status" />
        <col className="col-actions" />
      </colgroup>
      <thead>
        <tr>
          {hasBulk && (
            <th style={{ width: 32 }}>
              <input type="checkbox" checked={allSelected} onChange={toggleAll} />
            </th>
          )}
          <th>专业分类</th>
          <th>事项来源</th>
          <th>任务内容</th>
          <th>任务进展</th>
          <th>负责人</th>
          <th>协作人</th>
          <th>开始日期</th>
          <th>完成日期</th>
          <th>完成状态</th>
          {(onEdit || onDelete) && <th>操作</th>}
        </tr>
      </thead>
      <tbody id="taskBody">
        {tasks.length === 0 && (
          <tr><td colSpan={colSpan} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>暂无任务</td></tr>
        )}
        {Array.from(grouped.entries()).map(([group, groupTasks]) => (
          <React.Fragment key={group}>
            <tr className="professional-group section-separator">
              <td colSpan={colSpan}>{viewMode === 'professional' ? '专业分类' : viewMode === 'taskSource' ? '事项来源' : '负责人'}：{group}（{groupTasks.length}项）</td>
            </tr>
            {groupTasks.map(task => {
              const warning = isWarningTask(task);
              const dueSoon = isDueSoon(task);
              const quadrant = getQuadrantClass(task);
              const isChecked = hasBulk && selectedIds.has(task.id);
              const rowClass = [
                warning ? 'warning-task' : '',
                dueSoon ? 'due-soon' : '',
                quadrant,
                isChecked ? 'row-selected' : '',
              ].filter(Boolean).join(' ');

              const isInProgressNoWarning = task.status === '进行中' && !warning && !dueSoon;
              const rowStyleClass = task.status === '已完成' ? 'task-completed-text' : isInProgressNoWarning ? 'task-inprogress-text' : '';

              return (
                <tr key={task.id} className={`${rowClass} ${onRowClick ? 'clickable-row' : ''}`} onClick={() => onRowClick?.(task)}>
                  {hasBulk && (
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleOne(task.id)} />
                    </td>
                  )}
                  <td className={rowStyleClass}>{getDisplayProfessional(task)}</td>
                  <td className={rowStyleClass}>{getDisplaySource(task)}</td>
                  <td className={rowStyleClass}>{task.description}</td>
                  <td className={rowStyleClass}>{task.comments}</td>
                  <td className={rowStyleClass}>{task.creator}</td>
                  <td className={rowStyleClass}>{task.collaborators}</td>
                  <td className={rowStyleClass}>{task.createDate}</td>
                  <td className={rowStyleClass}>{task.planDate}</td>
                  <td className={`${rowStyleClass} ${task.status === '已完成' || isInProgressNoWarning ? '' : getStatusClass(task.status)}`}>{task.status}</td>
                  {(onEdit || onDelete) && (
                    <td onClick={e => e.stopPropagation()}>
                      <span className="action-group">
                        {onEdit && <button className="edit-btn icon-btn" title="编辑" onClick={() => onEdit(task)}><Pencil size={14} /></button>}
                        {onDelete && <button className="delete-btn icon-btn" title="删除" onClick={() => onDelete(task.id)}><Trash2 size={14} /></button>}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
}
