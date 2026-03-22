import React, { useState, useRef, useEffect } from 'react';
import { PROFESSIONALS, TASK_SOURCES, STATUSES, PRIORITIES, IMPORTANT_OPTIONS, createEmptyTask } from '@/types/task';
import { loadCustomList, saveCustomList, CUSTOM_PROF_KEY, CUSTOM_SRC_KEY } from '@/hooks/useTaskManager';

interface TaskFormProps {
  formData: ReturnType<typeof createEmptyTask>;
  setFormData: React.Dispatch<React.SetStateAction<ReturnType<typeof createEmptyTask>>>;
  onSubmit: () => any;
  editingId: string | null;
  onCancelEdit: () => void;
  successMsg: string;
}

function CustomDropdown({ value, onChange, storageKey, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  storageKey: string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<string[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setList(loadCustomList(storageKey));
  }, [storageKey]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = list.filter(item => !value || item.includes(value));

  const handleBlur = () => {
    setTimeout(() => {
      if (value && !list.includes(value)) {
        const updated = [...list, value];
        setList(updated);
        saveCustomList(storageKey, updated);
      }
    }, 200);
  };

  return (
    <div className="custom-group" ref={ref}>
      <input
        type="text"
        value={value}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        required
      />
      {open && filtered.length > 0 && (
        <div className="custom-dropdown">
          {filtered.map((item, i) => (
            <div key={i} className="custom-dropdown-item" onMouseDown={() => { onChange(item); setOpen(false); }}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TaskForm({ formData, setFormData, onSubmit, editingId, onCancelEdit, successMsg }: TaskFormProps) {
  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form className="task-form" id="taskForm" onSubmit={handleFormSubmit}>
      <div className="form-row">
        <div className="form-group">
          <label>专业分类 <span style={{color:'red'}}>*</span></label>
          <select value={formData.professional} onChange={e => handleChange('professional', e.target.value)} required>
            {PROFESSIONALS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          {formData.professional === '自定义' && (
            <CustomDropdown
              value={formData.customProfessional}
              onChange={v => handleChange('customProfessional', v)}
              storageKey={CUSTOM_PROF_KEY}
              placeholder="输入自定义专业分类"
            />
          )}
        </div>

        <div className="form-group">
          <label>事项来源 <span style={{color:'red'}}>*</span></label>
          <select value={formData.taskSource} onChange={e => handleChange('taskSource', e.target.value)} required>
            {TASK_SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {formData.taskSource === '自定义' && (
            <CustomDropdown
              value={formData.customTaskSource}
              onChange={v => handleChange('customTaskSource', v)}
              storageKey={CUSTOM_SRC_KEY}
              placeholder="输入自定义事项来源"
            />
          )}
        </div>
      </div>

      <div className="form-group">
        <label>任务内容 <span style={{color:'red'}}>*</span></label>
        <textarea value={formData.description} onChange={e => handleChange('description', e.target.value)} rows={2} required />
      </div>

      <div className="form-group">
        <label>任务进展</label>
        <textarea value={formData.comments} onChange={e => handleChange('comments', e.target.value)} rows={2} />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>负责人 <span style={{color:'red'}}>*</span></label>
          <input type="text" value={formData.creator} onChange={e => handleChange('creator', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>协作人</label>
          <input type="text" value={formData.collaborators} onChange={e => handleChange('collaborators', e.target.value)} placeholder="多人用逗号分隔" />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>开始日期 <span style={{color:'red'}}>*</span></label>
          <input type="date" value={formData.createDate} onChange={e => handleChange('createDate', e.target.value)} required />
        </div>
        <div className="form-group">
          <label>完成日期 <span style={{color:'red'}}>*</span></label>
          <input type="date" value={formData.planDate} onChange={e => handleChange('planDate', e.target.value)} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>是否重要</label>
          <select value={formData.isImportant} onChange={e => handleChange('isImportant', e.target.value)}>
            {IMPORTANT_OPTIONS.map(o => <option key={o} value={o}>{o || '请选择'}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>预警天数 <span style={{color:'red'}}>*</span></label>
          <input type="number" min={1} value={formData.warningDays} onChange={e => handleChange('warningDays', parseInt(e.target.value) || 7)} required />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>优先级</label>
          <select value={formData.priority} onChange={e => handleChange('priority', e.target.value)}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p || '请选择'}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>完成状态 <span style={{color:'red'}}>*</span></label>
          <select value={formData.status} onChange={e => handleChange('status', e.target.value)} required>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <button type="submit" className={`form-submit-btn ${editingId ? 'edit-save-mode' : ''}`}>
        {editingId ? '保存修改' : '添加任务'}
      </button>

      {editingId && (
        <button type="button" className="cancel-edit-btn" onClick={onCancelEdit}>
          取消编辑
        </button>
      )}

      <div className={`success-message ${successMsg ? 'show' : ''}`}>
        {successMsg}
      </div>
    </form>
  );
}
