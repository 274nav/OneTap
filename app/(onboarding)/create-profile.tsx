import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { calculateAge, formatDob } from '@/lib/utils';
import { colors, radius, spacing, typography } from '@/lib/theme';
import type { OrientationType, SexType } from '@/lib/database.types';

const SEX_OPTIONS: { value: SexType; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const ORIENTATION_OPTIONS: { value: OrientationType; label: string }[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'gay', label: 'Gay' },
  { value: 'lesbian', label: 'Lesbian' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'pansexual', label: 'Pansexual' },
  { value: 'asexual', label: 'Asexual' },
  { value: 'other', label: 'Other' },
];

const MAX_BIO = 200;
const MIN_AGE_DATE = new Date();
MIN_AGE_DATE.setFullYear(MIN_AGE_DATE.getFullYear() - 18);

export default function CreateProfileScreen() {
  const { session, refreshProfile } = useAuth();
  const router = useRouter();

  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [dob, setDob] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sex, setSex] = useState<SexType | null>(null);
  const [orientation, setOrientation] = useState<OrientationType | null>(null);
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);

  const canSubmit = name.trim().length > 0 && dob && sex && orientation && !saving;

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Allow photo library access to choose a picture.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission needed', 'Allow camera access to take a photo.');
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const choosePhoto = () => {
    Alert.alert('Profile photo', undefined, [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = async () => {
    if (!session?.user || !dob || !sex || !orientation) return;
    setSaving(true);
    try {
      let photoUrl: string | null = null;

      if (photoUri) {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();
        const path = `${session.user.id}/avatar-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;
        photoUrl = supabase.storage.from('profile-photos').getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase.from('users').insert({
        id: session.user.id,
        name: name.trim(),
        dob: formatDob(dob),
        sex,
        orientation,
        bio,
        photo_url: photoUrl,
        privacy_accepted_at: new Date().toISOString(),
      });
      if (error) throw error;

      await refreshProfile();
      router.replace('/(tabs)/profile');
    } catch (e) {
      Alert.alert('Could not save profile', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Create your profile</Text>
        <Text style={styles.subheading}>This is what people at your venue will see.</Text>

        <View style={styles.photoRow}>
          <View style={styles.photoWrap}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <Ionicons name="person" size={40} color={colors.secondaryText} />
            )}
          </View>
          <Button label={photoUri ? 'Change Photo' : 'Add Photo'} variant="secondary" fullWidth={false} onPress={choosePhoto} />
        </View>

        <Field label="Name">
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" maxLength={60} />
        </Field>

        <Field label="Date of Birth">
          <Button
            label={dob ? dob.toLocaleDateString() : 'Select date of birth'}
            variant="secondary"
            onPress={() => setShowDatePicker(true)}
          />
          {showDatePicker && (
            <DateTimePicker
              value={dob ?? MIN_AGE_DATE}
              mode="date"
              display="spinner"
              maximumDate={MIN_AGE_DATE}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (date) setDob(date);
              }}
            />
          )}
          {dob && <Text style={styles.ageHint}>Age {calculateAge(dob)}</Text>}
        </Field>

        <Field label="Sex">
          <View style={styles.chipRow}>
            {SEX_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} active={sex === o.value} onPress={() => setSex(o.value)} />
            ))}
          </View>
        </Field>

        <Field label="Sexual Orientation">
          <View style={styles.chipRow}>
            {ORIENTATION_OPTIONS.map((o) => (
              <Chip key={o.value} label={o.label} active={orientation === o.value} onPress={() => setOrientation(o.value)} />
            ))}
          </View>
        </Field>

        <Field label={`Bio (${bio.length}/${MAX_BIO})`}>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, MAX_BIO))}
            placeholder="A short line about you"
            multiline
            maxLength={MAX_BIO}
          />
        </Field>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Finish" disabled={!canSubmit} loading={saving} onPress={handleSubmit} />
      </View>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxl },
  heading: { ...typography.h1 },
  subheading: { ...typography.body, color: colors.secondaryText, marginTop: spacing.xs, marginBottom: spacing.xl },
  photoRow: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  photoWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  fieldLabel: { ...typography.label, marginBottom: spacing.sm, textTransform: 'uppercase' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  ageHint: { ...typography.caption, marginTop: spacing.xs },
  footer: { padding: spacing.xl, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
});
