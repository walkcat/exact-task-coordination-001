import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';

interface AccessLog {
  id: string;
  user_email: string | null;
  action: string;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  login: '登录',
  logout: '退出登录',
};

export default function AccessLogModal({ open, onClose }: Props) {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('access_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => {
        setLogs((data as AccessLog[]) || []);
        setLoading(false);
      });
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 56,
        right: 16,
        zIndex: 1000,
        width: 420,
        maxWidth: 'calc(100vw - 32px)',
        background: 'var(--card-bg, #fff)',
        borderRadius: 10,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        border: '1px solid var(--border-color)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>访问记录</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-color)' }}><X size={16} /></button>
      </div>
      <div style={{ padding: '8px 0', maxHeight: 360, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>加载中...</p>
        ) : logs.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>暂无记录</p>
        ) : (
          logs.map(log => (
            <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', fontSize: 13, borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.user_email || '-'}</span>
              <span style={{ width: 60, textAlign: 'center', color: log.action === 'login' ? '#22c55e' : '#ef4444', fontWeight: 500 }}>
                {ACTION_LABELS[log.action] || log.action}
              </span>
              <span style={{ width: 140, textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>
                {new Date(log.created_at).toLocaleString('zh-CN')}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
