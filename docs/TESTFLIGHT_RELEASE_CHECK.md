# Folio build 15 release check

Use the TestFlight installation, version 1.0.0 (15), on a physical iPhone. Keep development builds separate. Record each result below; an unchecked item is not a pass.

## Purchases

1. Sign in with a test Folio account. Open Settings and the plan card. Capture a screenshot showing the monthly and annual choices, store prices, allowance, Restore purchases, and legal links. Use an actual app screenshot for subscription review.
2. Select monthly and start a purchase. Cancel Apple's sheet once: the app should remain Free without an error or lost draft.
3. Repeat and complete the sandbox purchase. Verify Settings shows Plus, 40 monthly designed pages, and the reset date. Confirm server entitlement and usage state before marking this passed.
4. Relaunch, open the plan sheet, and select Restore purchases. Plus should remain active without a second charge or duplicate resumed capture.
5. On a separate test account/test subscription state, verify the annual option too. Be aware that using the same App Store account can transfer purchases; do not use another real user's Folio account for this test.
6. Sign out and switch to an unrelated Free Folio account. Its plan must remain Free until an explicitly verified purchase or restore grants access.
7. Verify cancellation/expiration using Apple's sandbox subscription controls. Finished cookbooks remain readable after Plus ends. Confirm real purchase/renewal events reach the working RevenueCat webhook and are processed by Supabase.

| Check | Result | Evidence |
|---|---|---|
| Monthly purchase | Pending | |
| Annual purchase | Pending | |
| Cancel purchase | Pending | |
| Restore after relaunch | Pending | |
| Server entitlement/40-page allowance | Pending | |
| Account switch isolation | Pending | |
| Expiration retains finished books | Pending | |
| Real webhook event processed | Pending | |

## Core app

Use a disposable account for destructive tests. Keep the App Review account available for Apple.

| Check | Expected behavior | Result |
|---|---|---|
| Fresh sign-up and email confirmation | Confirmation opens Folio and sign-in succeeds | Pending |
| Sign in with Apple | Sign-in succeeds and restores the same account | Pending |
| Text recipe capture | Consent precedes external AI; a readable finished page appears | Pending |
| Link and photo capture | Captures enter the same durable pipeline and finish or show recoverable errors | Pending |
| Native Share to Folio | Browser/Photos share works when app is closed and already open; no duplicates | Pending |
| Reader | Shelf, page swipes, focused reading, background/foreground restoration work | Pending |
| Ask Folio | Contextual answer and a capture tool turn work; cancel/close/reopen does not crash | Pending |
| Offline recovery | Existing content remains available and failed work can resume | Pending |
| Larger text and VoiceOver | Controls remain usable and focus/order are understandable | Pending |
| Account deletion | Disposable account and its content are removed; login no longer succeeds | Pending |

Simple text fixture for a capture:

> Lemon cucumber salad. Serves 2. Preparation time 10 minutes. Ingredients: 1 cucumber, 1 tablespoon lemon juice, 1 tablespoon olive oil, and 1/4 teaspoon salt. Wash and dice the cucumber. Whisk lemon juice, olive oil, and salt in a bowl. Toss with cucumber and serve immediately.

## Reviewer account

- Create a dedicated confirmed email/password account with an address controlled by the owner.
- Add a sample cookbook and a finished recipe through `capture-recipe`; do not bypass the product pipeline by inserting a fake finished page.
- Verify the credentials in the TestFlight app, then put the password only in Apple's secure review fields.
- Use `metadata/review/notes.txt` for the notes field; it contains no password.
- Leave the account intact and available throughout review.
