import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserRow } from '@/lib/database.types';

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: Session | null;
  profile: UserRow | null;
  loading: boolean;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  appleAvailable: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // expo-auth-session's web flow throws synchronously at render time if webClientId is missing --
  // fall back to a placeholder so an unconfigured OAuth client degrades to a failed sign-in attempt
  // instead of crashing the whole app before Settings/README even loads.
  const [, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'not-configured',
  });

  const refreshProfile = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase.from('users').select('*').eq('id', userData.user.id).maybeSingle();
    if (!error) setProfile(data as UserRow | null);
  }, []);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [session?.user?.id, refreshProfile]);

  useEffect(() => {
    if (googleResponse?.type === 'success' && googleResponse.params.id_token) {
      supabase.auth.signInWithIdToken({
        provider: 'google',
        token: googleResponse.params.id_token,
      });
    }
  }, [googleResponse]);

  const signInWithGoogle = useCallback(async () => {
    await promptGoogleAsync();
  }, [promptGoogleAsync]);

  const signInWithApple = useCallback(async () => {
    if (Platform.OS !== 'ios') return;
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) throw new Error('Apple sign-in did not return an identity token');
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const value = useMemo(
    () => ({ session, profile, loading, signInWithApple, signInWithGoogle, signOut, refreshProfile, appleAvailable }),
    [session, profile, loading, signInWithApple, signInWithGoogle, signOut, refreshProfile, appleAvailable]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
