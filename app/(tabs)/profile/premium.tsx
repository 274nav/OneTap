import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { purchasePremium } from '@/lib/billing';
import { colors, spacing, typography } from '@/lib/theme';

const BENEFITS = [
  'Unlimited likes — no ads, no 8-like cap',
  'Unlimited chats and messages',
  'Premium verification badge',
  'Invisible Mode — browse and like without appearing in venue lists',
  'Get notified when someone you pick checks into your venue',
  'Priority profile visibility (coming soon)',
];

export default function PremiumScreen() {
  const { profile } = useAuth();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [busy, setBusy] = useState(false);

  const handleSubscribe = async () => {
    setBusy(true);
    try {
      await purchasePremium(plan);
    } catch (e) {
      Alert.alert('Premium', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  if (profile?.premium) {
    return (
      <View style={styles.centered}>
        <Ionicons name="checkmark-circle" size={48} color={colors.accent} />
        <Text style={styles.alreadyTitle}>You're already Premium</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>OneTap Premium</Text>
      <Text style={styles.subheading}>Everything OneTap offers, without limits.</Text>

      <View style={styles.planRow}>
        <PlanCard label="Monthly" price="£5.99/mo" active={plan === 'monthly'} onPress={() => setPlan('monthly')} />
        <PlanCard label="Yearly" price="£60/yr" sub="Save ~17%" active={plan === 'yearly'} onPress={() => setPlan('yearly')} />
      </View>

      <Card style={{ marginTop: spacing.xl }}>
        {BENEFITS.map((b) => (
          <View key={b} style={styles.benefitRow}>
            <Ionicons name="checkmark" size={18} color={colors.secondaryAccent} />
            <Text style={styles.benefitText}>{b}</Text>
          </View>
        ))}
      </Card>

      <Button label={`Subscribe — ${plan === 'monthly' ? '£5.99/mo' : '£60/yr'}`} loading={busy} onPress={handleSubscribe} style={{ marginTop: spacing.xl }} />
    </ScrollView>
  );
}

function PlanCard({ label, price, sub, active, onPress }: { label: string; price: string; sub?: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flex: 1 }}>
      <Card style={[styles.planCard, active && styles.planCardActive]}>
        <Text style={styles.planLabel}>{label}</Text>
        <Text style={styles.planPrice}>{price}</Text>
        {sub && <Text style={styles.planSub}>{sub}</Text>}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, paddingBottom: spacing.xxl },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background },
  alreadyTitle: { ...typography.h2 },
  heading: { ...typography.h1 },
  subheading: { ...typography.body, color: colors.secondaryText, marginTop: spacing.xs },
  planRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  planCard: { flex: 1, alignItems: 'center', borderWidth: 2, borderColor: colors.border },
  planCardActive: { borderColor: colors.accent },
  planLabel: { ...typography.label },
  planPrice: { ...typography.h2, marginTop: spacing.xs },
  planSub: { ...typography.caption, color: colors.secondaryAccent, marginTop: 2 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  benefitText: { ...typography.body, flex: 1 },
});
