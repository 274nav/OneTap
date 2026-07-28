import React, { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { colors, spacing, typography } from '@/lib/theme';

export default function SignInScreen() {
  const { signInWithGoogle, signInWithApple, appleAvailable } = useAuth();
  const [busy, setBusy] = useState<'google' | 'apple' | null>(null);

  const handle = async (provider: 'google' | 'apple') => {
    setBusy(provider);
    try {
      if (provider === 'google') await signInWithGoogle();
      else await signInWithApple();
    } catch (e) {
      Alert.alert('Sign-in failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoMark}>
          <Ionicons name="hand-left" size={40} color={colors.white} />
        </View>
        <Text style={styles.wordmark}>
          One<Text style={{ color: colors.accent }}>Tap</Text>
        </Text>
        <Text style={styles.tagline}>Meet the people around you.{'\n'}One tap is all it takes.</Text>
      </View>

      <View style={styles.actions}>
        {appleAvailable && (
          <Button label="Continue with Apple" variant="primary" loading={busy === 'apple'} onPress={() => handle('apple')} />
        )}
        <Button label="Continue with Google" variant="secondary" loading={busy === 'google'} onPress={() => handle('google')} />

        <Text style={styles.legal}>
          By continuing, you agree to OneTap's{' '}
          <Link href="/legal/terms" style={styles.link}>
            Terms &amp; Conditions
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy-policy" style={styles.link}>
            Privacy Policy
          </Link>
          .
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, justifyContent: 'space-between', padding: spacing.xl },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoMark: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  wordmark: { ...typography.h1, fontSize: 34, color: colors.primary },
  tagline: { ...typography.body, color: colors.secondaryText, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
  actions: { gap: spacing.md, paddingBottom: spacing.lg },
  legal: { ...typography.caption, textAlign: 'center', marginTop: spacing.sm },
  link: { color: colors.primary, fontWeight: '600' },
});
