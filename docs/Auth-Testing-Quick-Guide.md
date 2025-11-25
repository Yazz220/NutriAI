# Authentication Testing - Quick Reference Guide

**Quick checklist for testing authentication before launch**

---

## 🚀 Quick Start Testing

### Test 1: Fresh User Sign-Up (5 min)
```
1. Delete app / Clear data
2. Launch app
3. Complete onboarding (enter real data)
4. Click "Sign Up"
5. Enter email: test+[timestamp]@example.com
6. Enter password: TestPass123
7. Confirm password: TestPass123
8. Click "Create Account"

✅ Expected: Redirected to dashboard
✅ Check: Profile data matches onboarding input
✅ Check: No duplicate profiles in Supabase
```

### Test 2: Existing User Sign-In (2 min)
```
1. Sign out from dashboard
2. Click "Sign In"
3. Enter email from Test 1
4. Enter password: TestPass123
5. Click "Sign In"

✅ Expected: Redirected to dashboard
✅ Check: Profile data loaded correctly
✅ Check: No errors in console
```

### Test 3: Network Timeout (3 min)
```
1. Enable airplane mode
2. Complete onboarding
3. Click "Sign Up"
4. Enter credentials
5. Click "Create Account"

✅ Expected: "Connection timeout" error after 30s
✅ Expected: Error message is user-friendly
✅ Check: App doesn't freeze
```

### Test 4: Profile Sync Retry (3 min)
```
1. Complete onboarding
2. Enable airplane mode
3. Sign up (will fail)
4. Disable airplane mode
5. Click "Retry" on error alert

✅ Expected: Profile syncs successfully
✅ Expected: "Success" message shown
✅ Expected: Redirected to dashboard
```

---

## 🔍 Detailed Test Scenarios

### Validation Tests (5 min)

#### Empty Fields
```
1. Click "Sign Up" without entering anything
Expected: "Please enter email and password"
```

#### Password Mismatch
```
1. Enter email: test@example.com
2. Enter password: Pass123
3. Enter confirm: Pass456
4. Click "Create Account"
Expected: "Passwords do not match"
```

#### Weak Password
```
1. Enter email: test@example.com
2. Enter password: 12345
3. Click "Create Account"
Expected: "Password must be at least 6 characters"
```

#### Invalid Email
```
1. Enter email: notanemail
2. Enter password: Pass123
3. Click "Create Account"
Expected: Supabase error about invalid email
```

### Error Handling Tests (10 min)

#### Duplicate Email
```
1. Sign up with email: existing@example.com
Expected: "This email is already registered. Please sign in instead."
```

#### Wrong Password
```
1. Sign in with correct email
2. Enter wrong password
3. Click "Sign In"
Expected: "Invalid email or password. Please try again."
```

#### Email Not Confirmed
```
1. Sign up with new email (if email confirmation enabled)
2. Try to sign in before confirming
Expected: "Please confirm your email before signing in."
```

### Edge Case Tests (15 min)

#### Kill App During Sign-Up
```
1. Complete onboarding
2. Click "Sign Up"
3. Force close app immediately
4. Reopen app
Expected: Onboarding data still in AsyncStorage
Expected: Can complete sign-up
```

#### Kill App During Profile Sync
```
1. Complete onboarding
2. Sign up
3. Force close during "Syncing..." (if visible)
4. Reopen app
Expected: Can sign in
Expected: Profile sync retries
```

#### Multiple Rapid Sign-Ups
```
1. Complete onboarding
2. Click "Sign Up" rapidly 5 times
Expected: Only one account created
Expected: No duplicate profiles
```

---

## 📊 Data Verification

### Check Profile Data in Supabase

**After each sign-up, verify in Supabase Studio:**

```sql
-- Check profile exists
SELECT * FROM nutriai.profiles WHERE user_id = 'USER_ID_HERE';

-- Check no duplicates
SELECT user_id, COUNT(*) 
FROM nutriai.profiles 
GROUP BY user_id 
HAVING COUNT(*) > 1;

-- Verify profile data
SELECT 
  user_id,
  goals->>'age' as age,
  goals->>'height_cm' as height,
  goals->>'weight_kg' as weight,
  goals->>'daily_calories' as calories,
  goals->>'goal_type' as goal
FROM nutriai.profiles
WHERE user_id = 'USER_ID_HERE';
```

### Check AsyncStorage

**After sign-up, verify onboarding data cleared:**

