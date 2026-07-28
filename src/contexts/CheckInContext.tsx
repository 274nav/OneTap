import React, { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import * as Location from 'expo-location';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { CheckInRow, VenueRow } from '@/lib/database.types';
import { friendlyRpcError } from '@/lib/utils';

const VERIFY_INTERVAL_MS = 2 * 60 * 1000; // ping every 2 min; server auto-checks-out after 10 min out of range

interface ActiveCheckIn extends CheckInRow {
  venue: VenueRow;
}

interface CheckInContextValue {
  activeCheckIn: ActiveCheckIn | null;
  locationEnabled: boolean;
  requestLocationPermission: () => Promise<boolean>;
  checkIn: (venue: VenueRow) => Promise<{ success: boolean; message?: string }>;
  checkOut: () => Promise<void>;
  refreshActiveCheckIn: () => Promise<void>;
}

const CheckInContext = createContext<CheckInContextValue | undefined>(undefined);

export function CheckInProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [activeCheckIn, setActiveCheckIn] = useState<ActiveCheckIn | null>(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refreshActiveCheckIn = useCallback(async () => {
    if (!session?.user) {
      setActiveCheckIn(null);
      return;
    }
    const { data } = await supabase
      .from('check_ins')
      .select('*, venue:venues(*)')
      .eq('user_id', session.user.id)
      .eq('active', true)
      .maybeSingle();
    setActiveCheckIn((data as unknown as ActiveCheckIn) ?? null);
  }, [session?.user]);

  const requestLocationPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    setLocationEnabled(granted);
    return granted;
  }, []);

  useEffect(() => {
    Location.getForegroundPermissionsAsync().then(({ status }) => setLocationEnabled(status === 'granted'));
    refreshActiveCheckIn();
  }, [refreshActiveCheckIn]);

  const verifyOnce = useCallback(async () => {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') {
      // Location disabled while checked in -> mirrors the server's own timeout-based auto-checkout.
      await supabase.rpc('check_out');
      await refreshActiveCheckIn();
      return;
    }
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { data } = await supabase.rpc('verify_check_in', {
      p_lat: position.coords.latitude,
      p_lng: position.coords.longitude,
    });
    if (data?.checked_out) {
      await refreshActiveCheckIn();
    }
  }, [refreshActiveCheckIn]);

  useEffect(() => {
    if (!activeCheckIn) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    verifyOnce();
    intervalRef.current = setInterval(verifyOnce, VERIFY_INTERVAL_MS);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') verifyOnce();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [activeCheckIn?.id, verifyOnce]);

  const checkIn = useCallback(
    async (venue: VenueRow) => {
      const granted = locationEnabled || (await requestLocationPermission());
      if (!granted) return { success: false, message: 'Location access is required to check in.' };

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { data, error } = await supabase.rpc('attempt_check_in', {
        p_venue_id: venue.id,
        p_lat: position.coords.latitude,
        p_lng: position.coords.longitude,
      });

      if (error) return { success: false, message: friendlyRpcError(error) };
      if (!data?.success) {
        if (data?.reason === 'OUT_OF_RANGE') {
          return { success: false, message: `You're ${data.distance_m}m away — get within 100m to check in.` };
        }
        return { success: false, message: 'Check-in failed. Please try again.' };
      }

      await refreshActiveCheckIn();
      return { success: true };
    },
    [locationEnabled, requestLocationPermission, refreshActiveCheckIn]
  );

  const checkOut = useCallback(async () => {
    await supabase.rpc('check_out');
    setActiveCheckIn(null);
  }, []);

  const value = useMemo(
    () => ({ activeCheckIn, locationEnabled, requestLocationPermission, checkIn, checkOut, refreshActiveCheckIn }),
    [activeCheckIn, locationEnabled, requestLocationPermission, checkIn, checkOut, refreshActiveCheckIn]
  );

  return <CheckInContext.Provider value={value}>{children}</CheckInContext.Provider>;
}

export function useCheckIn() {
  const ctx = useContext(CheckInContext);
  if (!ctx) throw new Error('useCheckIn must be used within a CheckInProvider');
  return ctx;
}
