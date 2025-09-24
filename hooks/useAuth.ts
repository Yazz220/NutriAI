import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabase/functions/_shared/supabaseClient';
import type { Session, User } from '@supabase/supabase-js';

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
    });

    return () => {
      isMounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
    setSession(null);
    setUser(null);
  }, [setSession, setUser]);

  return { initializing, session, user, signOut } as const;
}
