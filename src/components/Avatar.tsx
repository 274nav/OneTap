import React from 'react';
import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/lib/theme';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

const PALETTE = [
  ['#E66A5C', '#C0493C'],
  ['#8C9A8B', '#5F6F5E'],
  ['#7C8BA1', '#2E3A46'],
  ['#E0A45C', '#C0493C'],
];

export function Avatar({ uri, name, size = 56 }: AvatarProps) {
  if (uri) {
    return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} contentFit="cover" />;
  }
  const idx = name.charCodeAt(0) % PALETTE.length;
  const [from] = PALETTE[idx];
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: from },
      ]}
    >
      <Text style={[styles.initial, { fontSize: size * 0.38 }]}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  initial: { color: colors.white, fontWeight: '700' },
});
