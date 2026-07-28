import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { colors, spacing } from '@/lib/theme';

/**
 * Placeholder for the Free plan's advertisements. Swap this for a real ad SDK (e.g.
 * react-native-google-mobile-ads) once you have AdMob app/ad-unit IDs -- see README "Ads" section.
 * Renders nothing for Premium users.
 */
export function AdBanner() {
  const { profile } = useAuth();
  if (profile?.premium) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Advertisement</Text>
      <Text style={styles.sub}>Go Premium to remove ads</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.secondaryText },
  sub: { fontSize: 11, color: colors.secondaryText, marginTop: 2 },
});
