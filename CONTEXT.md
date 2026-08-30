# Nosh

Nosh turns recipes people find elsewhere into personal cookbooks they can read and cook from. The cookbook is the product. Nosh is the chef who understands the recipes inside it.

## Books and pages

**Bookshelf**:
The user's collection of personal cookbooks and the home of the signed-in product.
_Avoid_: Dashboard, recipe manager

**Cookbook**:
A named physical-looking Nosh book personalized by its title, cover texture, and cover color. It also owns the recipe-page style chosen for the recipes inside it. Every cookbook shares the same physical architecture, opening behavior, page system, and interactions.
_Avoid_: Folder, collection

**Cover texture**:
The user-selected surface finish applied to the canonical Nosh cover construction. Fine cloth and Natural linen change only weave and grain; they never change geometry or behavior.
_Avoid_: Book type, binding, page style

**Cover color**:
The user-selected curated color applied independently to either canonical cover texture. It personalizes the book without changing its structure or behavior.
_Avoid_: Book type, recipe style, page template

**Recipe-page style**:
The book-owned visual language shared by every generated recipe page inside it. The user chooses Illustrated, Editorial, or Heritage when creating the cookbook. It is independent from the cover color.
_Avoid_: Per-recipe theme, cover color, page template

**Canonical page geometry**:
The 4:5 portrait leaf shared by every Nosh cookbook. Two leaves form an 8:5 spread, and 8 × 10 inches is its physical-print mapping. Geometry never varies by cover color, recipe-page style, or user choice.
_Avoid_: Page-size option, image crop, recipe-page style

**Default cookbook**:
The cookbook Nosh chooses when a recipe capture has no explicit destination.
_Avoid_: Most recent cookbook

**Recipe page**:
A cookbook entry made from one canonical recipe and one selected generated page image.
_Avoid_: Art asset, pending page

**Generated page image**:
The complete page the user reads, including dish imagery, title, ingredients, instructions, typography, paper, and decoration.
_Avoid_: Artwork layer, dish image, illustration asset

**Page version**:
One generated visual version of a recipe page. A page has one selected version and may retain unselected alternatives.
_Avoid_: Draft page

## Recipe capture

**Recipe source**:
A URL, pasted recipe, photo, video link, or existing audio recording that the user gives to Nosh.
_Avoid_: Upload job

**Video source**:
A public video that Nosh can retrieve or that its configured video reader explicitly supports. A social post page is not video evidence merely because it contains a video.
_Avoid_: Any social link, reel page

**Audio source**:
An existing audio recording selected by the user as recipe evidence. It is not a live recording made inside Nosh.
_Avoid_: Voice mode, microphone input

**Audio transcript**:
The written evidence derived from an audio source before recipe interpretation. It is evidence about a recipe, not a recipe by itself.
_Avoid_: Recipe Graph, voice recipe

**Recipe evidence**:
The source-derived facts Nosh uses to decide whether one complete recipe can be created, such as structured website data, visible text, captions, ingredients, and cooking instructions.
_Avoid_: Model guess, generated recipe

**Extraction diagnostics**:
Internal source provenance, confidence, inferred-field, and quality information used to improve or recover recipe ingestion. It never becomes recipe wording or cookbook-page copy.
_Avoid_: Recipe notes, source commentary, page warnings

**Insufficient recipe evidence**:
A source that is not a recipe, is blank or unreadable, lacks core ingredients or instructions, or contains multiple recipes that cannot be separated safely. It never creates a Recipe Graph or page.
_Avoid_: Failed page, low-quality recipe

**Recipe capture**:
The durable work of turning one recipe source into one recipe page. A capture survives navigation and can be retried without creating duplicate pages.
_Avoid_: Import chat, review flow, approval flow

**Capture checkpoint**:
A versioned record that a recipe capture completed one trustworthy stage. Retry resumes after the latest compatible checkpoint and keeps the source, transcript, Recipe Graph, or generated page already produced.
_Avoid_: Screen progress, temporary loader state, processing attempt

**Recipe Graph**:
The canonical cooking data Nosh uses to render pages, answer questions, scale servings, substitute ingredients, and prepare revisions. It contains the recipe rather than an explanation of how Nosh extracted it.
_Avoid_: OCR text, generated page text

**Recipe quality assessment**:
Nosh's check that an understood recipe has consistent, usable cooking details before it becomes a page. Missing optional metadata never blocks the recipe.
_Avoid_: Model confidence, approval step, style review

**Recipe correction**:
A focused check of specific cooking details that are missing, contradictory, or inferred. It resumes the same capture and does not create a second recipe or page.
_Avoid_: Full review flow, new import, page edit

**Recipe yield**:
The amount a recipe produces in the source's own words, such as "Serves 6," "1 loaf," or "24 cookies." A numeric serving count exists only when the source describes servings.
_Avoid_: Servings when the source describes items, batches, loaves, or pans

**Needs destination**:
A capture whose recipe is understood but has no cookbook to inherit a style from.
_Avoid_: Pending review

**Needs attention**:
A capture that stopped because the source needs to be replaced or a technical stage can be retried. The failure code determines the recovery action.
_Avoid_: Needs help, rejected

**Recipe activity**:
The compact status section inside Save a recipe, including work in progress, destination choices, failures, and completed pages.
_Avoid_: Approval inbox, separate imports queue

## Nosh

**Nosh**:
The single assistant identity shared across the bookshelf, reader, capture, and cooking interactions.
_Avoid_: Chatbot, separate capture assistant

**Active context**:
The recipe, cookbook, capture, or collection currently in focus for a Nosh conversation.
_Avoid_: Screen state

**Recipe collection**:
Every completed recipe page across the user's cookbooks. Nosh can search the collection regardless of which book is open.
_Avoid_: Active cookbook

**Cooking conversation**:
A focused conversation where Nosh answers questions and helps the user cook or adapt a recipe.
_Avoid_: Generic chat

**Walkthrough**:
Step-by-step cooking guidance that starts only when the user asks for it.
_Avoid_: Default cooking mode, wizard

**Adaptation**:
A temporary or saved variation of a recipe, such as different servings, ingredients, or method details.
_Avoid_: Image edit
