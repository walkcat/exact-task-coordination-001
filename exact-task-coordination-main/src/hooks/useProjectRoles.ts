import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ProjectRole = 'admin' | 'project_manager' | 'member' | 'guest';

export const ROLE_LABELS: Record<ProjectRole, string> = {
  admin: '管理员',
  project_manager: '项目经理',
  member: '项目成员',
  guest: '访客',
};

export interface ProjectRoleEntry {
  id: string;
  user_id: string;
  project_id: string;
  role: ProjectRole;
  created_at: string;
  display_name?: string;
  email?: string;
}

export function useProjectRoles(projectId: string | null) {
  const { user } = useAuth();
  const [roles, setRoles] = useState<ProjectRoleEntry[]>([]);
  const [myRole, setMyRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);
  const isGlobalAdmin = user?.email === '17358716@qq.com';

  const fetchRoles = useCallback(async () => {
    if (!user || !projectId) { setRoles([]); setMyRole(null); setLoading(false); return; }
    
    const { data, error } = await supabase
      .from('project_roles')
      .select('*')
      .eq('project_id', projectId);
    
    if (!error && data) {
      // Fetch profile info for each user
      const userIds = data.map((r: any) => r.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', userIds);
      
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.display_name]));
      
      const entries: ProjectRoleEntry[] = data.map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        project_id: r.project_id,
        role: r.role as ProjectRole,
        created_at: r.created_at,
        display_name: profileMap.get(r.user_id) || undefined,
      }));
      
      setRoles(entries);
      const mine = entries.find(r => r.user_id === user.id);
      setMyRole(mine?.role ?? null);
    }
    setLoading(false);
  }, [user, projectId]);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const assignRole = useCallback(async (userId: string, role: ProjectRole) => {
    if (!projectId) return false;
    const { error } = await supabase
      .from('project_roles')
      .upsert({ user_id: userId, project_id: projectId, role }, { onConflict: 'user_id,project_id' });
    if (error) {
      alert('分配角色失败：' + error.message);
      return false;
    }
    await fetchRoles();
    return true;
  }, [projectId, fetchRoles]);

  const removeRole = useCallback(async (roleId: string) => {
    const { error } = await supabase.from('project_roles').delete().eq('id', roleId);
    if (error) {
      alert('移除角色失败：' + error.message);
      return false;
    }
    await fetchRoles();
    return true;
  }, [fetchRoles]);

  // Effective role: global admin always has admin-level access
  const effectiveRole: ProjectRole | null = isGlobalAdmin ? 'admin' : myRole;

  const canManageRoles = isGlobalAdmin || effectiveRole === 'admin' || effectiveRole === 'project_manager';
  const canEditTasks = isGlobalAdmin || effectiveRole === 'admin' || effectiveRole === 'project_manager' || effectiveRole === 'member' || effectiveRole === null;
  const canDeleteTasks = isGlobalAdmin || effectiveRole === 'admin' || effectiveRole === 'project_manager' || effectiveRole === null;
  const canEditOwnTasksOnly = effectiveRole === 'member';
  const isGuest = effectiveRole === 'guest';

  return {
    roles,
    myRole: effectiveRole,
    loading,
    assignRole,
    removeRole,
    canManageRoles,
    canEditTasks,
    canDeleteTasks,
    canEditOwnTasksOnly,
    isGuest,
    isGlobalAdmin,
    fetchRoles,
  };
}
