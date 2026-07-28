/**
 * Integration seam for real subscription billing (App Store / Play Store IAP, typically via
 * RevenueCat). Wire this up once you have App Store Connect / Play Console + RevenueCat set up --
 * see README "Premium billing" section. Until then this intentionally throws rather than silently
 * granting Premium, since faking a successful purchase would be misleading.
 */
export async function purchasePremium(_plan: 'monthly' | 'yearly'): Promise<never> {
  throw new Error(
    'Payment processing is not connected yet. Set up RevenueCat (or native App Store/Play Billing) and wire it up here.'
  );
}