```javascript
// In React Native Debugger or console
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check onboarding data
AsyncStorage.getItem('onboarding_data').then(console.log);
// Expected: null (after successful sign-up)

// Check onboarding completed
AsyncStorage.getItem('onboarding_completed').then(console.log);
// Expected: {"completed":true,"completedAt":"..."}
```

---

## 🐛 Common Issues & Solutions

### Issue: "Connection timeout"
**Cause:** Network too slow or offline  
**Fix:** Check internet, retry after a few seconds  
**Test:** Enable/disable airplane mode

### Issue: "Profile save timeout"
**Cause:** Database write taking too long  
**Fix:** Click "Retry" button  
**Test:** Check Supabase status page

### Issue: Stuck on loading
**Cause:** Timeout not working properly  
**Fix:** Force close and reopen app  
**Report:** This shouldn't happen - file bug report

### Issue: Duplicate profiles
**Cause:** Race condition in profile creation  
**Fix:** Should be fixed by recent changes  
**Test:** Check database for duplicates

### Issue: Profile data missing
**Cause:** Profile sync failed silently  
**Fix:** User can update in Settings  
**Test:** Verify retry mechanism works

---

## 📱 Device-Specific Testing

### iOS Testing
```
1. Test on iPhone (physical device)
2. Test on iPad
3. Test on iOS Simulator
4. Test with Face ID/Touch ID (if implemented)
5. Test with VPN enabled
6. Test with cellular data only
```

### Android Testing
```
1. Test on Android phone (physical device)
2. Test on Android tablet
3. Test on Android Emulator
4. Test with fingerprint (if implemented)
5. Test with VPN enabled
6. Test with mobile data only
```

---

## 🎯 Success Criteria

### Must Pass (Critical)
- [ ] Fresh user can sign up and reach dashboard
- [ ] Existing user can sign in and reach dashboard
- [ ] No duplicate profiles created
- [ ] Profile data matches onboarding input
- [ ] Calorie calculations correct
- [ ] Network timeouts handled gracefully
- [ ] All error messages user-friendly
- [ ] Retry mechanism works

### Should Pass (Important)
- [ ] Password validation works
- [ ] Email validation works
- [ ] Loading states show correctly
- [ ] Error messages clear on retry
- [ ] Can continue if profile sync fails
- [ ] Onboarding data cleared after sign-up

### Nice to Have (Polish)
- [ ] Smooth animations
- [ ] No console errors
- [ ] Fast response times (<2s)
- [ ] Clear progress indicators

---

## 📝 Test Report Template

```markdown
## Auth Flow Test Report

**Date:** [DATE]
**Tester:** [NAME]
**Device:** [DEVICE MODEL]
**OS:** [iOS/Android VERSION]
**Build:** [APP VERSION]

### Test Results

#### Happy Path
- [ ] Fresh sign-up: PASS / FAIL
- [ ] Existing sign-in: PASS / FAIL
- [ ] Profile data correct: PASS / FAIL

#### Error Handling
- [ ] Network timeout: PASS / FAIL
- [ ] Invalid credentials: PASS / FAIL
- [ ] Weak password: PASS / FAIL

#### Edge Cases
- [ ] Kill during sign-up: PASS / FAIL
- [ ] Duplicate email: PASS / FAIL
- [ ] No internet: PASS / FAIL

### Issues Found
1. [Issue description]
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Screenshot/video

### Notes
[Any additional observations]
```

---

## 🚨 Critical Bugs to Watch For

1. **App freezes** during sign-up/sign-in
2. **Duplicate profiles** in database
3. **Profile data mismatch** with onboarding
4. **Infinite loading** states
5. **Silent failures** (no error shown)
6. **Data loss** (onboarding data disappears)
7. **Session issues** (logged out unexpectedly)

---

## ✅ Pre-Launch Checklist

Before launching to production:

- [ ] All critical tests pass
- [ ] Tested on iOS physical device
- [ ] Tested on Android physical device
- [ ] Tested with slow network (3G)
- [ ] Tested with no network (airplane mode)
- [ ] Verified no duplicate profiles
- [ ] Verified profile data accuracy
- [ ] Verified calorie calculations
- [ ] Verified error messages clear
- [ ] Verified retry mechanism works
- [ ] Environment variables set correctly
- [ ] Supabase project configured correctly
- [ ] Database schema up to date
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Code reviewed
- [ ] Documentation updated

---

**Quick Tip:** Run through all "Happy Path" tests first. If those pass, proceed to error handling and edge cases.

**Time Estimate:** 
- Quick tests: ~15 minutes
- Full test suite: ~45 minutes
- Device-specific: +30 minutes per platform

---

**Last Updated:** October 22, 2025
