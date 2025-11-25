# Authentication Flow Review & Testing Guide

**Date:** October 22, 2025  
**Status:** Pre-Launch Review  
**Focus:** End-to-End Authentication & Onboarding Flow

---

## Executive Summary

The authentication flow is **well-structured** with solid error handling and retry logic. However, there are **several critical issues** that must be addressed before launch:

### Critical Issues Found:
1. ⚠️ **Missing Supabase client initialization** - `supabaseClient` may not be properly exported
2. ⚠️ **Race condition in navigation** - Onboarding completion check happens before auth state is fully initialized
3. ⚠️ **Profile creation timing** - Default profile created on first login but onboarding data sync happens after
4. ⚠️ **No error recovery UI** - Users stuck if profile save fails during sign-up
5. ⚠️ **Incomplete error handling** - Some edge cases not covered (network timeouts, partial saves)

---

## Architecture Overview

### Flow Diagram

```
App Launch
    ↓
[_layout.tsx] - RootLayoutNav
    ├─ Load fonts
    ├─ Check onboarding completion
    ├─ Initialize auth state (useAuth)
    └─ Route based on state
         ├─ NOT onboarded → (onboarding) screens
         ├─ Onboarded + NOT authenticated → (auth) screens
         └─ Onboarded + Authenticated → (tabs) screens
             ↓
         [Sign-Up/Sign-In]
             ├─ Create Supabase auth account
             ├─ Load onboarding data from AsyncStorage
             ├─ Map to profile format
             ├─ Save to Supabase (nutriai.profiles)
             └─ Navigate to (tabs)
```

### Key Components

| Component | Purpose | Status |
|-----------|---------|--------|
| `useAuth.ts` | Auth state management | ✅ Solid |
| `_layout.tsx` | Navigation routing | ⚠️ Race condition |
| `sign-up.tsx` | Account creation | ✅ Good retry logic |
| `sign-in.tsx` | Account login | ✅ Good retry logic |
| `useUserProfile.ts` | Profile persistence | ✅ Solid |
| `onboardingPersistence.ts` | Onboarding data storage | ✅ Solid |
| `onboardingProfileIntegration.ts` | Data mapping | ✅ Solid |

---

## Critical Issues & Fixes

### Issue #1: Supabase Client Export Path

**Problem:**
```typescript
// sign-in.tsx line 5
import { supabase } from '../../supabase/functions/_shared/supabaseClient';
```

This path points to the **Edge Functions directory**, not the app's client. This may cause import failures.

**Fix Required:**
Verify the correct export path. Should be:
```typescript
import { supabase } from '@/supabase/functions/_shared/supabaseClient';
// OR
import { supabase } from '@/utils/supabaseClient';
```

**Action:** Check if `supabase/functions/_shared/supabaseClient.ts` exists and is properly exported.

---

### Issue #2: Race Condition in Navigation

**Problem:**
In `_layout.tsx` (lines 100-126), the navigation logic depends on three async states:
- `initializing` (auth state)
- `fontsLoaded`
- `onboardingCompleted`

These are checked in parallel, but there's a timing issue:

```typescript
// Line 102
if (initializing || !fontsLoaded || onboardingCompleted === null) return;

// Line 104
const isAuthenticated = devBypass || !!session;
```

If `session` updates while `initializing` is still true, the check at line 104 may use stale data.

**Fix Required:**
```typescript
// Add explicit dependency on initializing
useEffect(() => {
  if (initializing || !fontsLoaded || onboardingCompleted === null) return;
  
  // Only proceed when ALL are ready
  const isAuthenticated = devBypass || !!session;
  // ... rest of logic
}, [initializing, session, fontsLoaded, onboardingCompleted, devBypass]);
```

**Status:** Already has correct dependencies, but add explicit guard.

---

### Issue #3: Profile Creation Timing

**Problem:**
In `useUserProfile.ts` (lines 121-142), a default profile is created on first login:

```typescript
if (!row) {
  const insertDefault = { /* ... */ };
  const { data: created } = await supabase
    .from('profiles')
    .insert(insertDefault)
    .select()
    .single();
}
```

But in `sign-up.tsx` (lines 45-81), onboarding data is synced **after** this default profile exists. This creates two database writes:
1. Default empty profile (from useUserProfile)
2. Onboarding data profile (from sign-up)

**Risk:** Second write could fail, leaving user with empty profile.

**Fix Required:**
Prevent default profile creation if onboarding data exists. Modify `useUserProfile.ts`:

```typescript
const fetchProfile = async (): Promise<UserProfileState | undefined> => {
  if (!user) return undefined;
  
  const { data, error } = await supabase
    .schema('nutriai')
    .from('profiles')
    .select('user_id, display_name, units, goals, preferences')
    .eq('user_id', user.id)
    .maybeSingle();
  
  if (error) {
    console.warn('[Profile] Fetch error', error.message);
    return undefined;
  }

  let row = data as any | null;
  
  // NEW: Check if onboarding data exists before creating default
  if (!row) {
    const onboardingData = await OnboardingPersistenceManager.loadOnboardingData();
    
    if (onboardingData) {
      // Don't create default - let sign-up/sign-in handle it
      console.log('[Profile] Onboarding data exists, skipping default profile');
      return undefined;
    }
    
    // Only create default if NO onboarding data
    const insertDefault = { /* ... */ };
    // ... rest of logic
  }
  
  // ... rest of logic
};
```

---

### Issue #4: No Error Recovery UI

**Problem:**
In `sign-up.tsx` (lines 72-80), if profile sync fails:

```typescript
} catch (syncError) {
  console.error('[SignUp] Failed to sync onboarding data after retries:', syncError);
  Alert.alert(
    'Profile Sync Issue',
    'Your account was created, but we couldn\'t save your preferences. You can update them in Settings.',
    [{ text: 'OK' }]
  );
  // Don't block sign-up - user can update profile later
}
```

The user is allowed to proceed, but:
- ❌ No way to retry immediately
- ❌ No indication of what data was lost
- ❌ Settings screen may not exist yet

**Fix Required:**
Add retry option and better error context:

```typescript
} catch (syncError) {
  console.error('[SignUp] Failed to sync onboarding data after retries:', syncError);
  
  return new Promise((resolve) => {
    Alert.alert(
      'Profile Sync Issue',
      'We couldn\'t save your health preferences. You can retry or continue without them.',
      [
        {
          text: 'Retry',
          onPress: async () => {
            try {
              const profileData = OnboardingProfileIntegration.mapOnboardingToProfile(onboardingData);
              await saveProfile(profileData);
              await OnboardingPersistenceManager.clearOnboardingData();
              resolve(true);
            } catch (retryError) {
              Alert.alert('Still having issues?', 'Your account is ready. You can update preferences later.');
              resolve(false);
            }
          }
        },
        {
          text: 'Continue',
          onPress: () => resolve(false)
        }
      ]
    );
  });
}
```

---

### Issue #5: Missing Network Error Handling

**Problem:**
Network timeouts and connection errors are not explicitly handled. If Supabase is unreachable:

```typescript
// sign-in.tsx line 43
const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
```

If this times out (>30s), the user sees a generic error with no retry option.

**Fix Required:**
Add timeout wrapper and retry UI:

```typescript
const withTimeout = async <T,>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> => {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
  );
  return Promise.race([promise, timeout]);
};

const onSignIn = async () => {
  setError(null);
  if (!email || !password) {
    setError('Please enter email and password');
    return;
  }
  setLoading(true);
  try {
    const { data, error: authError } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password })
    );
    // ... rest of logic
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to sign in';
    if (msg.includes('timeout')) {
      setError('Connection timeout. Check your internet and try again.');
    } else {
      setError(msg);
    }
  }
};
```

---

## Data Flow Validation

### Onboarding → Profile Mapping

**Source:** `onboardingProfileIntegration.ts`  
**Validation:** ✅ Comprehensive

```
OnboardingData
├─ basicProfile (age, height, weight, gender, activityLevel)
├─ healthGoal (lose-weight, gain-weight, maintain-weight, custom)
├─ dietaryPreferences (allergies, restrictions, customRestrictions)
├─ customGoal (title, motivation, goalType)
└─ goalPreferences (useCustomCalories, customCalorieTarget, customMacroTargets)
    ↓
    [mapOnboardingToProfile]
    ↓
UserProfileState
├─ basics (name, age, sex, heightCm, weightKg)
├─ goals (dailyCalories, proteinTargetG, carbsTargetG, fatsTargetG, etc.)
└─ preferences (allergies, dietary, dislikedIngredients, preferredCuisines)
```

**Calorie Calculation:** ✅ Mifflin-St Jeor equation implemented correctly  
**Macro Targets:** ✅ 30% protein, 40% carbs, 30% fats (research-backed)  
**Validation:** ✅ Comprehensive range checks

---

## Testing Checklist

### Pre-Launch Testing Plan

#### Phase 1: Happy Path (✅ Should work)

