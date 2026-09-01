# Folio App Store product page

_Working launch copy and screenshot brief. Last reviewed: 2026-09-02._

This document is the canonical working draft for Folio's first iPhone App Store product page. It covers the customer-facing listing and screenshot campaign only. Subscription validation, end-to-end import testing, paywall polish, and production allowance changes remain separate launch tasks.

## Positioning decision

Folio should not present itself as another generic recipe manager, meal planner, or AI chat app. Current category leaders already crowd those phrases. The distinctive promise is:

> Recipes become personal cookbooks.

The product page should make the transformation visible: a recipe source goes in, a finished designed page appears in a book, and Folio stays available while the user cooks. AI is the mechanism, not the headline.

## Launch metadata: English (U.S.)

| Field | Launch value | Limit check |
|---|---|---:|
| App name | `Folio` | 5 / 30 characters |
| Subtitle | `Recipes become cookbooks` | 24 / 30 characters |
| Primary category | `Food & Drink` | Recommended |
| Secondary category | None at launch | Avoid a weak or misleading category |
| Promotional text | `Turn a recipe link, photo, video, or note into a finished page in your own cookbook. Folio keeps the recipe context close, so you can ask questions while you cook.` | 163 / 170 characters |
| Keywords | `recipe,cookbook,cooking,organizer,import,save,chef,kitchen,ingredients,substitution` | 83 / 100 ASCII bytes |
| Support URL | `https://yazz220.github.io/NutriAI/support.html` | Already used by the app |
| Marketing URL | Leave empty at launch | The current website root is a legal/support hub, not a product landing page |
| Privacy policy URL | `https://yazz220.github.io/NutriAI/privacy.html` | Already used by the app |
| Copyright | `© 2026 [legal seller name]` | Replace the bracketed value with the exact App Store Connect seller/legal name |

The app name, subtitle, and keyword field deliberately avoid stuffing terms such as “AI,” “meal planner,” and competitor names. “AI” is not the reason a user should choose Folio; the finished cookbook is.

### Description

Recipes deserve better than a pile of open tabs.

Folio turns the recipes you want to keep into beautiful pages inside personal cookbooks. Share a recipe link, paste text, or add a photo, video, or audio file. Folio extracts the useful cooking details, creates a finished page, and puts it in the book you choose.

BUILD A COOKBOOK SHELF

Create books for the food you actually cook—weeknight favorites, family recipes, baking projects, or anything else. Choose a cover and page style so every book feels personal.

CAPTURE RECIPES WITH LESS WORK

Send a supported recipe link to Folio from the share sheet or paste it inside the app. You can also bring text, recipe photos, screenshots, and files you have permission to use. If an import needs help, Folio keeps the source and gives you a clear way to recover it.

COOK FROM THE PAGE

Open a book and read the finished recipe page like a real cookbook. The structured recipe stays underneath, ready for scaling, substitutions, timers, walkthroughs, and edits.

ASK FOLIO IN CONTEXT

Folio is your conversational cooking companion. Ask about the recipe open in front of you, find something across your books, or get practical help without re-explaining what you are cooking.

YOUR RECIPES, ORGANIZED

Every capture keeps its place, every finished page returns to its book, and your shelf grows into a cookbook collection that is actually enjoyable to use.

Folio uses AI to interpret submitted recipe content and generate cookbook pages. Results can make mistakes; review ingredients, quantities, temperatures, timing, allergens, and food-safety guidance before cooking.

### Version 1.0 release notes

Welcome to Folio—a new way to turn the recipes you save into cookbooks you love to use.

- Create and style personal cookbooks.
- Capture recipes from supported links, text, photos, video, and audio files.
- Generate finished recipe pages for your books.
- Ask Folio for recipe-aware cooking help.

## Screenshot campaign

### Creative direction

Build one connected editorial canvas, then crop it into seven portrait screenshots. Use Folio's real UI and real generated pages as the product evidence. The surrounding art direction should feel like a modern cookbook publisher: paper ivory, plum, restrained sage and coral accents, generous whitespace, subtle page texture, and display typography that echoes the app.

Do not use generic neon AI gradients, floating feature badges, fake chat answers, fabricated app screens, or a different device frame on every slide. AI-generated imagery may support a background or food accent only when Folio owns the result and it does not imply nonexistent functionality.

The first three slides must work as a self-contained acquisition story because Apple may surface them in search results.

