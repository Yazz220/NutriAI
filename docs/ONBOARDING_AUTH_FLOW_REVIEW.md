# Onboarding & Authentication Flow Review

**Review Date**: 2025-10-04  
**Status**: Issues Identified - Fix Plan Created

---

## Executive Summary

Conducted a comprehensive functional review of the user experience from onboarding through authentication. Identified **7 critical issues** affecting data persistence, state synchronization, and user flow continuity.

### Key Findings
- ✅ **Working**: Auth state management, session handling, onboarding navigation
- ⚠️ **Issues**: Profile data persistence, onboarding-to-auth transition, empty profile fields in database
- 🔴 **Critical**: User profile data not properly saved to Supabase after onboarding completion

---

## Architecture Overview

### Flow Sequence
```
1. App Launch (app/_layout.tsx)
   ↓
2. Check onboarding completion (AsyncStorage: 'onboarding_completed')
   ↓
3A. Not completed → /(onboarding)/welcome
3B. Completed → Check auth session
   ↓
4A. Not authenticated → /(auth)/sign-in
4B. Authenticated → /(tabs)
   ↓
5. Load user profile from Supabase (nutriai.profiles)
```

### Key Components
- **Auth**: `hooks/useAuth.ts` - Session management via Supabase
- **Profile**: `hooks/useUserProfile.ts` - Profile CRUD with React Query + AsyncStorage
- **Onboarding**: `contexts/OnboardingContext.tsx` - Onboarding state management
- **Persistence**: `utils/onboardingPersistence.ts` - AsyncStorage operations
- **Integration**: `utils/onboardingProfileIntegration.ts` - Maps onboarding → profile

---

## Issues Identified

### 🔴 CRITICAL: Issue #1 - Empty Profile Data in Database
**Severity**: Critical  
**Impact**: User onboarding data not persisted to database

**Problem**:
- Database query shows profiles with empty `goals: {}` and minimal `preferences`
- Onboarding completion calls `completeOnboarding()` → `saveProfile(profileData)`
- However, `useUserProfile` is wrapped in root providers but onboarding flow happens BEFORE authentication
- Profile save likely fails silently for unauthenticated users

**Evidence**:
```typescript
// contexts/OnboardingContext.tsx:111
if (user) {
  await saveProfile(profileData);  // Only saves if authenticated
}
// But onboarding happens BEFORE sign-in!
```

**Root Cause**: Onboarding completes → user signs up → profile already created with defaults (empty) → onboarding data never merged

---

### ⚠️ Issue #2 - Onboarding-to-Auth Transition Gap
**Severity**: High  
**Impact**: Broken data flow between onboarding and authentication

**Problem**:
1. User completes onboarding → `markOnboardingCompleted()` sets flag
2. User redirected to `/(tabs)` from `other-restrictions.tsx:44`
3. Root layout detects onboarding complete + no session → redirects to `/(auth)/sign-in`
4. User signs up → creates NEW empty profile in database
5. Onboarding data remains in AsyncStorage, never synced to Supabase

**Expected Flow**:
```
Onboarding Complete → Auth Screen → Sign Up → Merge Onboarding Data → Create Profile
```

**Actual Flow**:
```
Onboarding Complete → Auth Screen → Sign Up → Empty Profile Created ❌
```

---

### ⚠️ Issue #3 - Profile Data Not Synced After Sign-Up
**Severity**: High  
**Impact**: First-time users lose onboarding preferences

**Problem**:
- `sign-up.tsx` creates auth user but doesn't trigger profile sync
- `useUserProfile` auto-creates empty profile on first query (line 108-126)
- No mechanism to detect "user just signed up after onboarding" and merge data

**Missing Logic**:
```typescript
// After successful sign-up in app/(auth)/sign-up.tsx
// Should check for completed onboarding data and sync it
const onboardingData = await loadOnboardingData();
if (onboardingData) {
  await saveProfile(mapOnboardingToProfile(onboardingData));
  await clearOnboardingData();
}
```

---

### ⚠️ Issue #4 - Basic Profile Fields Not Captured
**Severity**: Medium  
**Impact**: Missing age, height, weight, gender in profile

**Problem**:
- `UserBasics` interface has `age`, `heightCm`, `weightKg`, `sex` fields
- Onboarding captures these in `basicProfile` section
- `OnboardingProfileIntegration.mapBasicProfile()` only maps these fields
- BUT database schema only has `display_name` in the profiles table
- The `goals` JSONB column should contain basic metrics, but mapping doesn't include them

