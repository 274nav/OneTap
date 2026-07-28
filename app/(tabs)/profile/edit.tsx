import React, { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/Button';
import { colors, radius, spacing, typography } from '@/lib/theme';

const MAX_BIO = 200;

export default function EditProfileScreen() {
  const { profile, refreshProfile } = useAuth();
  const router = useRouter();

  const [photoUri, setPhotoUri] = useState<string | null>(profile?.photo_url ?? null);
  const [name, setName] = useState(profile?.name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [saving, setSaving] = useState(false);

  const choosePhoto = () => {
    Alert.alert('Profile photo', undefined, [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [1, 1] });
          if (!result.canceled) setPhotoUri(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') return;
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
          if (!result.canceled) setPhotoUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      let photoUrl = profile.photo_url;

      if (photoUri && photoUri !== profile.photo_url) {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        const arrayBuffer = await new Response(blob).arrayBuffer();
        const path = `${profile.id}/avatar-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('profile-photos')
          .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;
        photoUrl = supabase.storage.from('profile-photos').getPublicUrl(path).data.publicUrl;
      }

      const { error } = await supabase
        .from('users')
        .update({ name: name.trim(), bio, photo_url: photoUrl })
        .eq('id', profile.id);
      if (error) throw error;

      await refreshProfile();
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.photoRow}>
        <View style={styles.photoWrap}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photo} /> : <Ionicons name="person" size={40} color={colors.secondaryText} />}
        </View>
        <Button label="Change Photo" variant="secondary" fullWidth={false} onPress={choosePhoto} />
      </View>

      <Text style={styles.fieldLabel}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={60} />

      <Text style={[styles.fieldLabel, { marginTop: spacing.lg }]}>Bio ({bio.length}/{MAX_BIO})</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        value={bio}
        onChangeText={(t) => setBio(t.slice(0, MAX_BIO))}
        multiline
        maxLength={MAX_BIO}
      />

      <Button label="Save Changes" loading={saving} onPress={handleSave} style={{ marginTop: spacing.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl },
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
});
