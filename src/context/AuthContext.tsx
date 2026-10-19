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

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      // 1. Check existing Supabase session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || 'Trader',
          });
        }
        setLoading(false);
      });

      // 2. Listen for auth changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            full_name: session.user.user_metadata?.full_name || 'Trader',
          });
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
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          full_name: data.user.user_metadata?.full_name || 'Trader',
        });
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
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email || '',
          full_name: fullName,
        });
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
