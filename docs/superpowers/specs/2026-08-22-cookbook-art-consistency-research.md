# Cookbook artwork consistency research

> Superseded by ADR 0002. The versioned cookbook identity and server-owned visual anchors remain useful. The artwork-only and no-text recommendation was rejected after product testing in favor of complete generated pages.

**Date:** 2026-08-22
**Status:** Superseded research
**Scope:** Earlier investigation of cookbook-level visual consistency.

## Decision

Nosh should treat a cookbook style as a versioned art-direction contract. Every page in the book inherits that contract. The typesetter should choose a layout from the recipe's structure, without asking the user to choose an aesthetic template for each recipe.

For generated artwork, the strongest practical stack is:

1. A locked, versioned artwork prompt for the cookbook style.
2. Two canonical, text-free style reference images for that style.
3. A variable visual brief derived from the RecipeGraph.
4. The current artwork as the first reference when the user asks for an edit.
5. Seeds only for regression tests and debugging, never as the book's style identity.

The image model should produce an illustration asset. It should not produce the page, paper texture, typography, border, ingredient layout, or any other typesetting.

## What Nosh already gets right

The main architecture is sound and should stay:

- The page is already a composite of a deterministic typesetter and an artwork-only layer. [ArtLayer](../../../components/cookbook/typesetter/ArtLayer.tsx#L1) draws the paper, artwork, rules, and borders. [TextLayer](../../../components/cookbook/typesetter/TextLayer.tsx) renders accessible recipe text.
- Cookbook styles already lock palette and typography in [typesetterStyles.ts](../../../constants/typesetterStyles.ts). This is the correct home for code-rendered visual decisions.
- The capture path takes `cover_style` and `page_template_id` from the destination cookbook rather than inventing them from the imported recipe. See [capture-recipe](../../../supabase/functions/capture-recipe/index.ts#L183).
- Artwork regeneration already supports passing the selected artwork back as `referenceArtUrl`, and a new candidate remains unselected until approval. See [generate-page-art](../../../supabase/functions/generate-page-art/index.ts#L442).
- The type model already contains `sparse`, `standard`, and `dense` layout classifications plus `computeLayoutDensity`. Nothing consumes it yet, but it is a good start for automatic layout selection. See [cookbook.ts](../../../types/cookbook.ts#L248).

## Where the current implementation conflicts with the intended model

| Current behavior | Problem | Recommended change |
|---|---|---|
| The art prompts contain phrases such as "cookbook page," "editorial layout," "border," "margin," and "heading." See [generate-page-art](../../../supabase/functions/generate-page-art/index.ts#L130). | This asks the image model to recreate work owned by the typesetter. It also raises the chance of generated frames, page chrome, and accidental writing. | Replace `pagePromptDescriptor` with an art-only descriptor covering medium, palette, line quality, lighting, food treatment, props, and background treatment. |
| `recipeTemplates.ts` mixes layout, typography, visual art, and page aesthetics. | The word "template" still carries two meanings. It makes a recipe-level choice appear to control the book's art direction. | Keep the three IDs as internal layout strategies for compatibility. Stop treating them as visual identities or image prompts. |
| The former `PageStyleSheet` let a user choose a page style for one recipe. | This was the scrapbook path the product was trying to avoid. | The component has since been removed. Current generation reads the cookbook's persisted identity without a per-recipe style picker. |
| `generate-page-art` accepts `styleReferences`, but the capture path does not supply canonical references and the client API does not expose them. | Reference-image support exists only as dormant plumbing. | Resolve references on the server from the cookbook style and visual-style version. Do not trust the client to define the book's canonical style. |
| Every artwork request uses `aspect_ratio: '3:4'`. See [generate-page-art](../../../supabase/functions/generate-page-art/index.ts#L243). | The current art zones are approximately square or landscape, then Skia uses `fit="contain"`. Portrait art is likely to appear small or leave a visible rectangle. | Select `1:1`, `4:3`, or `3:2` from the chosen internal art-zone geometry. Start with `1:1` if only one ratio can ship now. |
| The request sends `output_format: 'png'`. | The live Qwen Image 3 Pro endpoint does not list `output_format` among its supported parameters. OpenRouter states that an absent capability key means the endpoint does not support it. | Remove unsupported fields from the Qwen request. Qwen's provider documentation says this model returns PNG. Decode the returned `media_type` defensively. |
| Style descriptors are duplicated in the client style constants and the Edge Function. | The two registries can drift without a failure. | Put AI art descriptors and references in one server-owned style registry. Keep deterministic rendering values in the client registry, tied together by `styleId` and `visualStyleVersion`. Add a coverage test for every persisted style ID. |

## Provider facts that matter

OpenRouter's Image API accepts text prompts and optional `input_references`. It returns base64 image bytes and exposes model and endpoint capability records so callers can check supported parameters instead of assuming them. Reference inputs can be public URLs or base64 data URLs. [OpenRouter Image API documentation](https://openrouter.ai/docs/guides/overview/multimodal/image-generation)

As checked on 2026-08-22, OpenRouter's live endpoint record for `qwen/qwen-image-3-pro` reports:

- Text and image input, image output.
- `1K` and `2K` resolution.
- `1:1`, `3:4`, `4:3`, `3:2`, and several other aspect ratios.
- One to six outputs.
- Zero to four input references.
- Seed support.
- No provider passthrough fields.
- Alibaba as the current provider.

The same endpoint record lists $0.04 per 1K output, $0.075 per 2K output, and $0.003 per input image at the time of this research. Prices and capabilities should be treated as live data. [OpenRouter Qwen Image 3 Pro endpoint record](https://openrouter.ai/api/v1/images/models/qwen/qwen-image-3-pro/endpoints)

Alibaba's first-party Qwen Image 3.0 Pro documentation describes one to three input images for image-to-image generation and editing. It supports a fixed seed for relatively stable results, but does not promise exact reproduction. It also says the provider output is PNG. [Alibaba Cloud Qwen Image 3.0 API reference](https://www.alibabacloud.com/help/en/model-studio/qwen-image-generation-and-editing-api-reference)

There is a small contract difference here. OpenRouter currently advertises four references, while Alibaba documents three for its direct API. Nosh should use no more than three. That accommodates both contracts and gives enough room for two canonical style references plus the current artwork during an edit.

Qwen's own image-editing documentation distinguishes appearance edits, where unrelated regions should remain unchanged, from semantic edits and style transfer. That fits Nosh's regenerate flow well. The selected artwork can anchor composition and appearance while the instruction changes one requested property. [Qwen Image Edit announcement](https://qwenlm.github.io/blog/qwen-image-edit/)

Midjourney's official documentation supports the same broader conclusion. Its Style Reference feature transfers palette, medium, texture, and lighting, and its guidance says to keep the content prompt simple so it does not fight the reference. Its seed documentation explicitly says seeds are for testing, not for saving a style, character, or appearance. [Midjourney Style Reference](https://docs.midjourney.com/hc/en-us/articles/32180011136653-Style-Reference), [Midjourney Seeds](https://docs.midjourney.com/hc/en-us/articles/32604356340877-Seeds)

## Comparison of the available controls

| Control | What it does well | What it cannot guarantee | Nosh use |
|---|---|---|---|
| Locked style prompt | Gives every request the same vocabulary for medium, linework, palette, lighting, food treatment, and background. Cheap and easy to version. | Text alone leaves room for model interpretation and can drift after a model update. | Required baseline for every generated image. |
| Canonical references | Gives the model direct visual evidence of the intended medium and palette. This is the best available control for cross-subject style continuity. | Qwen does not expose a style-reference weight through the current OpenRouter endpoint. A reference can leak subject matter or composition. | Use two deliberately different food subjects rendered in the same style. Tell the model that the references define style only. |
| Reused prompt and seed | Useful when comparing prompt edits under a roughly controlled random start. | A seed does not encode style and is not a cross-version identity. It can also repeat composition biases across unrelated recipes. | Store seeds for tests and support diagnostics. Use a fresh seed for normal production generation. |
| Image editing | Preserves more of the current artwork while changing a requested detail. Qwen supports semantic and appearance editing. | Large semantic changes can still alter unrelated details. | Put current art in reference slot one, followed by the two canonical style references. Use a precise "change only" instruction. |
| Per-recipe visual template | Produces immediate variety. | Variety is the problem here. It fragments the authored identity of the book and duplicates typesetter responsibility. | Retire as a user-facing visual concept. Preserve legacy IDs only as layout compatibility data. |

## Recommended Nosh implementation

### 1. Define a versioned cookbook visual identity

Each cookbook should resolve to one immutable version of an art contract. A later product update should not silently change the visual world halfway through an existing book.

```ts
interface CookbookVisualIdentity {
  styleId: CookbookStyleId;
  version: number;
  art: {
    medium: string;
    palette: string;
    lineAndTexture: string;
    lighting: string;
    foodTreatment: string;
    propRules: string;
    backgroundTreatment: string;
    forbiddenContent: string[];
    referenceUrls: readonly [string, string];
  };
}
```

The typesetter configuration stays deterministic and separate. It can share `styleId` and `version`, but the image model should never receive font sizes, column instructions, border rules, page numbers, or headings.

Store the effective `visualStyleVersion` on the cookbook. Also record the style version, model slug, provider, references, prompt hash, aspect ratio, and seed in `page_versions.prompt_payload`. The existing JSONB payload can hold these values without forcing the image to become the source of truth.

### 2. Build an art-only prompt

The locked portion should describe only visual rendering. The variable portion should come from the RecipeGraph and contain facts that can affect the visible dish.

```text
[Locked cookbook art contract]
Black ink botanical food illustration with restrained sage and muted gold accents.
Organic hand-drawn line weight, sparse watercolor wash, soft alabaster ground.
Natural, appetizing food proportions. Quiet tabletop props only.

[Variable visual brief]
Subject: plated spinach and ricotta ravioli.
Visible cues: folded ravioli, wilted spinach, ricotta filling, sage leaves.
Composition: centered three-quarter view with clear surrounding space.

[Reference roles]
Images 1 and 2 define medium, palette, linework, shading, and lighting only.
Do not copy their dishes, ingredients, props, or exact composition.

[Hard content ban]
Purely visual food artwork. No text, letters, numbers, handwriting, labels,
captions, logos, watermarks, menus, borders, page frames, or recipe layout.
```

Including a few visible food cues is better than sending only the title. A title such as "Grandma's casserole" does not tell the model what the dish should look like. Quantities, steps, headings, and long recipe text should stay out of the art prompt.

The current OpenRouter Qwen endpoint does not expose a separate negative-prompt field, so the no-text and no-page rules belong in the positive prompt. They are still probabilistic. The deterministic renderer remains the only authority for text.

### 3. Use two canonical references per cookbook style

Create or curate two Nosh-owned reference images for each exposed cookbook style. They should:

- Contain different dishes so the common signal is style, not subject.
- Contain no text, page layout, border, label, logo, or watermark.
- Use the same medium, palette, line treatment, lighting, and background treatment.
- Be immutable and stored at versioned URLs.
- Match the sort of crop the production art zone will use.

The Edge Function should resolve these URLs from `styleId` and `visualStyleVersion`. A client-supplied `styleReferences` array should not override the canonical book identity.

Reference order should be stable:

```text
New art:  [canonical style A, canonical style B]
Edit art: [current selected art, canonical style A, canonical style B]
```

Three references keep Nosh within Alibaba's documented limit even though OpenRouter currently advertises four.

### 4. Let the typesetter choose layout

Keep the current layout configurations, but rename their role internally from recipe templates to layout strategies. Use `computeLayoutDensity` as the first input to an automatic chooser.

A simple first policy is enough:

| Recipe structure | Internal layout | Art request ratio |
|---|---|---|
| Sparse | Centered single column with a larger art zone | `1:1` |
| Standard | Single column or balanced two-column content | `4:3` |
| Dense or grouped | Two-column content with a shallower, wider art zone | `3:2` |

This keeps aesthetics at cookbook level and spatial fit at the typesetter level. The chosen layout strategy may still be stored on the page so rendering stays stable. The user does not need to choose it during import.

Old `template_id` values should continue rendering. Do not delete or reinterpret existing pages during the pipeline repair. New pages can use an `auto` policy or store the computed strategy. A manual override can remain hidden behind an advanced control if the automatic result fails.

### 5. Treat edit and regenerate as separate operations

A fresh generation should use the RecipeGraph visual brief and the two canonical style references.

An edit should use the current selected artwork as the first reference and name what must remain unchanged:

```text
Image 1 is the current approved artwork. Change only the plating to show two servings.
Preserve the camera angle, composition, medium, palette, line weight, background,
lighting, props, and every unrelated food detail. Images 2 and 3 define the book style.
No text, letters, numbers, labels, logos, borders, or recipe layout.
```

Keep the current candidate-and-approval behavior. It protects an accepted image from a weak edit and matches the product rule that guided UI handles commitment.

### 6. Use runtime capability checks

OpenRouter publishes definitive endpoint records. Cache the Qwen endpoint capabilities and send only fields the endpoint supports. For the current Qwen endpoint, that means `model`, `prompt`, `resolution`, `aspect_ratio`, `n`, optional `input_references`, and optional `seed`.

Do not send `output_format` to this endpoint unless the live capability record starts advertising it. Do not rely on transparent backgrounds because the current endpoint does not advertise a `background` control. Generate against the cookbook's paper color or a compatible quiet ground, then size the output to the art zone.

Pin or record the provider. OpenRouter currently lists only Alibaba for Qwen Image 3 Pro, but future routing could add another endpoint with a different visual interpretation. Silent provider changes are bad for a book that promises one art director.

## Practical rollout

The core pipeline does not need to wait for a perfect reference library.

1. Fix the Qwen request so it contains only supported fields and uses an art-zone-compatible ratio.
2. Replace page-layout language in the image prompt with an art-only style contract.
3. Ship the end-to-end import with the locked cookbook-level prompt.
4. Add two canonical references to each exposed cookbook style and version the contract.
5. Switch new pages to automatic layout selection using the existing density calculation.
6. Validate edit instructions with current art in reference slot one.

Before changing a style contract, run a small fixed evaluation set containing a sparse recipe, a dense recipe, a plated dish, a baked dish, and a visually ambiguous family recipe. Use fixed seeds in this evaluation only. Check:

- No visible text, letters, numbers, labels, logos, or page borders.
- The dish matches the RecipeGraph's visible facts.
- Medium, palette, linework, lighting, and background match the canonical references.
- The result fits the selected art zone without a small portrait floating inside it.
- Regeneration preserves the book style.
- Editing changes the requested property without silently replacing the accepted composition.

## Final recommendation

The user's proposed direction is correct, with one refinement. Prompt locking alone is a baseline, not the full consistency mechanism. Nosh should combine a locked, versioned cookbook art contract with two canonical style references. The typesetter should select layout from RecipeGraph density and structure. Image editing should start from the current approved art. Seeds belong in tests.

The current per-recipe template UI should not shape new image generation. Its layout IDs are still useful internal strategies and useful backward-compatibility data, so there is no need for a risky deletion while the import pipeline is being repaired.
