import React, { useState } from 'react';
import { OnlineUser } from '@/hooks/useOnlinePresence';

interface OnlineUsersProps {
  users: OnlineUser[];
}

const COLORS = [
  '#4a90d9', '#28a745', '#dc3545', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
];

function getColor(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function getInitial(name: string) {
  return (name?.[0] || '?').toUpperCase();
}

const OnlineUsers: React.FC<OnlineUsersProps> = ({ users }) => {
  const [expanded, setExpanded] = useState(false);
  const [hoveredUser, setHoveredUser] = useState<OnlineUser | null>(null);
  const maxShow = 5;
  const showUsers = expanded ? users : users.slice(0, maxShow);

  return (
    <div className="online-users-container">
      <div className="online-users-indicator">
        <span className="online-dot" />
        <span className="online-count">{users.length} 人在线</span>
      </div>
      <div className="online-avatars">
        {showUsers.map((u) => (
          <div
            key={u.userId}
            className="online-avatar"
            style={{ background: getColor(u.userId) }}
            onMouseEnter={() => setHoveredUser(u)}
            onMouseLeave={() => setHoveredUser(null)}
          >
            {getInitial(u.displayName || u.email)}
            {hoveredUser?.userId === u.userId && (
              <div className="online-tooltip">
                <div className="online-tooltip-name">{u.displayName}</div>
                <div className="online-tooltip-email">{u.email}</div>
              </div>
            )}
          </div>
        ))}
        {!expanded && users.length > maxShow && (
          <button className="online-avatar online-more" onClick={() => setExpanded(true)}>
            +{users.length - maxShow}
          </button>
        )}
        {expanded && users.length > maxShow && (
          <button className="online-avatar online-more" onClick={() => setExpanded(false)}>
            ⟨
          </button>
        )}
      </div>
    </div>
  );
};

export default OnlineUsers;
