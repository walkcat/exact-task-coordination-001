import React, { useState, useEffect } from 'react';
import { X, UserPlus, Trash2 } from 'lucide-react';
import { ProjectRoleEntry, ProjectRole, ROLE_LABELS } from '@/hooks/useProjectRoles';
import { supabase } from '@/integrations/supabase/client';

interface RoleManageModalProps {
  roles: ProjectRoleEntry[];
  onAssign: (userId: string, role: ProjectRole) => Promise<boolean>;
  onRemove: (roleId: string) => Promise<boolean>;
  onClose: () => void;
  isGlobalAdmin: boolean;
}

interface UserProfile {
  id: string;
  display_name: string | null;
}

export default function RoleManageModal({ roles, onAssign, onRemove, onClose, isGlobalAdmin }: RoleManageModalProps) {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState<ProjectRole>('member');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch all profiles to allow assigning roles
    supabase.from('profiles').select('id, display_name').then(({ data }) => {
      if (data) setAllUsers(data as UserProfile[]);
    });
  }, []);

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    await onAssign(selectedUserId, selectedRole);
    setSelectedUserId('');
    setSaving(false);
  };

  const handleRemove = async (roleId: string) => {
    if (!confirm('确定移除该用户的角色吗？')) return;
    await onRemove(roleId);
  };

  // Users not yet assigned
  const assignedUserIds = new Set(roles.map(r => r.user_id));
  const availableUsers = allUsers.filter(u => !assignedUserIds.has(u.id));

  const roleOptions: ProjectRole[] = ['admin', 'project_manager', 'member', 'guest'];

  return (
    <div className="dashboard-overlay">
      <div className="dashboard-container" style={{ maxWidth: 600 }}>
        <div className="dashboard-header">
          <h2>成员角色管理</h2>
          <button className="dashboard-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Add new role */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={selectedUserId}
              onChange={e => setSelectedUserId(e.target.value)}
              style={{ flex: 1, minWidth: 120, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            >
              <option value="">选择用户...</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.display_name || u.id.slice(0, 8)}</option>
              ))}
            </select>
            <select
              value={selectedRole}
              onChange={e => setSelectedRole(e.target.value as ProjectRole)}
              style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)' }}
            >
              {roleOptions.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAssign}
            disabled={!selectedUserId || saving}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
              padding: '8px 14px', borderRadius: 6, width: '100%',
              background: 'var(--primary-color)', color: '#fff', border: 'none',
              cursor: selectedUserId ? 'pointer' : 'not-allowed',
              opacity: selectedUserId ? 1 : 0.5,
              fontSize: 14, fontWeight: 500,
            }}
          >
            <UserPlus size={14} /> 分配角色
          </button>
        </div>

        {/* Role list */}
        <div style={{ padding: '12px 20px', maxHeight: 400, overflowY: 'auto' }}>
          {roles.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>暂未分配角色，所有用户拥有默认权限</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 13, color: 'var(--text-muted)' }}>用户</th>
                  <th style={{ textAlign: 'left', padding: '8px 4px', fontSize: 13, color: 'var(--text-muted)' }}>角色</th>
                  <th style={{ textAlign: 'right', padding: '8px 4px', fontSize: 13, color: 'var(--text-muted)' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {roles.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 4px', fontSize: 14 }}>{r.display_name || r.user_id.slice(0, 8)}</td>
                    <td style={{ padding: '10px 4px' }}>
                      <select
                        value={r.role}
                        onChange={async (e) => {
                          await onAssign(r.user_id, e.target.value as ProjectRole);
                        }}
                        style={{ padding: '4px 6px', borderRadius: 4, border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-primary)', fontSize: 13 }}
                      >
                        {roleOptions.map(ro => (
                          <option key={ro} value={ro}>{ROLE_LABELS[ro]}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleRemove(r.id)}
                        style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', padding: 4 }}
                        title="移除角色"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)' }}>
          <p><strong>权限说明：</strong></p>
          <p>• 管理员：完全控制（项目+任务+角色管理）</p>
          <p>• 项目经理：管理项目任务和分配成员角色</p>
          <p>• 项目成员：增删改自己的任务</p>
          <p>• 访客：只能查看任务</p>
        </div>
      </div>
    </div>
  );
}
