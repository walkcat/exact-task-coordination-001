import React, { useState } from 'react';
import { Plus, X, Pencil, Check } from 'lucide-react';
import { Project } from '@/hooks/useProjects';

interface ProjectTabsProps {
  projects: Project[];
  activeProjectId: string | null;
  isAdmin: boolean;
  onSelect: (id: string) => void;
  onAdd: (name: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

export default function ProjectTabs({ projects, activeProjectId, isAdmin, onSelect, onAdd, onDelete, onRename }: ProjectTabsProps) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleAdd = () => {
    if (newName.trim()) {
      onAdd(newName.trim());
      setNewName('');
      setAdding(false);
    }
  };

  const handleStartRename = (p: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(p.id);
    setEditName(p.name);
  };

  const handleFinishRename = () => {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="project-tabs">
      <div className="project-tabs-list">
        {projects.map(p => (
          <div
            key={p.id}
            className={`project-tab ${p.id === activeProjectId ? 'active' : ''}`}
            onClick={() => onSelect(p.id)}
          >
            {editingId === p.id ? (
              <span className="project-tab-edit" onClick={e => e.stopPropagation()}>
                <input
                  className="project-tab-input"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleFinishRename(); if (e.key === 'Escape') setEditingId(null); }}
                  autoFocus
                />
                <button className="project-tab-icon-btn" onClick={handleFinishRename}><Check size={12} /></button>
              </span>
            ) : (
              <>
                <span className="project-tab-name">{p.name}</span>
                {isAdmin && (
                  <span className="project-tab-actions">
                    <button className="project-tab-icon-btn" onClick={e => handleStartRename(p, e)} title="重命名"><Pencil size={11} /></button>
                    <button className="project-tab-icon-btn delete" onClick={e => { e.stopPropagation(); onDelete(p.id); }} title="删除项目"><X size={12} /></button>
                  </span>
                )}
              </>
            )}
          </div>
        ))}

        {isAdmin && (
          adding ? (
            <div className="project-tab adding">
              <input
                className="project-tab-input"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName(''); } }}
                placeholder="项目名称"
                autoFocus
              />
              <button className="project-tab-icon-btn" onClick={handleAdd}><Check size={12} /></button>
              <button className="project-tab-icon-btn delete" onClick={() => { setAdding(false); setNewName(''); }}><X size={12} /></button>
            </div>
          ) : (
            <button className="project-tab add-btn" onClick={() => setAdding(true)} title="新建项目">
              <Plus size={14} /> 新建项目
            </button>
          )
        )}
      </div>
    </div>
  );
}
