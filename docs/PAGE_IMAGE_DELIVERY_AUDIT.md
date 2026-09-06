# Page image delivery: prelaunch audit

Date: 2026-09-06. Branch: `codex/prelaunch-audit`. Changes remain uncommitted.

## Evidence and verdict

The reported 24.8 GB uncached plus 19.6 GB cached egress is consistent with repeated large-object transfers, but this audit did not retrieve historical request logs or independently attribute those totals. CDN hits still transfer bytes to the client; improving the CDN hit ratio alone cannot deliver local reading.

A read-only production query found 35 cookbook-page objects totaling **130,868,635 bytes**, ranging from **2,562,063 to 4,837,360 bytes**. The separate capture bucket contained 12 objects totaling 5,245,772 bytes. These are current measurements, not the earlier 72 MB snapshot. `cookbook-pages` is private. All 35 selected versions have a storage path with the correct owner prefix.

The original uncommitted patch substantially improved URL stability and request scope, but was insufficient for dependable local reading. The new implementation removes the main repeat-download mechanisms. It is ready for release-binary device validation; unit tests and a web export cannot certify native filesystem, page-turn, and offline behavior on iOS.

## Findings and changes

| Area | Finding | Result |
| --- | --- | --- |
| Metadata reads | Eager signing had already been removed from book/page queries. Five-minute staleness and immutable version paths were sound. | Retained. Generation results also stop eager signing; local or signed URLs are stripped from persisted page metadata. |
| Disk-cache access | A signing request was required before `expo-image` could use cached bytes. Restarts/offline signing failures could produce blank pages. | Persistent files are checked before signing. Image queries can run offline and recheck file existence on mount. |
| Independent renderers | Skia page-turn textures and `expo-image` used different caches. | Both receive the same local file; concurrent image downloads are coalesced. |
| Export/share | PDF and image export downloaded originals separately; sharing exposed a short-lived URL. | Native actions reuse the local original. Native sharing shares the file using `expo-sharing`. Web sharing retains a remotely accessible link. |
| Grid loading | `Sortable.Grid` mounts the whole book. | Scroll-view grids mount image consumers only in the viewport. Layout/reordering remains sortable. |
| Thumbnail fallback | Fallback handled render errors only, not signing failures; remounts retried unsupported transformations. | Fallback is inside the resolver, reuses originals, and remembers unsupported transformation responses for the session. 429/5xx do not trigger larger downloads. |
| Failed originals | A load failure could leave an empty page indefinitely. | Loading feedback and explicit retry; only a failed decoded file is evicted. No automatic retry loop. |
| Account transitions | A late signing response could refill a cleared cache. | Auth revision fences signing, queries, and file publication; cleanup waits for writers before deleting the account's files. |
| Preview and compatibility paths | Candidate previews still consumed `imageUrl`; retired typesetter art lost lazy signing. | Candidates use the same image component; legacy art uses the local resolver. |
| Redesign | A local resolver cannot supply image references to the remote model. | A separate remote-reference function signs without downloading to the device. |
| Native persistence | Library cache directories can be evicted by the OS. | App-owned Documents files, excluded from iOS backup by a config plugin. Partial downloads are unpublished and crash leftovers are cleaned on first download. |
| Browser delivery | Three textures do not use `expo-image` native disk keys. | Cache Storage by immutable identity and shared blob URLs, independent of signed tokens. |

The earlier `6a77641ba` commit was compared for the delivery and typesetter changes. Its unrelated reader-position and capture-state work was not cherry-picked into this branch.

## Expected transfer behavior

| Operation | Image network behavior |
| --- | --- |
| Cold reader | Original for the active neighborhood, plus any immediately rendered adjacent leaves. Currently 2.6–4.8 MB per unique original in this project. |
| Reopen, page turn, title/order change, generation polling | Zero image GETs for locally present assets. Metadata queries may still run. |
| Cold grid | Only visible tiles; transformed 480×600 images if supported, otherwise one reusable original per requested page. |
| Grid after reading | Reuses the original already on disk. |
| Share/PDF after reading | Reads existing files; only missing originals download. PDF assembly still consumes local memory proportional to the exported book. |
| New generation/redesign | Downloads the new immutable version when its preview/reader is shown. Old versions stay unchanged. Remote provider reference reads remain legitimate separate server-side traffic. |
| New device, app removal, explicit local cleanup | A new initial download is expected. |

`getPageImageDeliveryStats()` in `utils/cookbook/localPageImages.ts` exposes process-local counts: local hits, coalesced requests, completed downloads, downloaded bytes, and thumbnail fallbacks. These are diagnostic counters, not billing telemetry: failed-transfer bytes and HTTP/CDN cache details are not included. No tokens or recipe contents are logged.

