import { useState, useEffect, useCallback } from 'react';
import { Task, createEmptyTask } from '@/types/task';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const CUSTOM_PROF_KEY = 'pm_tool_011_custom_professionals';
const CUSTOM_SRC_KEY = 'pm_tool_011_custom_sources';

export function loadCustomList(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveCustomList(key: string, list: string[]) {
  localStorage.setItem(key, JSON.stringify([...new Set(list)]));
}

export { CUSTOM_PROF_KEY, CUSTOM_SRC_KEY };

// Map DB row to frontend Task
function dbToTask(row: any): Task {
  return {
    id: row.id,
    professional: row.professional,
    customProfessional: row.custom_professional || '',
    taskSource: row.task_source,
    customTaskSource: row.custom_task_source || '',
    description: row.description,
    comments: row.comments || '',
    creator: row.creator || '',
    collaborators: row.collaborators || '',
    createDate: row.create_date || '',
    planDate: row.plan_date || '',
    isImportant: row.is_important || '',
    warningDays: row.warning_days,
    priority: row.priority || '',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useTaskManager(projectId: string | null) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(createEmptyTask());
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch tasks from Supabase
  const fetchTasks = useCallback(async () => {
    if (!user || !projectId) { setTasks([]); setLoading(false); return; }
    let query = supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    const { data, error } = await query;
    if (!error && data) {
      setTasks(data.map(dbToTask));
    }
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const addTask = useCallback(async () => {
    if (!user) return false;
    if (formData.planDate && formData.createDate && formData.planDate < formData.createDate) {
      alert('完成日期不能早于开始日期！');
      return false;
    }
    if (formData.warningDays < 1) {
      alert('预警天数必须>=1，已重置为7');
      setFormData(prev => ({ ...prev, warningDays: 7 }));
      return false;
    }

    const { error } = await supabase.from('tasks').insert({
      user_id: user.id,
      project_id: projectId,
      professional: formData.professional,
      custom_professional: formData.customProfessional,
      task_source: formData.taskSource,
      custom_task_source: formData.customTaskSource,
      description: formData.description,
      comments: formData.comments,
      creator: formData.creator,
      collaborators: formData.collaborators,
      create_date: formData.createDate || null,
      plan_date: formData.planDate || null,
      is_important: formData.isImportant,
      warning_days: formData.warningDays,
      priority: formData.priority,
      status: formData.status,
    });

    if (error) {
      alert('添加任务失败：' + error.message);
      return false;
    }

    await fetchTasks();
    setFormData(createEmptyTask());
    setSuccessMsg('任务已成功添加！');
    setTimeout(() => setSuccessMsg(''), 2500);
    return true;
  }, [formData, user, fetchTasks]);

  const updateTask = useCallback(async () => {
    if (!editingId || !user) return false;
    if (formData.planDate && formData.createDate && formData.planDate < formData.createDate) {
      alert('完成日期不能早于开始日期！');
      return false;
    }
    if (formData.warningDays < 1) {
      alert('预警天数必须>=1，已重置为7');
      setFormData(prev => ({ ...prev, warningDays: 7 }));
      return false;
    }

    const { error } = await supabase.from('tasks').update({
      professional: formData.professional,
      custom_professional: formData.customProfessional,
      task_source: formData.taskSource,
      custom_task_source: formData.customTaskSource,
      description: formData.description,
      comments: formData.comments,
      creator: formData.creator,
      collaborators: formData.collaborators,
      create_date: formData.createDate || null,
      plan_date: formData.planDate || null,
      is_important: formData.isImportant,
      warning_days: formData.warningDays,
      priority: formData.priority,
      status: formData.status,
    }).eq('id', editingId);

    if (error) {
      alert('修改任务失败：' + error.message);
      return false;
    }

    await fetchTasks();
    setEditingId(null);
    setFormData(createEmptyTask());
    setSuccessMsg('任务已成功修改！');
    setTimeout(() => setSuccessMsg(''), 2500);
    return true;
  }, [editingId, formData, user, fetchTasks]);

  const deleteTask = useCallback(async (id: string) => {
    if (!confirm('确定要删除此任务吗？')) return;
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) {
      alert('删除失败：' + error.message);
      return;
    }
    await fetchTasks();
  }, [fetchTasks]);

  const bulkUpdateStatus = useCallback(async (ids: string[], status: string) => {
    const { error } = await supabase.from('tasks').update({ status }).in('id', ids);
    if (error) {
      alert('批量修改状态失败：' + error.message);
      return false;
    }
    await fetchTasks();
    return true;
  }, [fetchTasks]);

  const bulkDeleteTasks = useCallback(async (ids: string[]) => {
    if (!confirm(`确定要删除选中的 ${ids.length} 个任务吗？`)) return false;
    const { error } = await supabase.from('tasks').delete().in('id', ids);
    if (error) {
      alert('批量删除失败：' + error.message);
      return false;
    }
    await fetchTasks();
    return true;
  }, [fetchTasks]);

  const startEdit = useCallback((task: Task) => {
    setEditingId(task.id);
    setFormData({
      professional: task.professional,
      customProfessional: task.customProfessional,
      taskSource: task.taskSource,
      customTaskSource: task.customTaskSource,
      description: task.description,
      comments: task.comments,
      creator: task.creator,
      collaborators: task.collaborators,
      createDate: task.createDate,
      planDate: task.planDate,
      isImportant: task.isImportant,
      warningDays: task.warningDays,
      priority: task.priority,
      status: task.status,
    });
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setFormData(createEmptyTask());
  }, []);

  const handleSubmit = useCallback(() => {
    if (editingId) return updateTask();
    return addTask();
  }, [editingId, addTask, updateTask]);

  const bulkImport = useCallback(async (rows: Array<{
    professional: string; customProfessional: string; taskSource: string; customTaskSource: string;
    description: string; comments: string; creator: string; collaborators: string;
    createDate: string; planDate: string; isImportant: string; warningDays: number;
    priority: string; status: string;
  }>) => {
    if (!user || !projectId) return false;
    const inserts = rows.map((r, index) => ({
      user_id: user.id,
      project_id: projectId,
      professional: r.professional,
      custom_professional: r.customProfessional,
      task_source: r.taskSource,
      custom_task_source: r.customTaskSource,
      description: r.description,
      comments: r.comments,
      creator: r.creator,
      collaborators: r.collaborators,
      create_date: r.createDate || null,
      plan_date: r.planDate || null,
      is_important: r.isImportant,
      warning_days: r.warningDays,
      priority: r.priority,
      status: r.status,
      sort_order: index + 1,
    }));
    const { error } = await supabase.from('tasks').insert(inserts);
    if (error) {
      alert('批量导入失败：' + error.message);
      return false;
    }
    await fetchTasks();
    return true;
  }, [user, projectId, fetchTasks]);

  return {
    tasks,
    formData,
    setFormData,
    editingId,
    successMsg,
    loading,
    handleSubmit,
    deleteTask,
    startEdit,
    cancelEdit,
    bulkImport,
    bulkUpdateStatus,
    bulkDeleteTasks,
  };
}
