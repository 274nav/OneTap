import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/Card';
import { colors, spacing, typography } from '@/lib/theme';

function Row({
  icon,
  label,
  onPress,
  right,
  danger,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
  danger?: boolean;
}) {
  const content = (
    <>
      <Ionicons name={icon} size={20} color={danger ? colors.danger : colors.secondaryText} />
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      <View style={{ flex: 1 }} />
      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={colors.secondaryText} />)}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable onPress={onPress} style={styles.row}>
      {content}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const { profile, refreshProfile, signOut } = useAuth();
  const router = useRouter();
  const [locationSharing, setLocationSharing] = useState(true);
  const [invisible, setInvisible] = useState(profile?.invisible_mode ?? false);

  const toggleLocationSharing = async (value: boolean) => {
    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationSharing(status === 'granted');
      return;
    }
    setLocationSharing(false);
    Alert.alert('Location verification off', 'Venue check-in will not work until you turn this back on.');
  };

  const toggleInvisible = async (value: boolean) => {
    if (value && !profile?.premium) {
      Alert.alert('Premium feature', 'Invisible Mode is available to Premium subscribers.');
      return;
    }
    setInvisible(value);
    await supabase.from('users').update({ invisible_mode: value }).eq('id', profile?.id);
    await refreshProfile();
  };

  const handleResetPassword = async () => {
    const email = (await supabase.auth.getUser()).data.user?.email;
    if (!email) return Alert.alert('No email on file', "You're signed in with Google/Apple, so there's no password to reset.");
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Check your email', 'A password reset link has been sent.');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently removes your profile, photos, likes, matches, messages, reports, and chat history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('delete_own_account');
            if (error) return Alert.alert('Error', error.message);
            await signOut();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={{ marginBottom: spacing.lg }}>
        <Row icon="shield-checkmark-outline" label="Privacy Policy" onPress={() => router.push('/legal/privacy-policy')} />
        <Divider />
        <Row icon="document-text-outline" label="Terms & Conditions" onPress={() => router.push('/legal/terms')} />
        <Divider />
        <Row icon="key-outline" label="Reset Password" onPress={handleResetPassword} />
      </Card>

      <Card style={{ marginBottom: spacing.lg }}>
        <Row
          icon="location-outline"
          label="Share Location Verification"
          right={<Switch value={locationSharing} onValueChange={toggleLocationSharing} trackColor={{ true: colors.accent }} />}
        />
        <Divider />
        <Row icon="notifications-outline" label="Notification Settings" onPress={() => Alert.alert('Notifications', 'Manage push notifications in your device Settings app.')} />
        <Divider />
        <Row
          icon="eye-off-outline"
          label="Invisible Mode (Premium)"
          right={<Switch value={invisible} onValueChange={toggleInvisible} trackColor={{ true: colors.accent }} />}
        />
      </Card>

      <Card>
        <Row icon="log-out-outline" label="Sign Out" onPress={signOut} />
        <Divider />
        <Row icon="trash-outline" label="Delete Account" onPress={handleDeleteAccount} danger />
      </Card>
    </ScrollView>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border, marginLeft: spacing.xl + spacing.sm }} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  rowLabel: { ...typography.body },
});
