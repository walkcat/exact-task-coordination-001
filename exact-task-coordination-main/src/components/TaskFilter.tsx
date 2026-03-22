import React from 'react';
import { Search, X } from 'lucide-react';
import { STATUSES } from '@/types/task';

export interface FilterState {
  keyword: string;
  status: string;
  creator: string;
  professional: string;
  taskSource: string;
}

export const emptyFilter: FilterState = {
  keyword: '',
  status: '',
  creator: '',
  professional: '',
  taskSource: '',
};

export function isFilterActive(f: FilterState): boolean {
  return !!(f.keyword || f.status || f.creator || f.professional || f.taskSource);
}

export function applyFilter(tasks: any[], filter: FilterState) {
  return tasks.filter(t => {
    if (filter.status && t.status !== filter.status) return false;
    if (filter.creator && t.creator !== filter.creator) return false;
    if (filter.professional) {
      const prof = t.professional === '自定义' ? t.customProfessional || '自定义' : t.professional;
      if (prof !== filter.professional) return false;
    }
    if (filter.taskSource) {
      const src = t.taskSource === '自定义' ? t.customTaskSource || '自定义' : t.taskSource;
      if (src !== filter.taskSource) return false;
    }
    if (filter.keyword) {
      const kw = filter.keyword.toLowerCase();
      const searchable = [
        t.description, t.comments, t.creator, t.collaborators,
        t.professional, t.customProfessional, t.taskSource, t.customTaskSource
      ].filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(kw)) return false;
    }
    return true;
  });
}

interface TaskFilterProps {
  filter: FilterState;
  onChange: (f: FilterState) => void;
  creators: string[];
  professionals: string[];
  taskSources: string[];
}

export default function TaskFilter({ filter, onChange, creators, professionals, taskSources }: TaskFilterProps) {
  const update = (field: keyof FilterState, value: string) => {
    onChange({ ...filter, [field]: value });
  };

  const clear = () => onChange(emptyFilter);

  return (
    <div className="task-filter-bar">
      <div className="filter-search">
        <Search size={14} className="filter-search-icon" />
        <input
          type="text"
          placeholder="搜索任务内容、负责人..."
          value={filter.keyword}
          onChange={e => update('keyword', e.target.value)}
        />
      </div>
      <select value={filter.status} onChange={e => update('status', e.target.value)}>
        <option value="">全部状态</option>
        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      <select value={filter.creator} onChange={e => update('creator', e.target.value)}>
        <option value="">全部负责人</option>
        {creators.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select value={filter.professional} onChange={e => update('professional', e.target.value)}>
        <option value="">全部专业</option>
        {professionals.map(p => <option key={p} value={p}>{p}</option>)}
      </select>
      <select value={filter.taskSource} onChange={e => update('taskSource', e.target.value)}>
        <option value="">全部来源</option>
        {taskSources.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      {isFilterActive(filter) && (
        <button className="filter-clear-btn" onClick={clear} title="清除筛选">
          <X size={14} /> 清除
        </button>
      )}
    </div>
  );
}