**Database Schema**:
```
nutriai.profiles:
- user_id (uuid)
- display_name (text)  
- units (text)
- goals (jsonb)  ← Should contain age, height, weight, activity
- preferences (jsonb)
- created_at (timestamptz)
```

**Mapping Issue**: `mapBasicProfile()` creates `UserBasics` object but it's not saved to `goals` JSONB

---

### ⚠️ Issue #5 - AsyncStorage-Only State During Onboarding
**Severity**: Medium  
**Impact**: Data loss risk if app crashes or user switches devices

**Problem**:
- Onboarding data stored only in AsyncStorage during flow
- No server-side backup until completion
- If user closes app or switches devices mid-onboarding, progress lost

**Current Behavior**:
- Data persists locally only
- No draft profile created in database
- Recovery impossible after device switch

---

### ⚠️ Issue #6 - Profile Fetch Race Condition
**Severity**: Low  
**Impact**: Potential state inconsistency on slow connections

**Problem**:
- `useUserProfile` loads from AsyncStorage immediately (line 71)
- Then fetches from Supabase via React Query (line 162-168)
- If AsyncStorage has stale data and Supabase fetch is slow, UI shows outdated info briefly

**Code**:
```typescript
// Line 68: Loads cached profile from AsyncStorage
useEffect(() => {
  const cached = await AsyncStorage.getItem(STORAGE_KEY);
  setProfile(cached); // Shows immediately
}, []);

// Line 162: Fetches from Supabase (may be slow)
const { data } = useQuery({ queryFn: fetchProfile, enabled: !!session });
```

---

### ⚠️ Issue #7 - No Onboarding Re-completion Handler
**Severity**: Low  
**Impact**: Users can't easily update initial preferences

**Problem**:
- Once onboarding marked complete, no way to re-enter flow
- Users must manually update each field in profile/settings
- No "re-run onboarding" option in production (only dev reset)

**User Impact**:
- Changed mind about goals? Must manually update
- Want to recalculate calories? Must re-enter all data
- No guided experience for profile updates

---

## Data Flow Analysis

### Current Onboarding Data Structure
```typescript
OnboardingData {
  healthGoal: 'lose-weight' | 'gain-weight' | 'maintain-weight' | 'custom' | null
  basicProfile: {
    age?: number
    height?: number  // cm
    weight?: number  // kg
    activityLevel?: string  // 'sedentary' | 'lightly-active' | ...
    targetWeight?: number
    gender?: string
  }
  dietaryPreferences: {
    restrictions: string[]  // ['vegan', 'gluten-free', ...]
    allergies: string[]
    customRestrictions: string[]
  }
  goalPreferences?: {
    goalType: 'lose' | 'gain' | 'maintain' | null
    recommendedCalories?: number
    recommendedMacros?: { protein, carbs, fats }
    useCustomCalories: boolean
    customCalorieTarget?: number
    customMacroTargets?: { protein, carbs, fats }
  }
  customGoal?: {
    title: string
    goalType: GoalDirection
    motivation?: string
  }
  healthConcerns?: string[]
  completedAt?: string
}
```

### Database Profile Structure
```sql
-- nutriai.profiles table
CREATE TABLE profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  display_name text,
  units text DEFAULT 'metric',
  goals jsonb DEFAULT '{}',  -- Should contain: age, height, weight, calories, macros, activity
  preferences jsonb DEFAULT '{}',  -- Should contain: dietary, allergies, disliked ingredients
  created_at timestamptz DEFAULT now()
);
```

### Mapping Gaps
| Onboarding Field | Profile Field | Status |
|-----------------|---------------|--------|
| `basicProfile.age` | `goals.age` | ❌ Not mapped |
| `basicProfile.height` | `goals.height_cm` | ❌ Not mapped |
| `basicProfile.weight` | `goals.weight_kg` | ❌ Not mapped |
| `basicProfile.gender` | `basics.sex` | ❌ Not in DB schema |
| `basicProfile.activityLevel` | `goals.activity_level` | ✅ Mapped |
| `goalPreferences.recommendedCalories` | `goals.daily_calories` | ✅ Mapped |
| `dietaryPreferences.restrictions` | `preferences.dietary` | ⚠️ Partial (array → single value) |
| `dietaryPreferences.allergies` | `preferences.allergies` | ✅ Mapped |

