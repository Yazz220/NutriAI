import { Platform } from 'react-native';

export {
  NOSH_PLAN_CATALOG,
  NOSH_SUBSCRIPTION_IDS,
  isNoshSubscriptionProduct,
  type NoshBillingPeriod,
  type NoshPlanId,
} from '@/supabase/functions/_shared/subscriptionCatalog';

export type RevenueCatPlatform = 'ios' | 'android' | 'web';

const revenueCatPublicKeys: Record<RevenueCatPlatform, string | undefined> = {
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
  web: process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY,
};

export function getRevenueCatPublicApiKey(
  platform: string = Platform.OS,
): string | null {
  if (platform !== 'ios' && platform !== 'android' && platform !== 'web') return null;
  const key = revenueCatPublicKeys[platform]?.trim();
  return key || null;
}

export function isRevenueCatPlatformSupported(platform: string = Platform.OS): boolean {
  return platform === 'ios' || platform === 'android' || platform === 'web';
}
