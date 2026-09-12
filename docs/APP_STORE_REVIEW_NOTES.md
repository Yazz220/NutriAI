# App Store review notes

This is the current copy-and-paste template for App Store Connect. Replace every bracketed value before submission. Do not store a real review password in the repository.

## Sign-in information

- Sign-in required: Yes
- User name: `[APP REVIEW ACCOUNT EMAIL]`
- Password: `[APP REVIEW ACCOUNT PASSWORD]`

Before submission, create the account, confirm its email, and give it one or two cookbooks with finished recipe pages. Keep a separate disposable account available if Apple needs to verify account deletion.

## Notes for App Review

```text
Welcome to Folio, a book-first personal cookbook app.

REVIEW ACCOUNT
Username: [APP REVIEW ACCOUNT EMAIL]
Password: [APP REVIEW ACCOUNT PASSWORD]

TESTING WALKTHROUGH

1. Cookbook shelf and reader
- After signing in, tap a cookbook on the shelf.
- Swipe horizontally to turn pages.
- Tap a recipe page for focused reading.
- Use the page actions menu to share, save, move, edit, redesign, report, or remove a recipe when those actions are available.

2. Recipe capture
- Open a cookbook and tap Add recipe, or use the recipe activity surface.
- Folio accepts pasted recipe text, supported public links, and existing image, video, or audio files that the user has permission to use.
- Photo Library access is requested only when the user chooses an existing image or video.

3. Folio assistant
- Tap Ask Folio from the shelf or reader.
- The assistant can answer questions about an open recipe and can start a recipe capture through the same durable capture flow used elsewhere in the app.

4. Account controls
- Open Settings from the shelf to view legal and privacy information, AI data-use controls, and account controls.
- To test account deletion, choose Delete account and complete the confirmation prompts. This permanently removes the account and associated data.

SUBSCRIPTION REVIEW
- Folio Free supports up to two cookbooks and five successful designed-page creations for the life of the account.
- Folio Plus supports unlimited cookbooks and 40 successful designed-page creations per UTC calendar month.
- Monthly and annual billing unlock the same Folio Plus entitlement. Prices are localized by the App Store, and no introductory offer is configured at launch.
- Open Settings and select the Folio plan card to view the purchase screen. The annual option is selected initially; monthly can be selected from the same screen.
- Complete a sandbox purchase with either option. Folio synchronizes the App Store entitlement before enabling Plus capacity.
- To test restoration, open the same purchase screen and select Restore purchases. To manage an active subscription, return to Settings and select Manage subscription.
- Failed recipe extraction, failed page generation, and publication retries do not consume a designed-page creation. Existing cookbooks and pages remain available after cancellation.

SUPPORT
folio.cookbook.help@outlook.com
```

## Privacy and permission notes

| Capability | Purpose |
|---|---|
| Photo Library | The user may select an existing recipe photo, screenshot, or video for recipe capture. |
| Sign in with Apple | Native account authentication. |
| User-provided content | Recipe sources and conversation context are processed only after the in-app AI data-use disclosure and consent flow. |

The App Store Connect privacy answers must be checked against the final binary and the published privacy policy immediately before submission.
