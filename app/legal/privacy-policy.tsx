import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/lib/theme';

const SECTIONS = [
  {
    title: 'What we store',
    body:
      'Your profile (name, date of birth, sex, sexual orientation, bio, and profile photo) is stored securely in our database. ' +
      'We never sell or share your personal information with third parties.',
  },
  {
    title: 'Location',
    body:
      "OneTap uses your device's location only to verify that you are physically close to the venue you select for check-in. " +
      'Your exact GPS location is never shown to other users and is never stored as a live tracking position. ' +
      'You can disable location verification at any time in Settings, though venue check-in will not function without it.',
  },
  {
    title: 'Who can see what',
    body:
      'Other users can see your name, age, bio, and photo when you are checked into the same venue, or once you match. ' +
      'Your exact coordinates are never exposed through the app, its API, or to any other user.',
  },
  {
    title: 'Notifications',
    body: 'We use push notifications to tell you about likes, matches, new messages, and automatic venue check-outs. You can manage these in Settings.',
  },
  {
    title: 'Account deletion',
    body:
      'Deleting your account permanently removes your profile, photos, likes, matches, messages, reports, and chat history. ' +
      'This cannot be undone.',
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {SECTIONS.map((s) => (
        <View key={s.title} style={{ marginBottom: spacing.xl }}>
          <Text style={styles.title}>{s.title}</Text>
          <Text style={styles.body}>{s.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
  title: { ...typography.h3, marginBottom: spacing.xs },
  body: { ...typography.body, color: colors.secondaryText, lineHeight: 22 },
});
