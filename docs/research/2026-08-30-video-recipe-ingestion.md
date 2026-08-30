# Video recipe ingestion for launch

_Research date: 2026-08-30. This note uses first-party platform documentation, platform terms, source repositories, and their issue trackers. It is a technical and product recommendation, not legal advice._

## Decision

Nosh should not put Cobalt, yt-dlp, Instaloader, TikTok-Api, or an undocumented YouTube transcript client on the default ingestion path.

For launch, the dependable contract is narrower:

1. A user can import a video file that they own or have permission to use. Nosh should add this through the system file picker and private Storage, then process it through the existing `capture-recipe` pipeline.
2. A direct MP4, MOV, MPEG, or WebM URL can use the same path only when the user confirms they control the file or have permission to process it.
3. A TikTok, Instagram Reel, or YouTube URL should remain a source bookmark with attribution and an "Open original" action. Nosh should ask for an owned file, screenshots, an audio file, or pasted recipe text instead of downloading or scraping the post.
4. Official embeds can improve the fallback experience. They do not supply recipe evidence. TikTok oEmbed returns embed markup, title, author, and thumbnail metadata. TikTok's Display API returns user-authorized metadata and embed links. Neither API returns the media file, captions, or a transcript. [TikTok embeds](https://developers.tiktok.com/docs/en/embed-videos), [TikTok Display API overview](https://developers.tiktok.com/docs/en/display-api-overview), [Display API setup](https://developers.tiktok.com/docs/en/display-api-get-started)

This is less ambitious than "paste any Reel and get a recipe," but it is a promise Nosh can keep. Scraping arbitrary social posts would create a second operational product inside the cookbook app. It would also conflict with the launch content-rights position already recorded in `docs/launch/CONTENT_RIGHTS_2026-08.md`.

If Nosh later obtains platform approval and legal clearance for broader acquisition, the implementation should sit behind a replaceable service interface outside Supabase Edge Functions. It should never be embedded into `extract-recipe` or enabled by default merely because an open-source downloader can retrieve a URL today.

## What Nosh does now

The current adapter in `supabase/functions/_shared/videoRecipeEvidence.ts` has several good properties:

- It recognizes YouTube watch, share, Shorts, embed, and live URLs and reduces them to one canonical watch URL.
- It rejects TikTok, Instagram, Facebook, Pinterest, and other social HTML pages before the model call.
- It downloads a direct video only after public-URL and DNS checks, follows at most five redirects, accepts a small MIME allowlist, and stops at 20 MB.
- It records `video_source_unsupported`, `video_unavailable`, and `video_too_large` separately.
- It keeps provider selection behind `VIDEO_MODEL` and sends all accepted evidence through the canonical RecipeGraph decision.

The remaining weaknesses matter:

