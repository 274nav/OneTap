import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors, spacing, typography } from '@/lib/theme';

const POINTS: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; body: string }[] = [
  {
    icon: 'lock-closed-outline',
    title: 'Your profile is stored securely',
    body: 'Your details are protected in our database and are never sold or shared with third parties.',
  },
  {
    icon: 'location-outline',
    title: 'Location is used for verification only',
    body: "We use your device's location only to confirm you're physically close to a venue you select — never as a live tracking position.",
  },
  {
    icon: 'eye-off-outline',
    title: 'Your exact location is never shown',
    body: 'Other users never see your precise coordinates. Only the fact that you\'re checked into a venue is visible.',
  },
  {
    icon: 'toggle-outline',
    title: "You're in control",
    body: 'You can turn location verification off at any time in Settings, though venue check-in needs it switched on to work.',
  },
];

export default function PrivacyScreen() {
  const router = useRouter();
  const [accepted, setAccepted] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Before you start</Text>
        <Text style={styles.subheading}>A quick word on privacy and how OneTap uses your location.</Text>

        <View style={{ gap: spacing.md }}>
          {POINTS.map((p) => (
            <Card key={p.title} style={styles.pointCard}>
              <View style={styles.iconWrap}>
                <Ionicons name={p.icon} size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.pointTitle}>{p.title}</Text>
                <Text style={styles.pointBody}>{p.body}</Text>
              </View>
            </Card>
          ))}
        </View>

        <Button
          label={accepted ? '✓ Agreed to Privacy Policy' : 'I agree to the Privacy Policy'}
          variant={accepted ? 'secondary' : 'primary'}
          onPress={() => setAccepted(true)}
          style={{ marginTop: spacing.xl }}
        />
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Continue" disabled={!accepted} onPress={() => router.replace('/(onboarding)/create-profile')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  heading: { ...typography.h1 },
  subheading: { ...typography.body, color: colors.secondaryText, marginTop: spacing.xs, marginBottom: spacing.xl },
  pointCard: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FBEAE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointTitle: { ...typography.h3, marginBottom: 2 },
  pointBody: { ...typography.caption, lineHeight: 18 },
  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
