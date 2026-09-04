# App Store Review Notes & Submission Guide

This document contains the exact information and credentials to enter into **App Store Connect** under **App Review Information** when submitting Folio for review.

---

## 1. Sign-In Credentials (Guideline 2.1 Compliance)

In App Store Connect, configure the **Sign-in information** section as follows:

* **Sign-in required**: `Yes` (checked)
* **User name**: `reviewer@folio.app` (or your created demo account)
* **Password**: `FolioReview2026!`

> **Pre-submission Step**:
> Before submitting the build, ensure this account exists in your Supabase Auth dashboard (`Users` table) with:
> 1. `Email Confirmed`: `True`
> 2. 1–2 cookbooks created on this account containing generated recipe pages so the reviewer can immediately browse and test the 3D book reader without having to import their own recipes first.

---

## 2. Notes for App Reviewer (Copy & Paste into App Store Connect)

```text
Welcome to Folio — the book-first personal cookbook app.

DEMO ACCOUNT CREDENTIALS:
Username: reviewer@folio.app
Password: FolioReview2026!

KEY FEATURES & TESTING WALKTHROUGH:
1. THE COOKBOOK SHELF & READER:
   - Upon signing in, you will land on the digital bookshelf containing pre-created cookbooks.
   - Tap any cookbook to open the 3D book reader.
   - Swipe horizontally to turn pages with real paper curl physics.
   - Tap any recipe page to enter single-page focused reading view.
   - Tap the top-right button while in reader mode to access the table of contents or recipe options (Export PDF, Share, Redesign, Edit).

2. RECIPE CAPTURE & IMPORT:
   - Tap the "+" button inside an open book or on the shelf to add a new recipe.
   - Folio accepts text recipes, public recipe URLs, or photos from your library or camera.
   - Note: Camera and Photo Library permissions are only requested when you tap to take a photo or select an image from your library.

3. PERSISTENT AI ASSISTANT (FOLIO):
   - Tap the Folio chef icon in the navigation bar to open the kitchen assistant.
   - You can ask questions about the currently open recipe (e.g., "What can I substitute for miso?"), convert units, or request adjustments.

4. IN-APP PURCHASES & SUBSCRIPTION (FOLIO PLUS):
   - The app includes an auto-renewable subscription: "Folio Plus" (Monthly and Annual).
   - You can test purchase and restore flows via the StoreKit Sandbox environment.
   - Tap the account settings icon on the shelf -> "Subscription" to open the Paywall.
   - The Paywall includes clear auto-renewal terms, links to Terms of Use and Privacy Policy, and a "Restore purchases" button.

5. ACCOUNT DELETION (GUIDELINE 5.1.1):
   - In accordance with App Store guidelines, users can permanently delete their account and all associated data at any time.
   - To test: Go to Settings (gear icon on the shelf) -> "Delete account". Two explicit confirmation prompts prevent accidental deletion before permanent removal.

CONTACT INFORMATION:
If you have any questions or require additional information during review, please contact us at support@nutriai.app.
```

---

## 3. Privacy & Permission Usage Disclosures (for App Privacy Details)

| Permission | Purpose | Where Used |
|---|---|---|
| **Camera** (`NSCameraUsageDescription`) | App Functionality | Capturing photos of physical cookbooks or handwritten recipe cards to import into the user's cookbook. |
| **Photo Library** (`NSPhotoLibraryUsageDescription`) | App Functionality | Selecting existing recipe photos or screenshots to create cookbook pages. |
| **Sign in with Apple** | Authentication | Compliant native authentication matching HIG standards with official Apple-provided buttons. |