## Validation performed

- Final full Jest run: **160 suites, 759 tests passed**. The JSON report is `output/page-image-delivery-tests.json`. Native-mock/React `act` warnings and an open-handle teardown warning were emitted; there were no test failures. The completed test process required termination after reporting results. Focused image suites exit cleanly.
- Regression coverage includes eight concurrent consumers producing one download; warm reads after a session restart without signing; original reuse by grids; immutable version changes; unavailable thumbnail signing; rate limits; one credential renewal; account isolation; sign-out during a download; account purge; invalid/truncated HTTP responses; and rejecting empty local files.
- Final TypeScript, ESLint, and `git diff --check` passed.
- Production Expo web and iOS/Hermes JavaScript exports succeeded. The iOS export is a bundle check, not an Xcode build or device test. No Storage objects, database schema, Edge Functions, provider models, generation prompts, or production settings were changed.
- The iOS backup-exclusion plugin was checked against the installed Expo AppDelegate template for placement and idempotency. This Windows workspace cannot compile or run the iOS binary.

## Release acceptance on a rebuilt iPhone binary

Build with the current dependency lockfile and config plugins. An OTA update alone does not add `expo-image` to an older binary or install the backup exclusion. Use a request inspector filtered to the project's `/storage/v1/` endpoints, along with the local counters.

1. Open a populated cookbook. Observe the initial original downloads. Turn through a few pages, including curl animations and zoom. Confirm readable recipe text and no duplicate original transfer between static display and Skia.
2. Return to the shelf, reopen, switch reader/grid modes, reorder a page, and revisit the viewed pages. **Acceptance: no GET for an already stored rendition/original.** Reordering and metadata refresh must not change its asset identity.
3. Force-quit and reopen while the account session is restorable. Repeat in airplane mode with cached shelf/page metadata. **Acceptance: the viewed pages render without signing or GETs.** Also test an expired auth session: the existing global auth guard can still prevent offline entry; local image caching alone does not implement offline authentication.
4. Share an already read page and export a book whose originals are local. **Acceptance: no Storage image GETs; share/PDF files contain the actual page images.** Test a book with one missing local original: only that original should download.
5. Generate or redesign one page. **Acceptance: only its new version is fetched; existing page files stay warm.** Confirm both candidate preview surfaces, selection, and the resulting reader texture.
6. Verify cold thumbnails use the render endpoint and have materially fewer bytes than originals on the production plan. Repeat against an environment with transformations disabled. Interrupt a download and retry; inject 429/5xx. **Acceptance: no cached error body, no retry storm, no rate-limit fallback to originals.**
7. Sign out during a transfer, then switch accounts. **Acceptance: old bytes cannot publish into the new session, and the old account's local images are purged by account cleanup.** Check the `folio-page-images-v1` directory's iOS backup exclusion.

## Remaining optimization priorities

1. **Cold-byte size:** store immutable WebP thumbnail objects during generation, then backfill existing originals once. Add a separate reader rendition only after text/zoom comparison at actual device sizes. Preserve original PNGs for export and canonical reference. This removes the transformation-plan dependency and can reduce first-view bytes; neither was silently enabled here without visual validation.
2. **Offline application entry:** define a read-only locally restored account state if cold-start reading must work after token expiry without connectivity. Server access must continue to require valid authentication. This is separate from the now-local image resolution path.
3. **Local storage management:** provide a user-controlled clear-downloads action and collect unreferenced versions with authoritative ownership/reference checks. Viewed bytes currently remain until account cleanup or app removal; deleting a remote page does not instantly remove its local copy. Avoid a short TTL or silent LRU eviction that recreates repeat-download behavior.
4. **Large PDF memory:** native export embeds full original images as base64 in HTML. Very large books need a streaming/file-backed export implementation; local reuse fixes egress but does not remove that memory cost.
5. **Browser limits:** Cache Storage may be evicted by the browser or unavailable in restricted modes. Session blob reuse still works. The browser's decoded texture memory has different constraints from native; the App Store target remains the rebuilt iOS app.

## References

- [Supabase Smart CDN](https://supabase.com/docs/guides/storage/cdn/smart-cdn): each distinct signed token has its own cache entry; CDN hits still deliver an object to the client.
- [Supabase transformations](https://supabase.com/docs/guides/storage/serving/image-transformations): plan/enablement requirements, signed transforms, and WebP negotiation.
- [Expo SDK 54 image](https://docs.expo.dev/versions/v54.0.0/sdk/image/): stable cache keys and platform-specific image caching.
- [Expo SDK 54 filesystem](https://docs.expo.dev/versions/v54.0.0/sdk/filesystem-legacy/): persistent Documents versus evictable cache directories, cancellable downloads, and file operations.
