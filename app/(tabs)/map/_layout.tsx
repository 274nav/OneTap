import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function MapStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Map' }} />
      <Stack.Screen name="venue/[venueId]" options={{ title: 'Venue' }} />
    </Stack>
  );
}
