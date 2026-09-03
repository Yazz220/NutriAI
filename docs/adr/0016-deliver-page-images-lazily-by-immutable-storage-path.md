# ADR 0016: Deliver Page Images Lazily By Immutable Storage Path

Status: Accepted

Date: 2026-09-03

## Context

Generated cookbook pages are multi-megabyte private images. Page-list reads previously signed every selected image, and each poll or refetch returned a different URL. React Native and the browser therefore treated unchanged objects as new resources. The capture feed compounded this by fetching every historical placed page on every processing heartbeat. The web reader also passed every page URL to Three.js `TextureLoader`, which eagerly downloaded an entire cookbook even when only one spread was visible.

This made normal navigation, generation polling, reordering, and single-page changes consume storage egress in proportion to the whole library rather than the visible work.

## Decision

- Keep `page_versions.storage_path` as the canonical image identity. Page and cookbook queries return metadata and storage paths without minting signed URLs.
- Resolve private URLs only at a delivery boundary: a visible image, the reader's active neighborhood, share/export, or an explicit regeneration reference.
- Cache signed URLs in memory through their useful lifetime and coalesce concurrent signing requests.
- Render through `expo-image` with memory-and-disk caching. Use a stable cache key derived from the delivery variant and immutable storage path, never the signed token. Development binaries built before `expo-image` was added fall back to React Native's cached image implementation so an over-the-air JavaScript update cannot crash at startup; newly built binaries use `expo-image` automatically.
- Use a 480 × 600 Supabase image transformation for overview thumbnails. Fall back to the original on projects whose plan does not support transformations.
- Give the full-resolution reader a radius-two prefetch window. Do not expose URLs for the rest of the book to eager native or web texture loaders.
- Reconcile capture pages only when publication state changes. Keep reorder, move, removal, generation, and selection updates surgical in React Query instead of invalidating whole page lists.
- Resolve every full-resolution page for cookbook PDF export only after the user explicitly requests the export.

## Consequences

Opening or polling the Composer no longer downloads historic page images. Reopening an unchanged image on the same device normally hits the disk cache even if its signed URL has changed. Overview traffic uses much smaller assets when image transformations are available, and reader traffic is bounded by the visible neighborhood rather than cookbook size.

Supabase image transformations must be enabled by the production plan for the thumbnail byte savings. Free development projects still get the major signed-URL, polling, reader-window, and disk-cache reductions, but their first overview visit may download original assets. A future dedicated thumbnail object can replace the transform without changing UI consumers because the variant is already behind the delivery boundary.