| # | Headline | Product evidence | Composition |
|---:|---|---|---|
| 1 | **Recipes become cookbooks** | Strongest shelf plus open-book reader capture | Hero spread. Make the physical cookbook metaphor unmistakable before explaining features. |
| 2 | **From link to finished page** | Intake/share capture paired with the generated result | A simple left-to-right transformation crossing the slide seam. Keep the link itself fictional. |
| 3 | **Every page feels made for you** | One excellent finished page, large enough to read visually | Let the page art dominate. This is Folio's strongest visual proof, not a list of customization controls. |
| 4 | **Ask Folio as you cook** | Assistant open over a real active recipe | Use a short fictional substitution question whose answer is visibly grounded in the open recipe. |
| 5 | **A style for every book** | Creation studio or a small set of clearly different books | Show coherent variety, not a dense feature grid. |
| 6 | **Everything lives on your shelf** | Mature shelf with several fictional cookbooks | Communicate collection, memory, and return value. |
| 7 | **Your recipes. Your cookbooks.** | Calm reader/shelf closing image plus icon or wordmark | Emotional close; no new feature claim and no hard sell. |

### Required source captures

Capture clean, production-like iPhone screens with fictional content and no personal data:

1. A polished shelf with three to five books.
2. The simple link intake state.
3. The strongest completed recipe page in the reader.
4. Folio answering a substitution question while that recipe is active.
5. The cookbook creation/style studio.
6. Optionally, a second finished page or alternate shelf angle for the closing slide.

Use one fictional recipe family across the campaign so the story feels continuous. A visually distinctive but familiar recipe—such as roasted tomato pasta or lemon olive-oil cake—will read more clearly than a generic salad. All names, source URLs, photos, and recipe content must be fictional or owned/licensed for marketing use.

### Output specification

- Platform: iPhone only for launch. The current Expo configuration does not support iPad.
- Orientation: portrait.
- Slides: seven, with room to add an eighth only if testing reveals a missing purchase-driving benefit.
- Master output: Apple's current 6.9-inch portrait size, exported without alpha. Generate other accepted iPhone sizes from the same layout only where App Store Connect requests them.
- Localization: English (U.S.) first. Do not generate translated screenshot sets until the app, support pages, and metadata support that language.
- App preview: defer for launch unless the end-to-end import-to-page transition is stable enough to show truthfully in a 15–20 second device capture.

## Tool decision

### Recommendation

Use a custom repository-owned screenshot studio as Folio's primary production system. The project's App Store screenshot workflow can create a reusable connected canvas, apply the real Folio icon, colors, and typography, load actual device captures, and export exact store sizes. This is the best fit because Folio's physical-book interface is the differentiator; a stock SaaS template would make the product look more ordinary than it is.

Use **AppScreens** only as the best hosted fallback or later localization/PPO production tool. It has the strongest all-in-one combination of templates, responsive store sizes, localization, AI-assisted captions/restyling, and direct store upload. Its main risk for Folio is visual sameness unless every template is substantially customized.

Use **Rotato** selectively for one cinematic device render or a future App Preview, not for the entire screenshot set. Its strength is motion and 3D mockups, not a maintainable multi-slide store campaign.

### Shortlist

| Tool | Best use | Folio fit | Decision |
|---|---|---|---|
| Repository-owned screenshot studio | Custom art direction, version control, exact repeatable exports | Excellent | **Primary** |
| AppScreens | Fast hosted workflow, localization, product-page tests, direct upload | Very good if customized | **Best external option** |
| Figma | Hands-on art direction and collaboration with a visual designer | Excellent but manual | Use if the design references require designer-led composition |
| Rotato | 3D devices and motion assets | Good as an accent | Optional supplement |
| LaunchMatic | Low-cost one-off screenshot generation | Adequate | Not preferred over the custom system |
| Screenshots.pro | Quick multi-device exports and API automation | Adequate | Useful utility, weaker brand fit |

Tool pricing and packaging change frequently. Verify them again immediately before purchasing. As of this review, AppScreens is the most complete hosted workflow; LaunchMatic is attractive for a one-off short-term purchase; Screenshots.pro emphasizes multi-size export and automation; Rotato emphasizes 3D and video presentation.

## Production sequence

1. Capture the six real Folio screens listed above from the release candidate.
2. Build the connected-canvas screenshot studio from those captures and the existing Folio brand assets.
3. Review slide 1 at actual App Store search-result size before polishing the rest.
4. Export and verify all seven PNGs for dimensions, alpha, safe areas, fictional data, and claim accuracy.
5. Enter the approved metadata and upload the screenshots in App Store Connect.
6. After launch traffic is meaningful, run Product Page Optimization on one variable at a time—first the slide-1 headline/composition, then the subtitle. Do not redesign the whole set between variants.

## Primary references

- [Apple: Creating your product page](https://developer.apple.com/app-store/product-page/)
- [Apple: Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/)
- [Apple: Platform version metadata limits](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information/)
- [AppScreens pricing and capabilities](https://appscreens.com/pricing)
- [Screenshots.pro](https://screenshots.pro/)
- [LaunchMatic pricing](https://www.launchmatic.app/pricing)
- [Rotato pricing](https://rotato.app/pricing)