---

## Fix Plan

### Phase 1: Critical Fixes (Data Persistence)

#### Fix 1.1: Post-SignUp Profile Sync
**File**: `app/(auth)/sign-up.tsx`  
**Priority**: Critical

**Implementation**:
```typescript
// After successful sign-up (line 28-34)
const { data, error: authError } = await supabase.auth.signUp({ email, password });
if (authError) throw authError;

// NEW: Check for completed onboarding data and sync
if (data?.user && data?.session) {
  const onboardingData = await OnboardingPersistenceManager.loadOnboardingData();
  if (onboardingData) {
    const profileData = OnboardingProfileIntegration.mapOnboardingToProfile(onboardingData);
    // Wait for profile to be created, then update it
    await saveProfile(profileData);
    await OnboardingPersistenceManager.clearOnboardingData();
  }
}
```

**Dependencies**:
- Import `OnboardingPersistenceManager` and `OnboardingProfileIntegration`
- Import `useUserProfile` hook
- Handle async properly

---

#### Fix 1.2: Improve Profile Mapping
**File**: `utils/onboardingProfileIntegration.ts`  
**Priority**: Critical

**Changes**:
1. Update `mapBasicProfile()` to include ALL fields in the returned object
2. Ensure `mapOnboardingToProfile()` merges basic profile into `goals` JSONB
3. Add proper snake_case to camelCase conversions

**Implementation**:
```typescript
private static mapBasicProfile(basicProfile: OnboardingData['basicProfile']): Partial<UserBasics> {
  return {
    name: undefined, // Will be set during auth
    age: basicProfile.age,
    sex: this.mapGenderToSex(basicProfile.gender),
    heightCm: basicProfile.height,
    weightKg: basicProfile.weight
  };
}

static mapOnboardingToProfile(data: OnboardingData): Partial<UserProfileState> {
  // ... existing code ...
  
  return {
    basics: this.mapBasicProfile(basicProfile),
    goals: {
      ...this.mapGoalsProfile({...}),
      // MERGE basic profile metrics into goals for DB storage
      age: basicProfile.age,
      heightCm: basicProfile.height,
      weightKg: basicProfile.weight,
      targetWeightKg: basicProfile.targetWeight,
    },
    preferences: this.mapPreferencesProfile(dietaryPreferences)
  };
}
```

---

#### Fix 1.3: Update Profile Save Logic
**File**: `hooks/useUserProfile.ts`  
**Priority**: Critical

**Changes**:
1. Update `toRow()` function to properly serialize basic metrics into `goals` JSONB
2. Add snake_case mapping for all fields
3. Ensure `fetchProfile()` properly deserializes metrics

**Implementation**:
```typescript
const toRow = (state: UserProfileState | SaveInput) => ({
  user_id: user?.id,
  display_name: state.basics?.name ?? null,
  units: state.metrics?.unitSystem ?? 'metric',
  goals: {
    // Basic metrics
    age: state.basics?.age,
    height_cm: state.basics?.heightCm,
    weight_kg: state.basics?.weightKg,
    // Goal data
    daily_calories: state.goals?.dailyCalories,
    protein_target_g: state.goals?.proteinTargetG,
    carbs_target_g: state.goals?.carbsTargetG,
    fats_target_g: state.goals?.fatsTargetG,
    goal_type: state.goals?.goalType,
    activity_level: state.goals?.activityLevel,
    // ... rest of goals
  },
  preferences: {
    allergies: state.preferences?.allergies ?? [],
    dietary: state.preferences?.dietary,
    disliked_ingredients: state.preferences?.dislikedIngredients ?? [],
    preferred_cuisines: state.preferences?.preferredCuisines ?? [],
  },
});
```

---

### Phase 2: Flow Improvements

#### Fix 2.1: Redirect After Onboarding
**File**: `app/(onboarding)/other-restrictions.tsx`  
**Priority**: High

**Changes**:
- Don't redirect to `/(tabs)` immediately
- Redirect to `/(auth)/sign-in` with flag indicating onboarding complete
- Let root layout handle final navigation

