import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserProfile } from '@/types';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, pass: string, fullName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  quickDemoLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'wellstrading_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string, email: string, metaFullName?: string): Promise<UserProfile> => {
    let profileData: any = null;
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
        if (data) profileData = data;
      } catch {
        // Fallback silently if table query fails
      }
    }
    const isAdmin =
      profileData?.is_admin === true ||
      profileData?.role === 'ADMIN' ||
      profileData?.role === 'SUPER_ADMIN' ||
      email === 'sjega82@gmail.com' ||
      email === 'admin@wellstrading.com';

    return {
      id: userId,
      email,
      full_name: profileData?.full_name || metaFullName || 'Trader',
      role: isAdmin ? 'ADMIN' : (profileData?.role || 'USER'),
      is_admin: isAdmin,
      country: profileData?.country || 'United States',
      preferred_currency: profileData?.preferred_currency || 'USD',
      avatar_url: profileData?.avatar_url,
    };
  };

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // 1. Check existing Supabase session
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          const profile = await fetchUserProfile(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata?.full_name
          );
          setUser(profile);
        }
        setLoading(false);
      });

      // 2. Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          const profile = await fetchUserProfile(
            session.user.id,
            session.user.email || '',
            session.user.user_metadata?.full_name
          );
          setUser(profile);
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => subscription.unsubscribe();
    } else {
      // Offline/Local Demo Mode: check LocalStorage
      const savedUser = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch {
          // ignore corrupted local storage
        }
      } else {
        // Auto-provision a default demo user for instant out-of-the-box exploration
        const defaultDemoUser: UserProfile = {
          id: 'demo-user-7890',
          email: 'demo.trader@wellstrading.com',
          full_name: 'Demo Trader',
          country: 'United States',
        };
        setUser(defaultDemoUser);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(defaultDemoUser));
      }
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, pass: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });
      if (error) return { error };
      if (data.user) {
        const profile = await fetchUserProfile(
          data.user.id,
          data.user.email || '',
          data.user.user_metadata?.full_name
        );
        setUser(profile);
      }
      return { error: null };
    } else {
      // Local fallback
      const mockUser: UserProfile = {
        id: 'user-' + Math.random().toString(36).substring(2, 9),
        email,
        full_name: email.split('@')[0],
      };
      setUser(mockUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
      return { error: null };
    }
  };

  const signUp = async (email: string, pass: string, fullName: string) => {
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });
      if (error) return { error };

      // Instant sign-in without email or phone verification
      if (!data.session) {
        const loginRes = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (loginRes.data.user) {
          const profile = await fetchUserProfile(
            loginRes.data.user.id,
            loginRes.data.user.email || email,
            fullName
          );
          setUser(profile);
          return { error: null };
        }
      }

      if (data.user) {
        const profile = await fetchUserProfile(
          data.user.id,
          data.user.email || email,
          fullName
        );
        setUser(profile);
      }
      return { error: null };
    } else {
      // Local fallback
      const mockUser: UserProfile = {
        id: 'user-' + Math.random().toString(36).substring(2, 9),
        email,
        full_name: fullName,
      };
      setUser(mockUser);
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(mockUser));
      return { error: null };
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
  };

  const quickDemoLogin = () => {
    const demoUser: UserProfile = {
      id: 'demo-user-7890',
      email: 'demo.trader@wellstrading.com',
      full_name: 'Demo Trader',
      country: 'United States',
    };
    setUser(demoUser);
    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(demoUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
