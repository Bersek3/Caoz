'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { MatchChatActivity } from '../lib/matchChatActivity';

export function useMatchChatActivity(tournamentId: string) {
  const { user, token } = useAuth();
  const isAdmin = user?.role === 'admin';
  const scope = `${user?.id}:${tournamentId}:${token}`;
  const [snapshot, setSnapshot] = useState<{ scope: string; matches: Record<string, MatchChatActivity> }>();
  useEffect(() => {
    if (!isAdmin || !token) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let inFlight = false;
    const refresh = async () => {
      if (controller.signal.aborted || inFlight) return;
      clearTimeout(timer);
      if (document.visibilityState === 'hidden') return;
      inFlight = true;
      try {
        const response = await fetch(`/api/tournaments/${encodeURIComponent(tournamentId)}/chat-activity`, {
          headers: { Authorization: `Bearer ${token}` }, cache: 'no-store', signal: controller.signal
        });
        if (response.ok) {
          const data: { activity: MatchChatActivity[] } = await response.json();
          if (!controller.signal.aborted) setSnapshot({ scope, matches: Object.fromEntries(data.activity.map(activity => [activity.matchId, activity])) });
        }
      } catch {
        // Preserve existing badges on transient failures and retry on the next poll.
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) timer = setTimeout(refresh, 2500);
      }
    };
    void refresh();
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('caoz:match-chat-read', refresh);
    return () => {
      controller.abort(); clearTimeout(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('caoz:match-chat-read', refresh);
    };
  }, [isAdmin, token, tournamentId, scope]);
  return isAdmin && snapshot?.scope === scope ? snapshot.matches : {};
}
