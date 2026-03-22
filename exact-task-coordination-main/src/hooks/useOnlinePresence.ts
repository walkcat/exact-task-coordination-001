import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OnlineUser {
  userId: string;
  email: string;
  displayName: string;
  onlineAt: string;
}

export function useOnlinePresence() {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const displayNameRef = useRef<string>('');

  // Fetch display name into ref (no re-render needed)
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        displayNameRef.current = data?.display_name || user.email || '';
        // Re-track with updated name if channel exists
        if (channelRef.current) {
          channelRef.current.track({
            email: user.email || '',
            display_name: displayNameRef.current,
            online_at: new Date().toISOString(),
          }).catch(() => {});
        }
      });
  }, [user?.id, user?.email]);

  const syncState = useCallback((channel: ReturnType<typeof supabase.channel>) => {
    const state = channel.presenceState();
    const users: OnlineUser[] = [];
    const seen = new Set<string>();
    for (const [, presences] of Object.entries(state)) {
      const list = presences as Array<Record<string, unknown>>;
      if (list && list.length > 0) {
        const email = (list[0].email as string) || '';
        const displayName = (list[0].display_name as string) || email;
        const key = email || displayName;
        if (!key || seen.has(key)) continue;
        seen.add(key);
        users.push({
          userId: key,
          email,
          displayName,
          onlineAt: (list[0].online_at as string) || '',
        });
      }
    }
    setOnlineUsers(users);
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Use email immediately, don't wait for display name
    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => syncState(channel))
      .on('presence', { event: 'join' }, () => syncState(channel))
      .on('presence', { event: 'leave' }, () => syncState(channel))
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          try {
            await channel.track({
              email: user.email || '',
              display_name: displayNameRef.current || user.email || '',
              online_at: new Date().toISOString(),
            });
          } catch (e) {
            console.error('Presence track failed:', e);
          }
        }
      });

    const heartbeat = setInterval(async () => {
      if (channelRef.current) {
        try {
          await channelRef.current.track({
            email: user.email || '',
            display_name: displayNameRef.current || user.email || '',
            online_at: new Date().toISOString(),
          });
        } catch (_) {}
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
      if (channelRef.current) {
        channelRef.current.untrack();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.id, user?.email, syncState]);

  return onlineUsers;
}