- The composer classifies TikTok and Instagram URLs as video input, even though the adapter always rejects them. That is acceptable only if the rejection is presented as a deliberate fallback, not as a broken advertised import.
- YouTube is treated as provider-readable evidence without a platform authorization check. The selected provider, not Nosh, tries to fetch the URL.
- The current prompt says that no separate transcript exists. It does not preserve narration, platform captions, creator caption text, and visible text as separate evidence tracks. That makes conflicts hard to diagnose.
- A 20 MB direct file becomes roughly 26.7 MB when base64 encoded, then exists alongside the source bytes, JSON body, and model response. Supabase Edge Functions have 256 MB of memory, 2 seconds of CPU time per request, a 150-second request idle timeout, and no support for multithreaded native media libraries such as Sharp. [Supabase Edge Function limits](https://supabase.com/docs/guides/functions/limits)
- OpenRouter accepts direct URLs and base64 video, but provider support differs. Its documentation says Gemini through AI Studio accepts YouTube URLs, Gemini through Vertex does not accept video URLs, and other providers must be checked individually. It lists MP4 as the supported format in the general video guide. The current adapter's MOV, MPEG, and WebM contract is therefore broader than the documented common denominator. [OpenRouter video inputs](https://openrouter.ai/docs/features/multimodal/videos)

There is also a policy contradiction. The runtime calls public YouTube links supported, while `docs/launch/CONTENT_RIGHTS_2026-08.md` says social-video extraction must be disabled before App Review unless Nosh has written authorization. The launch behavior should follow the stricter memo.

## Platform findings

### TikTok

TikTok has useful official APIs, but none is an arbitrary public-video recipe extraction API.

The public oEmbed endpoint converts a video URL into embed markup and returns basic information such as title, author, thumbnail, and provider. It is designed for attribution and playback through TikTok's embed. It does not return a media URL, captions, narration, or transcript. [TikTok embed documentation](https://developers.tiktok.com/docs/en/embed-videos)

The Display API requires a TikTok developer account, product approval, Login Kit, the `video.list` scope, and user authorization. It returns metadata for that authorized user's videos, including title, description, duration, cover image, share URL, and embed link. TikTok instructs clients to play the result in an embedded web view. The video object does not expose a media-file or transcript field. Cover URLs expire after six hours. [Display API setup](https://developers.tiktok.com/docs/en/display-api-get-started), [video query](https://developers.tiktok.com/docs/en/tiktok-api-v2-video-query), [video object](https://developers.tiktok.com/docs/en/tiktok-api-v2-video-object)

The Research API does not solve the product use case. It requires an approved research project and client credentials. It is for approved research access to public content data, not a commercial consumer cookbook importer. [Research API setup](https://developers.tiktok.com/docs/en/research-api-get-started)

TikTok's US terms prohibit automated scraping, crawling, exporting, or extraction without written approval. Its Developer Terms allow automated collection only as described by TikTok's developer documentation and let TikTok require application review. [TikTok US terms](https://www.tiktok.com/legal/page/us/terms-of-service/en), [TikTok Developer Terms](https://www.tiktok.com/legal/page/global/tik-tok-developer-terms-of-service/en)

Practical result: oEmbed is suitable for recognizing a link, showing its author, and sending the user back to TikTok. Display API may support a future "connect your TikTok creator account" feature. Neither authorizes Nosh to download arbitrary public recipe videos or gives Nosh their transcript.

### Instagram Reels

Meta's supported Instagram APIs focus on professional accounts. The Instagram Platform overview says app users need an Instagram professional account, meaning a business or creator account, and must grant the required permissions. The media reference says the API returns only media owned by Instagram professional accounts, not media owned by personal accounts. [Instagram Platform overview](https://developers.facebook.com/docs/instagram-platform/overview), [Instagram media reference](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/)

For authorized professional media, `media_url` can expose the video. It is not dependable for recipe Reels. Meta omits it when a video contains copyrighted or licensed audio, when it has a copyright violation, or for another user's Reel when the owner disables downloads. The field may be absent even when the app user owns the Reel if it contains licensed audio. The API has a `caption` field, but no narration transcript or timed-caption field. [Instagram media reference](https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/)

Meta oEmbed is a display feature. It requires App Review and business verification, and its stated allowed use is providing front-end views of public Facebook and Instagram content. It is not a media acquisition or transcription API. [Meta oEmbed Read](https://developers.facebook.com/docs/features-reference/oembed-read)

Practical result: there is no official path for importing an arbitrary consumer's Reel. A future creator-account connection could process the user's own professional media where `media_url` exists and the user grants permission. It still needs a fallback for licensed audio, personal accounts, and absent media URLs.

### YouTube and Shorts

The official Data API does not expose public transcript text. `captions.list` requires OAuth and returns caption-track metadata, not the captions. `captions.download` requires the caller to have permission to edit the video. It cannot download captions for an arbitrary public Short or video. [caption track list](https://developers.google.com/youtube/v3/docs/captions/list), [caption download](https://developers.google.com/youtube/v3/docs/captions/download)

YouTube's general terms allow viewing and official embedding. They prohibit automated access and downloading unless the service expressly permits it or YouTube and the relevant rights holder give prior written permission. The API developer policies separately prohibit downloading, importing, backing up, caching, or storing copies of audiovisual content without prior written approval. They also prohibit using non-YouTube technology to retrieve API data or any portion of audiovisual content. [YouTube Terms](https://www.youtube.com/t/terms), [YouTube API Developer Policies](https://developers.google.com/youtube/terms/developer-policies)

Practical result: Nosh can preserve and open the URL, or display the official player if that becomes useful. An owner-authorized integration may download captions for videos the user can edit. Arbitrary public transcript scraping is neither an official API capability nor a stable launch dependency.

## Open-source options

Repository activity dates below come from each repository's public commit feed and were checked on 2026-08-30. Activity is evidence of maintenance, not permission to use a platform's content.

| Project | Capability | Runtime and license | Maintenance and known failure modes | Nosh verdict |
| --- | --- | --- | --- | --- |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Broad site extractors, direct media, metadata, manual and automatic subtitles | Python 3.10 or newer. Unlicense. Full YouTube support now also needs a JavaScript runtime and `yt-dlp-ejs`; FFmpeg is strongly recommended for merging and post-processing. | Active on 2026-08-30. Its own README recommends nightly builds because stable releases often become stale when sites change. TikTok issues document login requirements, IP discrimination, JavaScript challenges, region differences, and fixes that first land in nightly. [README](https://github.com/yt-dlp/yt-dlp/blob/master/README.md), [TikTok login issue](https://github.com/yt-dlp/yt-dlp/issues/10124), [TikTok extraction regression](https://github.com/yt-dlp/yt-dlp/issues/15418) | Technically capable, but not an Edge dependency and not permitted by the cited platform terms for the default workflow. If ever approved, run a pinned build in an isolated container with per-domain fixtures and a kill switch. |
| [Cobalt](https://github.com/imputnet/cobalt) | Self-hosted downloader for TikTok, Instagram, YouTube, and other sites | Express service, Docker recommended, FFmpeg dependency. API code is AGPL-3.0. There is no public hosted API. | Last public commit observed 2026-04-06. Its API lists no TikTok metadata support and no Instagram metadata support, so it does not produce the transcript-first evidence Nosh needs. Open issues report zero-byte Instagram results and TikTok fetch failures. [API README](https://github.com/imputnet/cobalt/tree/main/api), [Instagram issue](https://github.com/imputnet/cobalt/issues/1509), [TikTok issue](https://github.com/imputnet/cobalt/issues/1505) | Do not enable. It adds media downloading, FFmpeg, AGPL obligations, and scraper upkeep without solving recipe extraction. If evaluated later, keep it in a separately licensed and deployed optional service. |
| [TikTok-Api](https://github.com/davidteather/TikTok-Api) | Unofficial TikTok web-data wrapper | Python 3.9 or newer, Playwright browser, MIT license. Uses an `ms_token`; the README discusses proxies. | Active on 2026-08-24. The README warns that TikTok changes its structures and documents `EmptyResponseException` when TikTok detects a bot. The project has no authenticated-user routes. [Repository](https://github.com/davidteather/TikTok-Api), [bot-detection issue](https://github.com/davidteather/TikTok-Api/issues/1242) | Poor fit. It needs a browser and anti-bot operations, violates the launch policy boundary, and offers no official permission. |
| [Instaloader](https://github.com/instaloader/instaloader) | Downloads Instagram posts, Reels, captions, stories, and metadata | Python, session cookies for logged-in content, MIT license | Active on 2026-07-26. The project calls itself independent and unofficial. It stores login session cookies and downloads media, but does not transcribe audio. [Repository](https://github.com/instaloader/instaloader) | Poor fit. It introduces account-cookie custody, scraping, and no transcript stage. |
| [youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api) | Fetches manual and automatic YouTube transcripts without a documented API key | Python, MIT license | Active on 2026-05-13. Its README explicitly says it uses an undocumented YouTube web-client API and may stop working. It reports that YouTube blocks most cloud-provider IPs and recommends rotating residential proxies. Cookie authentication for age-restricted videos is currently broken. [Repository and warnings](https://github.com/jdepoix/youtube-transcript-api) | Do not use in the launch path. The failure model is a bad match for Supabase hosting, and the official API does not authorize this public-transcript behavior. |
| [Whisper](https://github.com/openai/whisper) and [faster-whisper](https://github.com/SYSTRAN/faster-whisper) | Speech-to-text after Nosh lawfully receives a media file | Both MIT. Whisper needs Python, PyTorch, and FFmpeg. faster-whisper uses CTranslate2 and is intended for a native Python runtime. | Whisper was active on 2026-07-28. faster-whisper's last observed commit was 2025-11-19. Neither acquires social media. | Useful only after an owned upload or approved acquisition step. Keep transcription provider-neutral. A managed transcription provider fits the current Edge workflow better; self-hosting belongs in a container worker. |

## Recommended architecture

Keep `capture-recipe` as the only orchestrator, but deepen the video adapter into explicit stages:

```text
source URL or owned file
  -> source classifier
  -> rights and capability decision
  -> evidence acquisition adapter
  -> transcript track plus visible-text and frame evidence
  -> RecipeEvidenceDecision
  -> canonical RecipeGraph
```

The source classifier should return one of these results:

- `owned_upload`: upload privately, inspect the container, then use the video model and replaceable speech-to-text adapter.
- `controlled_direct_file`: fetch within the existing public-network and size bounds after a rights confirmation.
- `official_embed_only`: TikTok, Instagram, or YouTube URL. Save the source identity, show the original, and request another form of recipe evidence.
- `approved_platform_media`: reserved for a future, reviewed platform integration. It should name the authorization subject, granted scope, media owner, expiry, and allowed processing purpose.
- `unsupported`: explain what the user can do next.

For owned video, preserve separate evidence records rather than one opaque model call:

- source caption or user notes,
- speech transcript with timestamps and transcription version,
- visible on-screen text with timestamps or frame references,
- recipe extraction decision with conflicts and inferred fields.

The extractor can still use one multimodal model. Separate records make quantity conflicts and provider changes testable. For example, if narration corrects an earlier caption, the RecipeGraph provenance should point to the correction instead of silently selecting a number.

Define a narrow interface if broad acquisition is approved later:

```ts
type VideoAcquisitionResult =
  | { status: 'ready'; media: PrivateMediaReference; metadata: SourceMetadata; authorization: AuthorizationRecord }
  | { status: 'embed_only'; source: SourceMetadata }
  | { status: 'needs_user_file'; source: SourceMetadata; reasonCode: string }
  | { status: 'unavailable'; reasonCode: string };
```

The implementation can call an external worker without changing `capture-recipe`. That worker should run in a container with pinned dependencies, domain-specific smoke tests, rate limits, short retention, no long-lived user cookies, and one platform kill switch per extractor. Supabase Edge should hold the orchestration and durable state, not FFmpeg, Playwright, Python downloaders, or large video transformations.

## Launch and future scope

### Launch

- Change the public product promise from "paste any social video" to "bring an owned video file, recipe screenshots, audio, text, or a permitted recipe page."
- Keep TikTok and Instagram URL detection so the fallback can be specific. Do not present those links as a processing attempt.
- Disable provider-side YouTube reading unless Nosh obtains written platform authorization. Keep the URL and open it in YouTube.
- Add video file selection and private upload with a rights confirmation. Reuse the existing audio transcription boundary and multimodal RecipeGraph extractor.
- Keep Cobalt and yt-dlp out of the production dependency graph.
- Add owned fixtures for narration-only, text-only, conflicting caption and narration, no-recipe video, unreadable text, multiple recipes, and silent cooking footage. The release corpus should assert the evidence outcome and critical quantities.

### Future work

- TikTok Login Kit plus Display API for users who want to connect their own creator account. Use it first for selection, attribution, and embed playback. Do not assume it grants media processing.
- Instagram Login for professional accounts if creator demand justifies it. Treat `media_url` as optional and record whether the authorized account owns the Reel.
- YouTube OAuth for a creator's own channel. The official caption download endpoint can support videos that the user has permission to edit.
- An optional container acquisition service only after written platform authorization, a content-rights review, and evidence that official APIs cannot meet an approved use case.
- Periodic checks of platform terms and API fields. A source adapter should turn off cleanly without affecting text, image, URL, or audio captures.

The open-source downloaders are useful engineering references. They are not a launch shortcut. Nosh's advantage comes from dependable recipe understanding, so source acquisition should fail honestly before it creates unreliable or unauthorized evidence.

## Implemented outcome

The launch implementation follows this recommendation. `video-source-v2` adds one permissioned private-upload path, requires confirmation for direct video files, verifies actual MP4/MOV, MPEG, or WebM container signatures, classifies social links consistently across Composer and native Share, and preserves an Open original fallback without downloading platform media. Known platform CDN aliases and every redirect hop are rejected server-side, including links accidentally submitted through the ordinary URL path. Cobalt and yt-dlp remain outside the production dependency graph.
