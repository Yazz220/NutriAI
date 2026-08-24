# Pre-Launch Audit

Running backlog of broken, missing, and rough-edge findings from code review and
simulator walkthroughs. Severity: **broken** (launch-blocking), **missing**
(expected feature absent), **friction** (hurts real use), **polish**.

Status legend: `[ ]` open · `[~]` in progress · `[x]` fixed

## Broken

- [ ] **No privacy policy / terms links** — `app/(book)/settings.tsx`. App Store
  review requires a privacy policy URL; nothing in-app either. Rejection risk.
- [ ] **Cookbook deletion has no UI** — `hooks/useCookbooks.ts` exposes
  `deleteCookbook`, but nothing calls it. Users can create books but never remove
  one. Needs a surface (shelf long-press or book menu) + confirmation dialog.
- [ ] **Chat fails silently offline** — `utils/cookbook/noshChatAdapter.ts`
  (~line 242). A message sent offline hangs up to the 60s timeout, then a generic
  error. Should detect offline up front and say so.
- [ ] **Error boundary is a dead end** — `components/ui/GlobalErrorBoundary.tsx`.
  No reload/recover action; shows raw component stack to users.
- [ ] **Reader page image failure = blank page** — `components/cookbook/PageCanvas.tsx`.
  `Image` has no `onError`; skeleton ("Page artwork is being prepared") has no
  retry. A failed/stuck generation leaves a silent blank page.
- [x] **Empty book reader is undesigned** — Fixed: a newly created book opens
  into its real reader with a focused "Add my first recipe" prompt routed
  through the existing Nosh capture workspace; the duplicate floating add
  action stays hidden until the book has pages.

## Missing

- [x] **Onboarding / first-run experience** — Added a skippable, user-scoped
  welcome; a short first-book studio with three coherent looks and progressively
  disclosed detail controls; an explicit read-only sample; and a direct handoff
  to the real empty book's first-recipe action. Native share receipts take
  precedence so onboarding never interrupts inbound work.
- [ ] **Camera capture in intake** — `UnifiedIntakeComposer` /
  `NoshCaptureWorkspace` only offer the photo library, though camera permission
  is declared in `app.json`.
- [ ] **Resend confirmation email** — not offered on sign-in when email is
  unconfirmed.
- [ ] **Auth callback errors are invisible** — `app/_layout.tsx` (~line 76)
  `console.warn`s and silently returns; user lands signed-out with no message.
- [ ] **Sign-in doesn't pre-fill email** — sign-up passes `params: { email }`
  (`app/(auth)/sign-up.tsx:52`) but `sign-in.tsx` never reads it.

## Friction

- [x] **Chat keyboard covers composer / no dismiss gesture** (user-reported) —
  Fixed: `Sheet` `KeyboardAvoidingView` changed from `behavior="height"` to
  `"padding"` so the bottom sheet lifts above the keyboard instead of shrinking
  proportionally; messages `FlatList` now has `keyboardDismissMode="interactive"`
  for scroll-to-dismiss; the conversation area is wrapped in a `Pressable` that
  calls `Keyboard.dismiss()` for tap-to-dismiss.
- [ ] **Silent photo-permission denial** — `UnifiedIntakeComposer.tsx` (~line 95)
  returns silently when library access is denied; `NoshComposer` alerts. Align.
- [ ] **Capture retry can't edit the source** — failed extraction retries the
  same source verbatim; a typo'd URL means starting over.
- [ ] **No stuck indication for long captures** — `isCaptureStale` (10 min)
  exists but the UI never surfaces it; `RecipeCaptureResume` auto-retries stale
  captures silently.
- [ ] **Generic chat tool-failure message** — `noshChatAdapter.ts` (~line 280):
  one fallback string for every failure mode.
- [ ] **Thread deletion has no undo** — `NoshThreadHistory.tsx` two-step confirm,
  but no recovery after.
- [ ] **Share receipt lacks offline retry** — `app/(book)/share.tsx` shows states
  but no reconnect/retry path.
- [ ] **Focus-change prompt may confuse** — opening chat on a different recipe
  mid-conversation triggers a focus prompt (`NoshConversationContext`).

## Polish

- [ ] No markdown rendering in chat messages (plain `Text` only).
- [ ] Analytics/Sentry are stubs — `utils/analytics.ts` TODOs (lines 23, 39, 55).
- [ ] Settings footer hardcodes `v0.1` — read from `Constants.expoConfig.version`.
- [ ] `app.json` declares `userInterfaceStyle: "automatic"` but there is no dark
  palette — iOS will ask for dark and get light. Either build dark mode or pin
  `light`.
- [ ] No Dynamic Type scaling anywhere.
- [ ] Long cookbook titles truncate without ellipsis affordance (shelf meta,
  spine).
- [ ] Create-book volume on shelf lacks a distinct accessibility label.
- [ ] Offline banner has no retry action; network poll interval is 15s.
- [ ] Capture polling is fixed 2.5s with no backoff.
- [ ] Landscape/tablet layouts unverified.

## Verified non-issues (audited, no action)

- Sign-up (email/Apple) navigation after success — the root auth guard
  (`app/_layout.tsx:188-206`) redirects on session change.
- "Cookbook not found" for empty books — shelf cache fallback keeps the reader
  open; the real gap is the undesigned empty book (see Broken).