**Implementation**:
```typescript
const handleFinish = async () => {
  if (finishing) return;
  try {
    setFinishing(true);
    await completeOnboarding();
    // NEW: Redirect to auth instead of tabs
    router.replace('/(auth)/sign-in?onboarding_complete=true');
  } catch (error) {
    Alert.alert('Unable to finish', 'Something went wrong. Please try again.');
    setFinishing(false);
  }
};
```

---

#### Fix 2.2: Sign-In Profile Sync
**File**: `app/(auth)/sign-in.tsx`  
**Priority**: High

**Changes**:
- Check for onboarding data after successful sign-in
- Sync data to profile if present
- Show success toast

**Implementation**:
```typescript
// After successful sign-in (line 38-52)
if (!data?.session) { /* error handling */ }

// NEW: Sync onboarding data if present
const onboardingData = await OnboardingPersistenceManager.loadOnboardingData();
if (onboardingData) {
  const profileData = OnboardingProfileIntegration.mapOnboardingToProfile(onboardingData);
  await saveProfile(profileData);
  await OnboardingPersistenceManager.clearOnboardingData();
  showToast({ message: 'Welcome back! Your profile has been updated.', type: 'success' });
}

router.replace('/(tabs)');
```

---

### Phase 3: Data Integrity & UX

#### Fix 3.1: Add Profile Validation
**File**: `hooks/useUserProfile.ts`  
**Priority**: Medium

**Changes**:
- Add validation before saving to database
- Check for required fields
- Provide helpful error messages

**Implementation**:
```typescript
const validateProfile = (profile: Partial<UserProfileState>): string[] => {
  const errors: string[] = [];
  
  if (profile.goals?.dailyCalories && profile.goals.dailyCalories < 1000) {
    errors.push('Daily calories must be at least 1000');
  }
  
  if (profile.basics?.age && (profile.basics.age < 13 || profile.basics.age > 120)) {
    errors.push('Age must be between 13 and 120');
  }
  
  // Add more validations as needed
  return errors;
};

// Use in saveMutation
mutationFn: async (patch: SaveInput) => {
  if (!user) throw new Error('Not authenticated');
  
  const next = { /* build next state */ };
  const errors = validateProfile(next);
  if (errors.length > 0) {
    throw new Error(`Invalid profile data: ${errors.join(', ')}`);
  }
  
  // Continue with save...
}
```

---

#### Fix 3.2: Improve Error Handling
**Files**: `contexts/OnboardingContext.tsx`, `app/(auth)/*.tsx`  
**Priority**: Medium

**Changes**:
- Add detailed error logging
- Show user-friendly error messages
- Implement retry logic for network failures

---

#### Fix 3.3: Add Data Migration Script
**File**: `scripts/migrate-onboarding-profiles.ts` (NEW)  
**Priority**: Low

**Purpose**: One-time script to migrate existing users with empty profiles

**Implementation**:
```typescript
// Script to backfill empty profiles
// Run once after deploying fixes
async function migrateEmptyProfiles() {
  // 1. Query all profiles with empty goals
  // 2. Check if they have onboarding data in AsyncStorage (unlikely)
  // 3. Set default values based on account creation date
  // 4. Update profiles table
}
```

---

### Phase 4: Testing & Verification

#### Test Cases

**TC-1: New User - Full Onboarding Flow**
```
1. Open app (fresh install)
2. Complete onboarding (all 12 steps)
3. Tap "Finish" on health concerns screen
4. Verify redirect to sign-in
5. Sign up with email/password
6. Verify redirect to tabs
7. Check database: profile should have all onboarding data
8. Verify AsyncStorage: onboarding data cleared
```

**TC-2: Existing User - Sign In**
```
1. Complete onboarding
2. Sign in with existing account
3. Verify profile data synced from onboarding
4. Verify all preferences reflected in app
```

**TC-3: Guest Mode - Onboarding**
```
1. Complete onboarding
2. Continue as guest
3. Verify app works with local data
4. Later: Sign up
5. Verify profile created with onboarding data
```

**TC-4: Profile Data Persistence**
```
1. Complete onboarding + sign up
2. Close app
3. Reopen app
4. Verify: Age, height, weight, goals, preferences all displayed correctly
5. Check database: All fields populated
```

**TC-5: Network Failure Handling**
```
1. Complete onboarding
2. Disable network
3. Tap "Finish"
4. Verify: Clear error message, retry option
5. Enable network
6. Retry
7. Verify: Success, data saved
```

---

