import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function ChatsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Chats' }} />
      <Stack.Screen name="[matchId]" options={{ title: '' }} />
    </Stack>
  );
}