- [ ] **Fresh Install → Onboarding → Sign-Up → Dashboard**
  1. Delete app data
  2. Launch app
  3. Complete all onboarding screens
  4. Click "Sign Up"
  5. Enter email/password
  6. Verify account created in Supabase Auth
  7. Verify profile saved in `nutriai.profiles`
  8. Verify onboarding data cleared from AsyncStorage
  9. Verify redirected to (tabs)

- [ ] **Fresh Install → Onboarding → Sign-In → Dashboard**
  1. Delete app data
  2. Create account via web/CLI
  3. Launch app
  4. Complete onboarding
  5. Click "Sign In"
  6. Enter credentials
  7. Verify redirected to (tabs)
  8. Verify profile loaded correctly

- [ ] **Existing User → Sign-In → Dashboard**
  1. Sign out from (tabs)
  2. Sign in with existing credentials
  3. Verify profile loads from Supabase
  4. Verify no duplicate profile created

#### Phase 2: Error Handling (⚠️ Needs testing)

- [ ] **Network Timeout During Sign-Up**
  1. Disable network
  2. Attempt sign-up
  3. Verify error message appears
  4. Re-enable network
  5. Verify retry works

- [ ] **Network Timeout During Profile Save**
  1. Complete onboarding
  2. Disable network
  3. Click sign-up
  4. Wait for timeout
  5. Verify error message with retry option
  6. Re-enable network
  7. Click retry
  8. Verify profile saves

- [ ] **Supabase Auth Error (Invalid Email)**
  1. Complete onboarding
  2. Enter invalid email format
  3. Click sign-up
  4. Verify error message
  5. Fix email
  6. Verify retry works

- [ ] **Supabase Auth Error (Weak Password)**
  1. Complete onboarding
  2. Enter password < 6 chars
  3. Click sign-up
  4. Verify error message
  5. Enter strong password
  6. Verify retry works

- [ ] **Profile Save Failure (Validation Error)**
  1. Complete onboarding with invalid data
  2. Attempt sign-up
  3. Verify validation error
  4. Verify user can retry or continue

#### Phase 3: Edge Cases (⚠️ High priority)

- [ ] **Onboarding Data Lost During Sign-Up**
  1. Complete onboarding
  2. Kill app during sign-up
  3. Relaunch app
  4. Verify onboarding data still in AsyncStorage
  5. Complete sign-up
  6. Verify profile saved correctly

