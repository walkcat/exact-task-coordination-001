import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Project {
  id: string;
  name: string;
  created_at: string;
}

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: true });
    if (!error && data) {
      setProjects(data as Project[]);
      // Auto-select first project if none selected
      if (data.length > 0 && !activeProjectId) {
        setActiveProjectId(data[0].id);
      }
    }
    setLoading(false);
  }, [user, activeProjectId]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const addProject = useCallback(async (name: string) => {
    if (!user || !name.trim()) return null;
    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, name: name.trim() })
      .select()
      .single();
    if (error) {
      alert('创建项目失败：' + error.message);
      return null;
    }
    const project = data as Project;
    setProjects(prev => [...prev, project]);
    setActiveProjectId(project.id);
    return project;
  }, [user]);

  const deleteProject = useCallback(async (id: string) => {
    if (!confirm('删除项目将同时删除其下所有任务，确定吗？')) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) {
      alert('删除项目失败：' + error.message);
      return;
    }
    setProjects(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activeProjectId === id) {
        setActiveProjectId(next.length > 0 ? next[0].id : null);
      }
      return next;
    });
  }, [activeProjectId]);

  const renameProject = useCallback(async (id: string, newName: string) => {
    if (!newName.trim()) return;
    const { error } = await supabase.from('projects').update({ name: newName.trim() }).eq('id', id);
    if (error) {
      alert('重命名失败：' + error.message);
      return;
    }
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName.trim() } : p));
  }, []);

  return {
    projects,
    activeProjectId,
    setActiveProjectId,
    loading,
    addProject,
    deleteProject,
    renameProject,
  };
}
