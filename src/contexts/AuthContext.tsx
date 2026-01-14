'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserByEmail } from '@/services/database';
import type { LocalUser, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);
  const [userData, setUserData] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isLoggingIn = useRef(false);
  const isLoggingOut = useRef(false);

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        // First check localStorage for stored user
        const storedUser = localStorage.getItem('capital21_user');

        // If no stored user, don't try to restore from Supabase
        // This handles the logout case where localStorage was cleared
        if (!storedUser) {
          console.log('No stored user in localStorage, skipping session restore');
          setLoading(false);
          return;
        }

        try {
          const user: LocalUser = JSON.parse(storedUser);
          setCurrentUser({ email: user.email });
          setUserData(user);
          console.log('User restored from localStorage:', user.email);
        } catch (e) {
          console.error('Error parsing stored user:', e);
          localStorage.removeItem('capital21_user');
          setLoading(false);
          return;
        }

        // Validate with Supabase session and refresh user data
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial session check:', session?.user?.email);

        if (session?.user?.email) {
          try {
            const user = await getUserByEmail(session.user.email);

            // Check if user is disabled
            if (user?.disabled) {
              console.warn('User account is disabled, signing out:', session.user.email);
              await supabase.auth.signOut();
              localStorage.removeItem('capital21_user');
              setCurrentUser(null);
              setUserData(null);
            } else if (user) {
              // Update localStorage with fresh data
              setUserData(user);
              localStorage.setItem('capital21_user', JSON.stringify(user));
            }
          } catch (e) {
            console.error('Error fetching user in checkSession:', e);
            // Keep localStorage data if fetch fails
          }
        } else {
          // No Supabase session but we have localStorage - clear it
          console.log('No Supabase session, clearing localStorage');
          localStorage.removeItem('capital21_user');
          setCurrentUser(null);
          setUserData(null);
        }
      } catch (e) {
        console.error('Error checking session:', e);
      }
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email, 'isLoggingIn:', isLoggingIn.current);

        // Skip if login or logout is handling this
        if (isLoggingIn.current || isLoggingOut.current) {
          console.log('Skipping onAuthStateChange - login/logout is handling it');
          return;
        }

        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setUserData(null);
          localStorage.removeItem('capital21_user');
          setLoading(false);
          return;
        }

        if (session?.user?.email) {
          try {
            const user = await getUserByEmail(session.user.email);

            // Check if user is disabled
            if (user?.disabled) {
              console.warn('User account is disabled, signing out:', session.user.email);
              await supabase.auth.signOut();
              localStorage.removeItem('capital21_user');
              setCurrentUser(null);
              setUserData(null);
            } else {
              setCurrentUser({ email: session.user.email });
              setUserData(user);
              if (user) {
                localStorage.setItem('capital21_user', JSON.stringify(user));
              }
            }
          } catch (e) {
            console.error('Error fetching user in onAuthStateChange:', e);
            setUserData(null);
          }
        } else {
          setCurrentUser(null);
          setUserData(null);
        }
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<LocalUser | null> => {
    console.log('Starting login for:', email);
    isLoggingIn.current = true;

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Auth error:', authError.message);
        throw new Error(authError.message || 'Authentication failed');
      }

      if (!authData?.user) {
        throw new Error('No user returned from authentication');
      }

      console.log('Auth successful for:', email);

      // Fetch user data from database
      const user = await getUserByEmail(email);
      console.log('User data fetched:', user);

      if (!user) {
        // User authenticated but not in local_users table
        console.warn('User authenticated but not found in local_users table');
        await supabase.auth.signOut();
        throw new Error('Usuario no registrado en el sistema');
      }

      // Check if user is disabled
      if (user.disabled) {
        console.warn('User account is disabled:', email);
        await supabase.auth.signOut();
        throw new Error('Tu cuenta ha sido deshabilitada. Contacta al administrador.');
      }

      setCurrentUser({ email });
      setUserData(user);
      setLoading(false);

      // Store user in localStorage
      localStorage.setItem('capital21_user', JSON.stringify(user));

      return user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      isLoggingIn.current = false;
    }
  };

  const logout = async () => {
    isLoggingOut.current = true;
    try {
      localStorage.removeItem('capital21_user');
      setCurrentUser(null);
      setUserData(null);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } finally {
      isLoggingOut.current = false;
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
  };

  // Role helpers
  const isRoot = userData?.role === 'root';
  const isAdmin = userData?.role === 'admin';
  const isCustomer = userData?.role === 'customer';

  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    login,
    logout,
    resetPassword,
    isRoot,
    isAdmin,
    isCustomer,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