- [ ] **Duplicate Profile Creation**
  1. Complete onboarding
  2. Sign-up (don't wait for completion)
  3. Kill app
  4. Relaunch
  5. Verify only ONE profile in database

- [ ] **Session Expiration During Onboarding**
  1. Start onboarding
  2. Wait 24+ hours (or manually expire token)
  3. Complete onboarding
  4. Attempt sign-up
  5. Verify re-authentication works

- [ ] **Magic Link Sign-In**
  1. Complete onboarding
  2. Click "Send magic link"
  3. Verify email received
  4. Click link
  5. Verify signed in and redirected to (tabs)

- [ ] **OAuth (Google) Sign-In**
  1. Complete onboarding
  2. Click "Continue with Google"
  3. Complete Google auth flow
  4. Verify account created
  5. Verify profile created
  6. Verify redirected to (tabs)

- [ ] **Guest Sign-In**
  1. Complete onboarding
  2. Click "Continue as guest"
  3. Verify signed in anonymously
  4. Verify can access (tabs)
  5. Verify cannot access profile settings

#### Phase 4: Data Consistency (⚠️ Critical)

- [ ] **Profile Data Integrity**
  1. Complete onboarding with specific values:
     - Age: 30
     - Height: 180 cm
     - Weight: 75 kg
     - Activity: Moderate
     - Goal: Lose weight
  2. Sign-up
  3. Verify in Supabase:
     - `profiles.goals.age = 30`
     - `profiles.goals.height_cm = 180`
     - `profiles.goals.weight_kg = 75`
     - `profiles.goals.activity_level = 'moderately-active'`
     - `profiles.goals.goal_type = 'lose'`
  4. Verify calorie calculation correct (Mifflin-St Jeor)
  5. Verify macro targets correct (30/40/30)

- [ ] **Preferences Saved Correctly**
  1. Complete onboarding with:
     - Allergies: Peanuts, Shellfish
     - Dietary: Vegetarian
     - Dislikes: Mushrooms, Olives
  2. Sign-up
  3. Verify in Supabase:
     - `profiles.preferences.allergies = ['Peanuts', 'Shellfish']`
     - `profiles.preferences.dietary = 'vegetarian'`
     - `profiles.preferences.disliked_ingredients = ['Mushrooms', 'Olives']`

- [ ] **Calorie Calculation Accuracy**
  1. Test with known values:
     - Female, 25, 165cm, 65kg, Moderate activity, Lose weight
     - Expected: ~1800 maintenance, ~1300 deficit
  2. Verify calculation matches
  3. Test with extreme values to verify bounds

#### Phase 5: UI/UX (⚠️ Polish)

- [ ] **Loading States**
  - [ ] Sign-up button shows spinner during request
  - [ ] Sign-in button shows spinner during request
  - [ ] No double-submission possible
  - [ ] Loading state clears on error

- [ ] **Error Messages**
  - [ ] Error messages are clear and actionable
  - [ ] Error messages don't expose sensitive info
  - [ ] Error messages appear for all failure cases

- [ ] **Navigation**
  - [ ] Back button works on all screens
  - [ ] Cannot go back to onboarding after completion
  - [ ] Cannot access (tabs) without auth
  - [ ] Cannot access (auth) if already authenticated

- [ ] **Accessibility**
  - [ ] All buttons have accessibility labels
  - [ ] Form fields have labels
  - [ ] Error messages announced to screen readers
  - [ ] Keyboard navigation works

---

## Recommended Fixes (Priority Order)

### 🔴 Critical (Fix Before Launch)

1. **Fix Supabase client import path**
   - Verify `supabase/functions/_shared/supabaseClient.ts` exists
   - Or create proper client export in `utils/supabaseClient.ts`

2. **Prevent duplicate profile creation**
   - Modify `useUserProfile.ts` to check for onboarding data before creating default profile
   - Add flag to skip profile creation on first login if onboarding data exists

3. **Add network timeout handling**
   - Wrap all Supabase calls in timeout wrapper
   - Show user-friendly error with retry option

4. **Add profile save error recovery**
   - Implement retry UI in sign-up/sign-in
   - Allow user to manually retry profile save

### 🟡 High Priority (Fix Before Launch)

5. **Add comprehensive error logging**
   - Log all auth errors to Supabase for debugging
   - Include error codes, timestamps, user IDs

6. **Add analytics tracking**
   - Track onboarding completion rate
   - Track sign-up/sign-in success rate
   - Track profile save failures

7. **Add data validation on client**
   - Validate all user inputs before sending to Supabase
   - Show validation errors immediately

### 🟢 Medium Priority (Post-Launch)

8. **Add offline support**
   - Queue profile saves when offline
   - Sync when connection restored

9. **Add session recovery**
   - Detect expired sessions
   - Prompt user to re-authenticate

10. **Add analytics dashboard**
    - Monitor auth flow metrics
    - Alert on high error rates

---

## Files to Review/Modify

### Must Review
- ✅ `hooks/useAuth.ts` - Auth state management
- ✅ `app/_layout.tsx` - Navigation routing
- ✅ `app/(auth)/sign-up.tsx` - Sign-up flow
- ✅ `app/(auth)/sign-in.tsx` - Sign-in flow
- ✅ `hooks/useUserProfile.ts` - Profile persistence
- ✅ `utils/onboardingPersistence.ts` - Onboarding storage
- ✅ `utils/onboardingProfileIntegration.ts` - Data mapping

### Must Create/Update
- 📝 `utils/supabaseClient.ts` - Verify export path
- 📝 `utils/errorHandling.ts` - Centralized error handling
- 📝 `utils/timeoutWrapper.ts` - Network timeout handling
- 📝 `contexts/OnboardingContext.ts` - Verify onboarding completion check

---

## Environment Variables Required

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SUPABASE_REDIRECT_URL=nosh://auth-callback

# Development
EXPO_PUBLIC_DEV_BYPASS_AUTH=false
EXPO_PUBLIC_DEV_RESET_ONBOARDING=false
```

---

## Success Criteria

✅ **All tests pass**  
✅ **No console errors or warnings**  
✅ **Profile data matches onboarding input**  
✅ **Calorie calculations correct**  
✅ **Network errors handled gracefully**  
✅ **No duplicate profiles created**  
✅ **Onboarding data cleared after sign-up**  
✅ **Users can sign in after sign-up**  
✅ **Users can sign in with existing account**  
✅ **All error messages are user-friendly**  

---

## Next Steps

1. **Implement fixes** (Priority order above)
2. **Run full test suite** (Use checklist above)
3. **Load test** (100+ concurrent sign-ups)
4. **Monitor production** (First week after launch)

---

**Document Version:** 1.0  
**Last Updated:** October 22, 2025  
**Next Review:** After implementing fixes