## Implementation Timeline

### Sprint 1 (Days 1-2): Critical Fixes
- ✅ Fix 1.1: Post-SignUp Profile Sync
- ✅ Fix 1.2: Improve Profile Mapping
- ✅ Fix 1.3: Update Profile Save Logic
- ✅ TC-1: Test new user flow

### Sprint 2 (Days 3-4): Flow Improvements
- ✅ Fix 2.1: Redirect After Onboarding
- ✅ Fix 2.2: Sign-In Profile Sync
- ✅ TC-2, TC-3: Test existing user and guest flows

### Sprint 3 (Day 5): Data Integrity
- ✅ Fix 3.1: Add Profile Validation
- ✅ Fix 3.2: Improve Error Handling
- ✅ TC-4, TC-5: Test persistence and error handling

### Sprint 4 (Day 6): Backlog
- ⏳ Fix 3.3: Data Migration Script
- ⏳ Issue #7: Add "Update Profile" guided flow

---

## Success Metrics

### Must Haves (MVP)
- ✅ 100% of onboarding data persisted to database after sign-up
- ✅ No empty `goals` or `preferences` fields for new users
- ✅ Sign-up → Profile creation works on first try
- ✅ Onboarding data cleared after successful sync

### Nice to Haves
- ⏳ Profile validation prevents invalid data
- ⏳ Retry logic handles network failures gracefully
- ⏳ Migration script backfills existing users
- ⏳ User can re-run onboarding to update preferences

---

## Risk Assessment

### High Risk
- **Data Loss**: If profile sync fails silently, user loses onboarding data
  - Mitigation: Add comprehensive logging + error alerts
- **Race Conditions**: AsyncStorage → Supabase → UI state conflicts
  - Mitigation: Ensure sequential async operations, use React Query

### Medium Risk
- **Breaking Changes**: Profile structure changes affect existing users
  - Mitigation: Add migration logic, test with sample data
- **Network Failures**: User completes onboarding offline
  - Mitigation: Queue profile sync, retry on next app open

### Low Risk
- **Schema Changes**: Adding new fields to profiles table
  - Mitigation: Use JSONB columns, backward compatible

---

## Appendix

### Related Files
- `app/_layout.tsx` - Root navigation logic
- `app/(auth)/sign-in.tsx` - Sign-in flow
- `app/(auth)/sign-up.tsx` - Sign-up flow
- `app/(onboarding)/other-restrictions.tsx` - Final onboarding step
- `contexts/OnboardingContext.tsx` - Onboarding state management
- `hooks/useAuth.ts` - Auth state
- `hooks/useUserProfile.ts` - Profile CRUD
- `utils/onboardingPersistence.ts` - AsyncStorage operations
- `utils/onboardingProfileIntegration.ts` - Data mapping

### Database Schema
```sql
-- Current schema (nutriai.profiles)
CREATE TABLE nutriai.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id),
  display_name text,
  units text DEFAULT 'metric',
  goals jsonb DEFAULT '{}',
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Recommended goals JSONB structure:
{
  "age": 28,
  "height_cm": 175,
  "weight_kg": 70,
  "target_weight_kg": 65,
  "daily_calories": 1800,
  "protein_target_g": 120,
  "carbs_target_g": 180,
  "fats_target_g": 60,
  "goal_type": "lose",
  "activity_level": "moderate",
  "health_goal_key": "lose-weight"
}

-- Recommended preferences JSONB structure:
{
  "allergies": ["peanuts", "shellfish"],
  "dietary": "vegetarian",
  "disliked_ingredients": ["cilantro"],
  "preferred_cuisines": ["italian", "mexican"]
}
```

---

## Conclusion

The onboarding and authentication flow is architecturally sound but suffers from a **critical data persistence gap**: onboarding data is not properly synced to the database after sign-up. This results in empty profile records and a broken user experience.

The proposed fix plan addresses this by:
1. **Immediately after sign-up**: Sync onboarding data to profile
2. **Improve data mapping**: Ensure ALL onboarding fields are saved
3. **Better error handling**: Catch and surface failures
4. **Comprehensive testing**: Verify all user paths work correctly

**Estimated effort**: 6 days (3 sprints)  
**Impact**: Resolves 7 identified issues, dramatically improves first-time user experience

---

**Next Steps**: Begin Phase 1 implementation (Critical Fixes)
