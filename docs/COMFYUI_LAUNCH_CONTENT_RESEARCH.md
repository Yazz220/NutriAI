# ComfyUI launch-content research for Folio

_Reviewed 3 September 2026. Sources are first-party documentation, repositories, model cards, and Folio's own project records._

## Recommendation

ComfyUI can give Folio a repeatable content studio, but it should not generate complete ads with baked-in interface screens or typography. The strongest setup is hybrid:

1. Use real Folio captures, production logos, and typeset copy as locked foreground assets.
2. Use ComfyUI for food photography, paper and botanical backgrounds, masks, outpainting, controlled variations, upscaling, and short motion plates.
3. Assemble final App Store and campaign layouts in the repository-owned screenshot studio proposed in the [App Store product-page brief](launch/APP_STORE_PRODUCT_PAGE_2026-09.md).

This fits the product. Folio's sale is the transformation from recipe source to finished personal cookbook, not generic AI imagery. The existing art already has a specific editorial voice: Paper Ivory, Folio Plum, restrained sage and coral, Playfair Display, tactile book materials, and six distinct page styles. The [brand source of truth](../brand/README.md) also forbids redrawing or deforming the master symbol. ComfyUI should extend that system, not improvise a replacement for it.

## What the ecosystem makes possible

ComfyUI workflows are graphs saved as JSON. Generated images can also retain workflow metadata, so a successful asset can be reopened, adjusted, and reproduced instead of disappearing into prompt history. The official [workflow documentation](https://docs.comfy.org/basic-concepts/workflow) explains both forms of reuse.

For Folio, the useful possibilities are:

| Content | Practical ComfyUI job | Keep outside ComfyUI |
|---|---|---|
| App Store screenshots | Generate one connected paper, food, and botanical backdrop; outpaint it across seven portrait crops; create shadow and mask plates | Real iPhone captures, headlines, device geometry, Folio marks, final export sizes |
| Launch carousel | Produce coordinated 1:1 and 4:5 food/editorial scenes from a fixed seed and reference set | Product claims, recipe facts, calls to action |
| Short launch video | Animate steam, page-edge light, ingredients, or a camera move; combine frames into a short loop | Real screen recording, captions, final logo lockup |
| Style campaign | Create owned food plates and supporting motifs for Studio, Editorial, Illustrated, Heritage, Journal, and Bold | The canonical style names and actual generated recipe pages |
| Press and web hero | Generate a wide tabletop or open-cookbook environment with empty placement zones for devices and copy | Screenshot, logo, readable interface, legal text |
| Folio character posts | Generate the surrounding kitchen or paper scene and subtle effects | The approved character SVG or PNG, kept pixel-accurate as a composited layer |
| Content resizing | Outpaint an approved hero into 16:9, 1:1, 4:5, and 9:16 variants; upscale in tiles | Final crop review and safe-area checks |

The first production experiment should be the seven-slide App Store canvas. Folio already has the complete narrative, source-capture list, and art direction for it. That makes success measurable. A broad "make launch content" workflow would be much harder to judge.

## Where to find workflows

### Start here

- [Comfy's official workflow gallery](https://comfy.org/workflows/) is the best first stop. It currently covers image generation and editing, video, audio, 3D, text, upscaling, and vision workflows. These are maintained alongside current ComfyUI capabilities.
- The built-in **Workflow > Browse Workflow Templates** browser exposes native templates and examples shipped by custom-node authors. Comfy's [template guide](https://docs.comfy.org/interface/features/template) says official templates use Core nodes and avoid third-party nodes. That makes them easier to audit and reproduce.
- [Comfy-Org/workflow_templates](https://github.com/Comfy-Org/workflow_templates) is the source repository behind the official templates and reusable subgraph blueprints. Its MIT license covers the repository content. It is also the right place to inspect a workflow before importing it.
- A node author's own `example_workflows` folder is the next-best source for learning a custom pack. Comfy documents how these examples appear inside the Template Browser in its [custom-node workflow-template guide](https://docs.comfy.org/custom-nodes/workflow_templates).

### Community discovery

- [Comfy Workflows](https://comfyworkflows.com/workflows) is an independent, community-posted library with filters for inpainting, outpainting, upscaling, IP-Adapter, ControlNet, image-to-video, and video-to-video. Treat it as discovery, not a trusted installer.
- [OpenArt workflows](https://openart.ai/workflows) expose node and checkpoint dependencies on many workflow pages, which helps with inspection. Its [terms](https://openart.ai/suite/terms) distinguish personal and commercial output rights by subscription, so do not assume a workflow or hosted output is cleared for a launch campaign.
- [Civitai](https://civitai.com/models?types=Workflows) has a large workflow and model catalog, but every downloaded model can carry its own license. Civitai's [terms](https://civitai.com/content/tos) explicitly bind users to each model's displayed or bespoke license.

Use this trust order: official Core template, author's example, Registry-listed node, then community workflow after manual review. Never use "Install all missing nodes" as an automatic reflex. Comfy's documentation states that custom-node installation may install Python requirements and execute an `install.py` file. The [Registry](https://docs.comfy.org/registry/overview) adds semantic versions and security scanning, with a verification mark for nodes that pass its checks, but verification is not a license grant and does not guarantee that two packs have compatible dependencies.

## Node packs worth considering

The machine already has `comfyui-kjnodes` and `rgthree-comfy`. KJNodes supplies low-dependency utility and workflow-organization nodes. [rgthree-comfy](https://github.com/rgthree/rgthree-comfy) adds seed controls, routing, bookmarks, and context helpers under an MIT license. Keep both, but pin a known working version once production workflows exist.

Add packs only when a Folio workflow needs them:

| Pack | Folio use | Recommendation |
|---|---|---|
| [ComfyUI-Impact-Pack](https://github.com/ltdrdata/ComfyUI-Impact-Pack) | Segmentation, masks, regional detail, inpainting, and upscaling | Best first addition for isolating dishes and correcting local defects. GPL-3.0 code. Its README records breaking changes, so pin the version with the workflow. |
| [ControlNet Auxiliary Preprocessors](https://github.com/Fannovel16/comfyui_controlnet_aux) | Canny, line, depth, pose, and other guide images | Useful for preserving a tabletop composition or book silhouette across campaign variants. Apache-2.0 code. It creates guide images and still requires compatible ControlNet weights. |
| [ComfyUI IPAdapter Plus](https://github.com/cubiq/ComfyUI_IPAdapter_plus) | Reference-image conditioning for style and composition | Useful for keeping a food shoot or paper treatment coherent across crops. The author placed it in maintenance-only mode in April 2025, so use it only in a pinned SD 1.5 or SDXL workflow and keep a replacement path. GPL-3.0 code. |
| [ComfyUI-VideoHelperSuite](https://github.com/Kosinkadink/ComfyUI-VideoHelperSuite) | Load frame sequences, trim batches, combine frames, attach audio, export video | Add when producing the first motion asset. Its frame caps and chunking controls matter on this 16 GB machine. GPL-3.0 code. |

KJNodes and rgthree make graphs easier to maintain. They do not improve image quality by themselves. Impact Pack, ControlNet preprocessors, and IP-Adapter each add model or package dependencies, so installing all three before a workflow calls for them would create needless failure points.

Later, task-specific additions may earn a place:

- [ComfyUI Essentials](https://github.com/cubiq/ComfyUI_essentials) for common image, mask, batch, and compositing operations. It is MIT-licensed and appears as a dependency in several official brand-design templates.
- [Inpaint Crop and Stitch](https://github.com/lquesada/ComfyUI-Inpaint-CropAndStitch) when a campaign needs small, high-resolution corrections without reprocessing the whole image.
- [ComfyUI-GGUF](https://github.com/city96/ComfyUI-GGUF) when a chosen model has a reputable quantized release that makes it practical on 12 GB VRAM. Quantization lowers memory use but does not remove the 16 GB system-RAM bottleneck.
- [ComfyUI LayerStyle](https://github.com/chflame163/ComfyUI_LayerStyle) or [LayerForge](https://github.com/Azornes/Comfyui-LayerForge) for heavier compositing. Choose one after a real layout need appears, rather than installing two overlapping suites.
- [ComfyUI Frame Interpolation](https://github.com/Fannovel16/ComfyUI-Frame-Interpolation) only when a short motion test needs smoother delivery frames.

## Model and hardware fit

Local inspection found an RTX 3060 with 12,288 MiB VRAM and 15.8 GB system RAM. The only shared checkpoint is `v1-5-pruned-emaonly-fp16.safetensors`. The current pack list is small, which is a good starting state.

The installation needs maintenance before using current templates. Local ComfyUI is `0.29.2`, while the latest stable release checked on 3 September 2026 is [`0.34.0`](https://github.com/Comfy-Org/ComfyUI/releases/tag/v0.34.0). ComfyUI Desktop is `1.0.28`, while the current Desktop release is [`1.0.46`](https://github.com/Comfy-Org/Comfy-Desktop/releases/tag/v1.0.46). The installed workflow-template package is `0.11.20`, behind [`0.11.54`](https://github.com/Comfy-Org/workflow_templates/releases/tag/v0.11.54). Update through ComfyUI Desktop before adding production nodes, then retest the MCP connection.

There is also an interrupted Z-Image-Turbo download. The diffusion file is only about 45 MB, but its download metadata expects about 12.3 GB. The Qwen text encoder has only its metadata file, which expects about 8.0 GB. Treat both as incomplete files, not installed models. Remove or resume them through Desktop before the first production model setup.

| Model path | Fit on this machine | Launch-use position |
|---|---|---|
| Existing Stable Diffusion 1.5 | Comfortable for 512 to 768 pixel drafts, one image at a time, and mature ControlNet or IP-Adapter workflows | Use now for workflow learning, masks, composition tests, and inexpensive ideation. Its lower native resolution and weaker text rendering make it a poor final typesetter. |
| [SDXL Base 1.0](https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0) | Sensible next local model for single 1024-pixel images. Use batch size 1 and tiled VAE or tiled upscale when needed. System RAM is the tighter limit during model swapping. | Best near-term candidate for final still backgrounds and food images. Its Open RAIL++ license permits use subject to its use restrictions, and the licensor claims no rights in generated output. |
| [FLUX.1 Schnell](https://huggingface.co/black-forest-labs/FLUX.1-schnell) FP8 | Worth a later test. Comfy's [official guide](https://docs.comfy.org/tutorials/flux/flux-1-text-to-image) calls the FP8 checkpoint suitable for lower-spec hardware and Schnell needs only four steps. The large text encoder and 16 GB system RAM can still cause heavy offload and paging. | Commercial-friendly Apache-2.0 weights with better prompt following than SD 1.5. Test one image before committing a campaign to it. |
| [FLUX.2 Klein 4B](https://huggingface.co/black-forest-labs/FLUX.2-klein-4B) | The model card says about 13 GB VRAM, just above this GPU's 12 GB. Offload may make it run, but it is not the dependable default for this launch machine. | Apache-2.0 and attractive for generation plus multi-reference editing, but defer until the still-image pipeline is stable or use remote compute. |
| Local image-to-video models | Poor first fit with 12 GB VRAM and 16 GB RAM. Frame count, VAE decode, and model offload multiply memory and time. | Build short motion from generated stills first. Use a paid partner node or cloud run only if a specific launch shot justifies the cost and its terms are approved. |

ComfyUI enables dynamic VRAM on Nvidia systems and supports model offload. Its [startup flag reference](https://docs.comfy.org/development/comfyui-server/startup-flags) also documents `--reserve-vram`, `--lowvram`, and disk-backed loading. Those controls can prevent an out-of-memory error, but they cannot turn 16 GB of RAM into a pleasant workstation for several large models at once. Keep batch size at 1, close GPU-heavy apps, avoid parallel ControlNets, and save high-resolution work for a tiled second pass.

## Commercial and rights rules

The license on a node repository covers that code. It does not automatically cover model weights, LoRAs, reference images, fonts, example inputs, or outputs from a hosted service. Record the exact source URL, version, license, and download date for every model used in a launch asset.

For this campaign:

- Prefer Apache-2.0 models such as FLUX.1 Schnell when the hardware can run them, or models whose first-party license explicitly allows the intended commercial use.
- Do not use FLUX.1 Dev for launch advertising. Comfy's official Flux guide describes it as limited to non-commercial use.
- The existing SD 1.5 checkpoint is published under the [CreativeML Open RAIL-M license](https://huggingface.co/runwayml/stable-diffusion-v1-5). That license places responsibility for generated output and restricted uses on the operator.
- Do not copy a community workflow's example image, prompt containing a creator or brand imitation, LoRA, checkpoint, or reference asset into Folio marketing merely because the JSON downloads successfully.
- Use fictional or owned recipes and food inputs. Do not derive marketing visuals from YouTube, TikTok, Instagram, publisher photography, creator likenesses, or distinctive recipe prose. This follows Folio's [content-rights review](launch/CONTENT_RIGHTS_2026-08.md).
- Keep real Folio UI captures intact. Generative editing can create convincing but nonexistent controls and text. That would conflict with the truthfulness standard in the App Store brief.

This is an operational reading of the cited licenses, not legal advice. A final asset register will make counsel review practical if Folio needs it later.

## A focused first production stack

Do not build a giant graph. Start with four small workflows and make each one reproducible:

1. **Owned food hero.** SDXL, or SD 1.5 for the prototype, generates a clean dish photograph with the same fictional recipe family used in the App Store campaign.
2. **Editorial background and outpaint.** A controlled image-to-image graph extends Paper Ivory, linen, botanical, and tabletop textures into the seven-slide canvas while reserving blank zones for the real UI.
3. **Mask and polish.** Impact Pack isolates food and repairs only selected regions. A tiled upscale creates the final background plate.
4. **Motion accent.** VideoHelperSuite combines a short sequence with a slow camera move, steam, or page-light change. The Folio mark and UI enter afterward as exact overlays.

For every approved output, save the workflow JSON, seed, model filename and hash, node versions, source-asset list, prompt, negative prompt, and final human edits. Put campaign workflows in a repository folder dedicated to marketing assets rather than ComfyUI's shared output directory. This turns the launch kit into a repeatable production process and makes later aspect ratios or localizations much cheaper.

## Decision before installation

The next step should be a single proof using the existing SD 1.5 checkpoint and Core nodes. Generate an owned food or paper background, load it behind one real Folio screenshot, and judge the result at App Store thumbnail size. If the composition works, install Impact Pack and move the final still pipeline to SDXL. Add ControlNet or IP-Adapter only if repeated scenes drift too much. Add VideoHelperSuite only after the still campaign has an approved visual direction.

That order is slower for one afternoon and faster for the launch. Each added pack earns its place against a visible Folio deliverable.
