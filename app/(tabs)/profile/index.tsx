import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { calculateAge } from '@/lib/utils';
import { colors, spacing, typography } from '@/lib/theme';

export default function ProfileScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  if (!profile) return null;

  const age = calculateAge(new Date(profile.dob));

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Avatar uri={profile.photo_url} name={profile.name} size={96} />
        <Text style={styles.name}>
          {profile.name}, {age}
        </Text>
        {profile.premium && (
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={14} color={colors.accent} />
            <Text style={styles.badgeText}>Premium</Text>
          </View>
        )}
        {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      </View>

      <View style={styles.actions}>
        {!profile.premium && (
          <Button label="Go Premium" onPress={() => router.push('/(tabs)/profile/premium')} />
        )}
        <Button label="Edit Profile" variant="secondary" onPress={() => router.push('/(tabs)/profile/edit')} />
        <Button label="Settings" variant="ghost" onPress={() => router.push('/(tabs)/profile/settings')} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, alignItems: 'center' },
  card: { alignItems: 'center', paddingVertical: spacing.xl },
  name: { ...typography.h1, marginTop: spacing.lg },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    backgroundColor: '#FBEAE7',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.accent },
  bio: { ...typography.body, color: colors.secondaryText, textAlign: 'center', marginTop: spacing.md, maxWidth: 280 },
  actions: { alignSelf: 'stretch', gap: spacing.md, marginTop: spacing.xl },
});
