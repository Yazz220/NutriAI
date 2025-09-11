// This file previously contained multiple merged implementations which caused duplicate
// declarations. Keep a simple re-export to the canonical implementation in
// `useEnhancedUserProfile.ts` so consumers importing this path continue to work.
export { useUserProfileStore } from './useEnhancedUserProfile';