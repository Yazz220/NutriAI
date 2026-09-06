# ADR 0016: Deliver Page Images Lazily By Immutable Storage Path

Status: Accepted

Date: 2026-09-03

Amended: 2026-09-06 following the prelaunch egress audit.

## Context

Generated cookbook pages are multi-megabyte private images. Page-list reads previously signed every selected image, and each poll or refetch returned a different URL. React Native and the browser therefore treated unchanged objects as new resources. The web reader could also expose every page URL to an eager texture loader even when only one spread was visible.

This made normal navigation, generation polling, reordering, and single-page changes consume storage egress in proportion to the whole library rather than the visible work.

## Decision

- Keep `page_versions.storage_path` as the canonical image identity. Page and cookbook queries return metadata and storage paths without minting signed URLs.
- Resolve private URLs only at a delivery boundary: a visible image, the reader's active neighborhood, share/export, or an explicit regeneration reference.
- Cache signed URLs in memory through their useful lifetime and coalesce concurrent signing requests.
- Resolve stored images through `localPageImages.ts`. Check a persistent, project- and account-scoped file before signing or downloading. Coalesce the download itself across the reader, `expo-image`, Skia page turns, generation previews, sharing, and PDF export. Native files live in Documents under `folio-page-images-v1`; the iOS config plugin excludes that directory from backup. The browser uses Cache Storage and shared blob URLs, with session reuse if persistent browser storage is unavailable.
- Render local files through `expo-image` with memory caching and stable rendition/path keys. The app owns disk persistence, so a second image-library disk cache is unnecessary. Older development binaries fall back to React Native images using the same local URI.
- Use a 480 x 600 Supabase image transformation for cold overview thumbnails, requesting WebP support explicitly. Reuse an existing or pending local original instead of downloading another rendition. Fall back on unavailable/unsupported transformation responses, including signing failures. Remember that capability failure for the session. Do not fall back to large originals on rate limits or provider outages.
- Mount grid images only when tiles enter the scroll viewport. The sortable grid itself is not virtualized.
- Give the full-resolution reader a radius-two prefetch window. Do not expose URLs for the rest of the book to eager native or web texture loaders.
- Resolve every full-resolution page for cookbook PDF export only after the user explicitly requests the export.
- Keep remote provider references separate from local delivery. Redesign signs the original remotely; a device file or blob URL must never enter a generation request.
- Downloads publish via a temporary file and rename after HTTP, content-type, and length checks. Failed transfers do not poison the local cache. A rejected credential gets one renewal; other failures show an explicit retry. Account changes fence late signing responses and file writers; account cleanup removes the user's images. Metadata changes do not evict image files.

## Consequences

After account restoration, reopening a locally stored page requires neither a signing request nor a Storage GET, including offline. Cached original bytes are shared across reading, animation, grids, and export. URLs and device file paths are stripped from persisted page metadata when a durable Storage path exists. New immutable versions download separately; title changes, ordering, polling, and query invalidation reuse existing files.

Supabase image transformations require a paid plan and must be enabled. Without them, the first visible-grid visit may download originals, which are then available for reading. Originals retain full recipe-text quality. Dedicated pre-generated WebP thumbnails and a visually validated reader rendition remain the next cold-download optimization; they can replace transforms behind the same delivery boundary.

Local files are retained until explicit cleanup (sign-out/account deletion), repair of a failed image, or app removal. They are not silently evicted by age or metadata refresh. Deleted or superseded versions can occupy local space until cleanup; a user-controlled download manager and safe orphan collection are future storage-management work. Browser persistence remains subject to browser quota/eviction rules. The app's existing authentication guard still controls entry into the shelf; this decision does not introduce offline authentication.

See `docs/PAGE_IMAGE_DELIVERY_AUDIT.md` for evidence, release checks, and remaining limits.
