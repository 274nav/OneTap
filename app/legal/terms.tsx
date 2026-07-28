import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/lib/theme';

const SECTIONS = [
  { title: 'Eligibility', body: 'You must be at least 18 years old to use OneTap.' },
  {
    title: 'How matching works',
    body:
      'Checking into a venue lets other checked-in users see your profile and send you a like. Chat only unlocks when two users like each other. ' +
      'A one-sided like never opens a conversation.',
  },
  {
    title: 'Venue check-in',
    body:
      'Check-in requires verifying you are within approximately 100 metres of the venue. You are automatically checked out if you leave that radius ' +
      'for more than 10 consecutive minutes, or if location services are turned off while checked in.',
  },
  {
    title: 'Conduct',
    body:
      'Fake profiles, harassment, spam, and inappropriate content are not tolerated. Reported accounts are reviewed and may be removed. ' +
      'Blocking a user immediately removes them from your searches, matches, chats, and venue lists.',
  },
  {
    title: 'Free plan and Premium',
    body:
      'Free accounts include ads, a limit of 8 likes before an ad is required, up to 3 active conversations, and up to 10 messages per conversation. ' +
      'Premium (£5.99/month or £60/year) removes these limits and adds Invisible Mode, a verification badge, and priority notifications.',
  },
  {
    title: 'Account deletion',
    body: 'You may delete your account at any time from Settings. This permanently removes all of your data and cannot be reversed.',
  },
];

export default function TermsScreen() {
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
