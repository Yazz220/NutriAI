import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { identifyUser } from '@/utils/analytics';
import { withTimeout } from '@/utils/networkTimeout';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setInitializing(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      identifyUser(s?.user?.id ?? null);
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Prefer global sign-out (revokes refresh token); supported in supabase-js v2.
      // Time-bounded so a hung network call can't freeze the UI forever.
      await withTimeout(supabase.auth.signOut({ scope: 'global' }), 8000);
    } catch (err1) {
      // Fallback to local sign-out to clear device session even if global fails
      try {
        await withTimeout(supabase.auth.signOut({ scope: 'local' }), 5000);
      } catch (err2) {
        // As a last resort, proceed with client-side state reset
        console.warn('[Auth] signOut fallback failed, clearing local state anyway', err1, err2);
      }
    } finally {
      setSession(null);
      setUser(null);
    }
  }, [setSession, setUser]);

  return { initializing, session, user, signOut } as const;
}
