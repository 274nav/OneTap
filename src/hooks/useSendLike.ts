import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { friendlyRpcError } from '@/lib/utils';

/**
 * Sends a like, handling the free-tier "8 likes then an ad" gate (enforced server-side by the
 * enforce_like_quota trigger). On AD_REQUIRED, offers to watch a rewarded ad (resets the counter via
 * record_ad_watch) or go Premium, then retries once.
 */
export function useSendLike(onSent: (toUser: string) => void) {
  const { session } = useAuth();
  const router = useRouter();

  const sendLike = useCallback(
    async (toUser: string) => {
      if (!session?.user) return;

      const attempt = async (): Promise<void> => {
        const { error } = await supabase.from('likes').insert({ from_user: session.user.id, to_user: toUser });
        if (!error) {
          onSent(toUser);
          return;
        }
        if (error.message.includes('AD_REQUIRED')) {
          Alert.alert("You've used your 8 free likes", 'Watch a quick ad to get 8 more, or go Premium for unlimited likes.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Go Premium', onPress: () => router.push('/(tabs)/profile/premium') },
            {
              text: 'Watch Ad',
              onPress: async () => {
                // TODO: play a real rewarded ad (e.g. AdMob) here before calling record_ad_watch.
                await supabase.rpc('record_ad_watch');
                attempt();
              },
            },
          ]);
          return;
        }
        Alert.alert('Could not send like', friendlyRpcError(error));
      };

      await attempt();
    },
    [session?.user, onSent, router]
  );

  return sendLike;
}
