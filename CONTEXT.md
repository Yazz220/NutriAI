# Nosh

Nosh turns recipes people find elsewhere into personal cookbooks they can read and cook from. The cookbook is the product. Nosh is the chef who understands the recipes inside it.

## Books and pages

**Bookshelf**:
The user's collection of personal cookbooks and the home of the signed-in product.
_Avoid_: Dashboard, recipe manager

**Cookbook**:
A named physical-looking book that owns a cover finish, a recipe-page style, and the user's recipe pages.
_Avoid_: Folder, collection

**Cover finish**:
The book's physical skin: its color, cloth or leather material, binding, and foil treatment.
_Avoid_: Recipe style, page template

**Recipe-page style**:
The book-owned visual language shared by every generated recipe page inside it. It includes paper, palette, typography, image treatment, ornament, and composition. It is independent from the cover finish.
_Avoid_: Per-recipe theme, cover style, page template

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
A URL, pasted recipe, photo, or video link that the user gives to Nosh.
_Avoid_: Upload job

**Recipe capture**:
The durable work of turning one recipe source into one recipe page. A capture survives navigation and can be retried without creating duplicate pages.
_Avoid_: Import chat, review flow, approval flow

**Recipe Graph**:
The canonical structured recipe Nosh uses to answer questions, scale servings, substitute ingredients, and prepare page revisions.
_Avoid_: OCR text, generated page text

**Needs destination**:
A capture whose recipe is understood but has no cookbook to inherit a style from.
_Avoid_: Pending review

**Needs attention**:
A capture that stopped because extraction or page generation failed and can be retried.
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
