# Limit video extraction to permissioned media

## Decision

Nosh processes a video only when the user confirms that they made it or have permission to use it. The Composer can select one MP4, MOV, MPEG, or WebM file, validate its size and real container signature below 20 MB, save it privately, and send it through the existing `capture-recipe` pipeline. A direct video-file URL uses the same permission requirement, signature check, and acquisition bounds.

YouTube, TikTok, Instagram, Facebook, and Pinterest links remain durable source bookmarks. They stop before media acquisition or model extraction, show deterministic guidance, and retain an Open original action. Nosh does not bundle Cobalt, yt-dlp, a browser scraper, user cookies, FFmpeg, or undocumented transcript clients.

## Why

The official consumer platform APIs support embeds, attribution, and some owner-authorized metadata, but they do not provide an approved arbitrary-public-video recipe extraction path. Open-source downloaders can retrieve many sources, but their platform compatibility, operational requirements, and authorization model do not meet the launch reliability or content-rights contract. Supabase Edge remains the capture orchestrator rather than becoming a media-downloader runtime.

The source classifier and evidence adapter remain replaceable. A future approved platform integration or separately deployed container worker can implement the same acquisition boundary without creating another RecipeGraph or page-generation pipeline.

## Consequences

- `video-source-v2` records the permission decision and distinguishes unsupported, permission-required, unavailable, and oversized sources.
- The server checks known platform and media-CDN aliases on every redirect and on the ordinary URL path, so stale clients cannot bypass bookmark-only handling.
- The selected video is stored in the private `recipe-captures` bucket and is not published as cookbook content.
- The multimodal reader remains replaceable through `VIDEO_MODEL`.
- Positive video release fixtures must be owned or explicitly permissioned and must enter through `capture-recipe`.
- Enabling any social acquisition adapter requires a fresh platform, content-rights, privacy, App Review, and operational review.
