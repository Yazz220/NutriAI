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
- [x] **New cookbook page styles break first capture** — Fixed the live
  `cookbook_pages_style_id_check` drift so `illustrated`, `studio-editorial`,
  and `heritage` books can publish pages. Added the new style to the rollback
  capture-lifecycle proof and verified the original failed capture through
  page creation, generated art, and publication.
- [x] **Downstream capture retries repeat extraction** — Fixed: when extraction
  has already saved a RecipeGraph, a page-generation retry resumes from that
  durable graph instead of paying for and depending on another model call.
- [x] **Account deletion fails in the custom schema** — Fixed the cookbook
  cascade trigger to run as a narrowly scoped security-definer function with an
  empty search path. Supabase Auth can now delete a user whose default cookbook
  cascades through `nutriai`; verified with the disposable simulator account and
  a rollback-only SQL proof.

## Missing

- [x] **Onboarding / first-run experience** — Added a skippable, user-scoped
  welcome; a short first-book studio with three coherent looks and progressively
  disclosed detail controls; an explicit read-only sample; and a direct handoff
  to the real empty book's first-recipe action. The state now continues through
  the first real capture, durable processing, ready-page open, and a one-time
  reader introduction. A small in-book Nosh tip is deferred until a later visit,
  can be dismissed permanently, and opens the existing recipe-aware conversation.
  Native share receipts take precedence so onboarding never interrupts inbound work.
  Reader transitions now honor Reduce Motion, capture progress exposes spoken
  step state instead of relying on color, and image-backed generated pages expose
  canonical recipe content to VoiceOver. The authenticated first-book and
  first-page path is device-verified at an iOS accessibility text size with
  Reduce Motion enabled. RTL and localization walkthroughs remain before release.
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
- [x] **Open-ready-page action leaves Nosh sheet covering the reader** — Fixed:
  opening a completed capture now closes the persistent sheet before replacing
  the reader route.

## Polish

- [ ] No markdown rendering in chat messages (plain `Text` only).
- [ ] Analytics/Sentry are stubs — `utils/analytics.ts` TODOs (lines 23, 39, 55).
  First-book creation, first capture start, and first ready recipe open now emit
  stable event names through the shim; opening Nosh from its contextual tip is
  also identified. No production analytics transport exists.
- [ ] Settings footer hardcodes `v0.1` — read from `Constants.expoConfig.version`.
- [ ] `app.json` declares `userInterfaceStyle: "automatic"` but there is no dark
  palette — iOS will ask for dark and get light. Either build dark mode or pin
  `light`.
- [x] **Dynamic Type first-run path** — Device-verified welcome, shelf, creation
  studio, empty reader, capture composer, ready-page cue, and focused reader at
  iOS Accessibility XXL. Interface text scales with bounded multipliers and
  fixed-format physical-book typography stays inside its cover/page geometry.
  The capture composer now scrolls internally at a fixed height, and fixed
  reader prompts/toolbars remain operable without clipping.
- [ ] Long cookbook titles truncate without ellipsis affordance (shelf meta,
  spine).
- [x] Create-book volume on shelf has a distinct accessibility label.
- [x] Welcome and Nosh sheets isolate the background accessibility tree; iOS no
  longer exposes hidden shelf/reader controls through VoiceOver.
- [x] Retryable capture failures sanitize database implementation details before
  presenting user-facing copy.
- [x] Retired table-of-contents indexing no longer produces an impossible reader
  counter (`03 / 02`) when the first recipe enters single-page mode.
- [ ] Offline banner has no retry action; network poll interval is 15s.
- [ ] Capture polling is fixed 2.5s with no backoff.
- [ ] Landscape/tablet layouts unverified.

## Verified non-issues (audited, no action)

- Sign-up (email/Apple) navigation after success — the root auth guard
  (`app/_layout.tsx:188-206`) redirects on session change.
- "Cookbook not found" for empty books — shelf cache fallback keeps the reader
  open; the real gap is the undesigned empty book (see Broken).
